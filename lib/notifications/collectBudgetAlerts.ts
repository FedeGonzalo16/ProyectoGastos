import type { Category, CategoryBudget, Expense } from "@/lib/types";
import { buildBudgetProgress, buildTotalBudgetProgress } from "@/lib/aggregations/budgetProgress";
import { CLOSE_TO_BUDGET_PERCENTAGE } from "@/lib/aggregations/insights";
import { formatArs } from "@/lib/format";

export type BudgetAlertKind = "budget_category" | "budget_total";

export interface BudgetAlertCandidate {
  userId: string;
  kind: BudgetAlertKind;
  /** Id de la categoría, o "total" para el tope general del mes. */
  entityId: string;
  /** "YYYY-MM" — el mismo presupuesto vuelve a avisar si se repite el mes que viene. */
  period: string;
  title: string;
  body: string;
}

/**
 * Para UN usuario, arma los candidatos a avisar por presupuesto: el total del
 * mes y/o cualquier categoría que ya se haya pasado del tope o esté al 85%+
 * — mismo umbral que ya usa el insight del dashboard (`insights.ts`), para
 * que la notificación diga lo mismo que el usuario vería si abriera la app.
 */
export function collectBudgetAlerts(
  userId: string,
  budgets: CategoryBudget[],
  expensesThisMonth: Expense[],
  categories: Category[],
  period: string
): BudgetAlertCandidate[] {
  const candidates: BudgetAlertCandidate[] = [];

  const total = buildTotalBudgetProgress(budgets, expensesThisMonth);
  if (total && (total.isOverBudget || total.percentage >= CLOSE_TO_BUDGET_PERCENTAGE)) {
    candidates.push({
      userId,
      kind: "budget_total",
      entityId: "total",
      period,
      title: total.isOverBudget ? "Te pasaste del presupuesto" : "Presupuesto casi al tope",
      body: budgetMessage("el total del mes", total.spent, total.budget, total.isOverBudget),
    });
  }

  for (const progress of buildBudgetProgress(budgets, expensesThisMonth, categories)) {
    if (!progress.isOverBudget && progress.percentage < CLOSE_TO_BUDGET_PERCENTAGE) continue;
    candidates.push({
      userId,
      kind: "budget_category",
      entityId: progress.category.id,
      period,
      title: progress.isOverBudget ? "Te pasaste del presupuesto" : "Presupuesto casi al tope",
      body: budgetMessage(progress.category.name, progress.spent, progress.budget, progress.isOverBudget),
    });
  }

  return candidates;
}

function budgetMessage(label: string, spent: number, budget: number, isOverBudget: boolean): string {
  return isOverBudget
    ? `Ya te pasaste del tope de ${label}: gastaste ${formatArs(spent)} de ${formatArs(budget)}.`
    : `Estás cerca del tope de ${label}: ${formatArs(spent)} de ${formatArs(budget)}.`;
}
