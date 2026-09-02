import { NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { planFixedExpenseGeneration } from "@/lib/repository/generateFixedExpenses";
import { collectBudgetAlerts, type BudgetAlertCandidate } from "@/lib/notifications/collectBudgetAlerts";
import { collectDueReminders, type DueReminderCandidate } from "@/lib/notifications/collectDueReminders";
import {
  collectInvestmentGoalAlerts,
  type InvestmentGoalAlertCandidate,
} from "@/lib/notifications/collectInvestmentGoalAlerts";
import { filterByMonth, sumAmounts } from "@/lib/aggregations/monthlySummary";
import { investmentContributionAmounts } from "@/lib/aggregations/investmentSummary";
import { currentYearMonth, isDateInMonth, yearMonthToMonthInput } from "@/lib/dateRange";
import { daysAgoAsDateInput, todayAsDateInput } from "@/lib/format";
import type { Category, CategoryBudget, Expense, FixedExpense, Investment, InvestmentGoal } from "@/lib/types";

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

// No hace falta escanear vencimientos de hace años — acota el tamaño de la consulta.
const DUE_DATE_LOOKBACK_DAYS = 90;

/**
 * Chequeo diario disparado por un cron externo (ver `vercel.json`): genera
 * los gastos fijos del mes de quien todavía no abrió la app, junta los
 * candidatos a notificar (vencimientos + presupuesto) de TODOS los usuarios,
 * y le manda a cada uno lo que le corresponda — sin repetir lo que ya se
 * avisó antes (`notification_log`).
 *
 * Es el único lugar del proyecto que usa el cliente admin (bypassea RLS): no
 * hay una sesión de usuario acá, así que es la única forma de leer/escribir
 * across-user.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const yearMonth = currentYearMonth();
  const period = yearMonthToMonthInput(yearMonth);
  const today = todayAsDateInput();
  // Cuántas llamadas a Supabase fallaron — se devuelve en la respuesta para
  // que un chequeo manual (o el log de Vercel) lo note. Sin esto, una tabla
  // faltante o un RLS mal configurado hace que todo se lea como "vacío" sin
  // dejar ningún rastro (ya nos pasó una vez con las columnas de investments).
  let dbErrors = 0;

  /** Loggea (y cuenta) un error de Supabase sin cortar la corrida — mejor avisar a medias que no avisar nada por un solo request fallido. */
  function logDbError(label: string, error: { message: string } | null): void {
    if (!error) return;
    dbErrors++;
    console.error(`[notifications/check] ${label}:`, error.message);
  }

  // 1. Generar los gastos fijos del mes para las cuentas que no abrieron la
  // app este mes (si no, nunca verían un recordatorio de su alquiler). Se
  // van agregando a `expenses` en memoria para no tener que releer todo de
  // nuevo antes de calcular presupuestos más abajo.
  const [{ data: templatesRaw, error: templatesError }, { data: expensesRaw, error: expensesError }] = await Promise.all([
    supabase.from("fixed_expenses").select("*"),
    supabase.from("expenses").select("*"),
  ]);
  logDbError("select fixed_expenses", templatesError);
  logDbError("select expenses", expensesError);
  const templates = (templatesRaw ?? []) as FixedExpense[];
  let expenses = (expensesRaw ?? []) as Expense[];

  for (const [userId, userTemplates] of groupBy(templates, (template) => template.user_id)) {
    const userExpenses = expenses.filter((expense) => expense.user_id === userId);
    const plans = planFixedExpenseGeneration(userTemplates, userExpenses, yearMonth);
    if (plans.length === 0) continue;

    const { data: inserted, error: insertError } = await supabase
      .from("expenses")
      .insert(plans.map((plan) => ({ ...plan, user_id: userId })))
      .select("*");
    logDbError(`insert expenses (user ${userId})`, insertError);
    expenses = expenses.concat((inserted ?? []) as Expense[]);
  }

  // 2. Candidatos a notificar hoy.
  const dueDateFloor = daysAgoAsDateInput(DUE_DATE_LOOKBACK_DAYS);
  const expensesWithRecentDueDate = expenses.filter((expense) => expense.due_date && expense.due_date >= dueDateFloor);
  const dueCandidates = collectDueReminders(expensesWithRecentDueDate, today);

  const [{ data: budgetsRaw, error: budgetsError }, { data: categoriesRaw, error: categoriesError }] = await Promise.all([
    supabase.from("category_budgets").select("*"),
    supabase.from("categories").select("*"),
  ]);
  logDbError("select category_budgets", budgetsError);
  logDbError("select categories", categoriesError);
  const budgetsByUser = groupBy((budgetsRaw ?? []) as CategoryBudget[], (budget) => budget.user_id);
  const categoriesByUser = groupBy((categoriesRaw ?? []) as Category[], (category) => category.user_id);
  const expensesByUser = groupBy(expenses, (expense) => expense.user_id);

  const budgetCandidates: BudgetAlertCandidate[] = [];
  for (const [userId, userBudgets] of budgetsByUser) {
    const expensesThisMonth = (expensesByUser.get(userId) ?? []).filter((expense) => isDateInMonth(expense.date, yearMonth));
    budgetCandidates.push(
      ...collectBudgetAlerts(userId, userBudgets, expensesThisMonth, categoriesByUser.get(userId) ?? [], period)
    );
  }

  // Meta de inversión: solo avisa cuando SE CUMPLIÓ (a diferencia del
  // insight del dashboard, que avisa mientras todavía falta) — ver el
  // comentario en collectInvestmentGoalAlerts.ts.
  const [{ data: goalsRaw, error: goalsError }, { data: investmentsRaw, error: investmentsError }] = await Promise.all([
    supabase.from("investment_goals").select("*"),
    supabase.from("investments").select("*"),
  ]);
  logDbError("select investment_goals", goalsError);
  logDbError("select investments", investmentsError);
  const goalsByUser = groupBy((goalsRaw ?? []) as InvestmentGoal[], (goal) => goal.user_id);
  const investmentsByUser = groupBy((investmentsRaw ?? []) as Investment[], (investment) => investment.user_id);

  const investmentGoalCandidates: InvestmentGoalAlertCandidate[] = [];
  for (const [userId, userGoals] of goalsByUser) {
    const goal = userGoals[0] ?? null; // a lo sumo una meta por usuario
    const contributions = investmentContributionAmounts(investmentsByUser.get(userId) ?? []);
    const contributedUsd = sumAmounts(filterByMonth(contributions, yearMonth));
    investmentGoalCandidates.push(
      ...collectInvestmentGoalAlerts(userId, goal?.monthly_contribution_usd ?? null, contributedUsd, period)
    );
  }

  const candidates: (DueReminderCandidate | BudgetAlertCandidate | InvestmentGoalAlertCandidate)[] = [
    ...dueCandidates,
    ...budgetCandidates,
    ...investmentGoalCandidates,
  ];

  // Se traen todas las suscripciones UNA sola vez (no una consulta por cada
  // aviso) — un usuario con varios avisos hoy (ej. 2 vencimientos + 1
  // presupuesto) antes disparaba la misma consulta 3 veces.
  const { data: subscriptionsRaw, error: subscriptionsError } = await supabase.from("push_subscriptions").select("*");
  logDbError("select push_subscriptions", subscriptionsError);
  const subscriptionsByUser = groupBy(
    (subscriptionsRaw ?? []) as PushSubscriptionRow[],
    (subscription) => subscription.user_id
  );

  // 3. Mandar lo que no se haya avisado todavía.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:notificaciones@localhost",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  let sent = 0;
  let alreadyNotified = 0;
  let noSubscription = 0;

  // Código de Postgres para "violó una restricción unique" — es la ÚNICA
  // razón por la que el insert de abajo debería fallar en uso normal (ya
  // existe esa fila = ya se avisó). Cualquier otro código es un error de
  // verdad (tabla/columna faltante, RLS, conexión, etc.) y no debe
  // confundirse con "ya avisado" — si no, un bug real quedaría escondido
  // detrás de un contador que parece perfectamente normal.
  const UNIQUE_VIOLATION = "23505";

  for (const candidate of candidates) {
    // Si todavía no tiene ningún dispositivo suscripto, no hay a quién
    // mandarle nada — y tampoco se registra en notification_log: si se
    // registrara igual, el día que active las notificaciones ya se
    // encontraría este aviso "quemado" (bloqueado por la clave única) y
    // nunca le llegaría. Mejor reintentar mañana hasta que sí haya alguien
    // escuchando.
    const subscriptions = subscriptionsByUser.get(candidate.userId);
    if (!subscriptions || subscriptions.length === 0) {
      noSubscription++;
      continue;
    }

    // La clave única (user_id, kind, entity_id, period) rechaza el insert si
    // ya se había avisado esto mismo antes — así nunca se manda dos veces.
    const { error: logError } = await supabase.from("notification_log").insert({
      user_id: candidate.userId,
      kind: candidate.kind,
      entity_id: candidate.entityId,
      period: candidate.period,
    });
    if (logError) {
      if (logError.code === UNIQUE_VIOLATION) {
        alreadyNotified++;
      } else {
        logDbError(`insert notification_log (user ${candidate.userId}, ${candidate.kind})`, logError);
      }
      continue;
    }

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
          JSON.stringify({ title: candidate.title, body: candidate.body })
        );
        sent++;
      } catch (error) {
        // 404/410 = el navegador invalidó esta suscripción (desinstaló la
        // PWA, revocó el permiso, etc.) — se borra para no reintentar en vano.
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          dbErrors++;
          console.error(`[notifications/check] sendNotification (user ${candidate.userId}):`, error);
        }
      }
    }
  }

  return NextResponse.json({ candidates: candidates.length, sent, alreadyNotified, noSubscription, dbErrors });
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}
