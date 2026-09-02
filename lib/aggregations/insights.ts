import type { BudgetProgress, TotalBudgetProgress } from "@/lib/aggregations/budgetProgress";
import type { CategoryAmount } from "@/lib/aggregations/monthlySummary";
import { formatArs, formatUsd } from "@/lib/format";

/**
 * "Insights" del Dashboard: datos destacados del mes, calculados a partir de
 * lo que ya está cargado en otras pantallas (presupuestos, inversiones,
 * gastos por categoría) — no agregan nada nuevo a la base, solo miran los
 * mismos números desde otro ángulo para que salten a la vista sin tener que
 * ir a buscarlos.
 */

export type InsightTone = "warning" | "positive" | "neutral";

export interface Insight {
  id: string;
  message: string;
  tone: InsightTone;
}

const MAX_INSIGHTS = 2;
// Exportado: lo reusa lib/notifications/collectBudgetAlerts.ts, mismo criterio
// de "cerca del tope" para las notificaciones que para este insight.
export const CLOSE_TO_BUDGET_PERCENTAGE = 85;
const CATEGORY_INCREASE_PERCENTAGE = 15;
const BALANCE_CHANGE_PERCENTAGE = 10;
// Evita porcentajes exagerados al comparar contra una categoría que el mes
// pasado casi no tuvo gasto (ej. pasar de $50 a $500 "es" +900%, pero no dice nada útil).
const MIN_COMPARISON_BASE_ARS = 1000;

/** El presupuesto (por categoría o el total del mes) que esté peor: pasado de tope, o el que más cerca esté. */
function buildBudgetInsight(
  categoryBudgets: BudgetProgress[],
  totalBudget: TotalBudgetProgress | null
): Insight | null {
  const candidates = [
    ...(totalBudget ? [{ label: "el total del mes", ...totalBudget }] : []),
    ...categoryBudgets.map((budget) => ({
      label: budget.category.name,
      percentage: budget.percentage,
      spent: budget.spent,
      budget: budget.budget,
      isOverBudget: budget.isOverBudget,
    })),
  ];
  if (candidates.length === 0) return null;

  // Los que ya se pasaron van primero; entre esos (o entre los que no se
  // pasaron), gana el que tiene mayor porcentaje usado.
  const worst = [...candidates].sort((a, b) => {
    if (a.isOverBudget !== b.isOverBudget) return a.isOverBudget ? -1 : 1;
    return b.percentage - a.percentage;
  })[0];

  if (worst.isOverBudget) {
    return {
      id: "budget",
      tone: "warning",
      message: `Ya te pasaste del tope de ${worst.label}: gastaste ${formatArs(worst.spent)} de ${formatArs(worst.budget)}.`,
    };
  }
  if (worst.percentage >= CLOSE_TO_BUDGET_PERCENTAGE) {
    return {
      id: "budget",
      tone: "warning",
      message: `Estás cerca del tope de ${worst.label}: ya usaste el ${Math.round(worst.percentage)}%.`,
    };
  }
  return null;
}

/** Si hay un mínimo mensual de inversión definido y todavía no se llegó. */
function buildInvestmentGoalInsight(monthlyTargetUsd: number | null, contributedUsd: number): Insight | null {
  if (monthlyTargetUsd === null || monthlyTargetUsd <= 0) return null;
  if (contributedUsd >= monthlyTargetUsd) return null; // ya se cumplió, no hace falta avisar

  return {
    id: "investment-goal",
    tone: "warning",
    message: `Todavía no llegaste a tu mínimo de inversión de este mes: aportaste ${formatUsd(contributedUsd)} de ${formatUsd(monthlyTargetUsd)}.`,
  };
}

/** La categoría de gasto que más subió respecto al mes pasado (si alguna subió lo suficiente como para avisar). */
function buildCategorySpendInsight(thisMonth: CategoryAmount[], lastMonth: CategoryAmount[]): Insight | null {
  const lastMonthByCategory = new Map(lastMonth.map((item) => [item.categoryId, item.value]));

  interface CategoryIncrease {
    label: string;
    value: number;
    previous: number;
    percentage: number;
  }

  const increases = thisMonth
    .filter((item) => item.categoryId !== null)
    .map((item): CategoryIncrease | null => {
      const previous = lastMonthByCategory.get(item.categoryId) ?? 0;
      if (previous < MIN_COMPARISON_BASE_ARS) return null;
      return { label: item.label, value: item.value, previous, percentage: ((item.value - previous) / previous) * 100 };
    })
    .filter((entry): entry is CategoryIncrease => entry !== null)
    .filter((entry) => entry.percentage >= CATEGORY_INCREASE_PERCENTAGE)
    .sort((a, b) => b.percentage - a.percentage);

  const top = increases[0];
  if (!top) return null;

  return {
    id: "category-increase",
    tone: "warning",
    message: `Gastaste ${Math.round(top.percentage)}% más en ${top.label} que el mes pasado (${formatArs(top.value)} vs. ${formatArs(top.previous)}).`,
  };
}

/** Cómo viene el balance del mes comparado con el anterior, si el cambio es lo bastante grande como para destacarlo. */
function buildBalanceInsight(balanceThisMonth: number, balanceLastMonth: number): Insight | null {
  if (balanceLastMonth === 0) return null;

  const percentage = ((balanceThisMonth - balanceLastMonth) / Math.abs(balanceLastMonth)) * 100;
  if (Math.abs(percentage) < BALANCE_CHANGE_PERCENTAGE) return null;

  const isBetter = balanceThisMonth > balanceLastMonth;
  return {
    id: "balance",
    tone: isBetter ? "positive" : "warning",
    message: `Tu balance este mes es ${Math.round(Math.abs(percentage))}% ${isBetter ? "mejor" : "peor"} que el mes pasado.`,
  };
}

/** La categoría en la que más se gastó este mes — el único que no necesita comparar contra otro mes, sirve desde el primer mes de uso. */
function buildTopCategoryInsight(thisMonth: CategoryAmount[], totalExpensesThisMonth: number): Insight | null {
  const top = thisMonth[0]; // groupByCategory ya lo devuelve ordenado de mayor a menor
  if (!top || totalExpensesThisMonth <= 0) return null;

  const percentage = (top.value / totalExpensesThisMonth) * 100;
  return {
    id: "top-category",
    tone: "neutral",
    message: `Tu mayor gasto este mes fue en ${top.label}: ${formatArs(top.value)} (${Math.round(percentage)}% del total).`,
  };
}

export interface BuildInsightsInput {
  budgetProgress: BudgetProgress[];
  totalBudgetProgress: TotalBudgetProgress | null;
  investmentMonthlyTargetUsd: number | null;
  investmentContributedUsd: number;
  expensesByCategoryThisMonth: CategoryAmount[];
  expensesByCategoryLastMonth: CategoryAmount[];
  balanceThisMonth: number;
  balanceLastMonth: number;
  totalExpensesThisMonth: number;
}

/**
 * Arma la lista final de insights a mostrar, en orden de prioridad — lo más
 * accionable primero (presupuestos pasados o cerca del límite, la meta de
 * inversión), después comparaciones interesantes — y se queda con los
 * primeros `MAX_INSIGHTS`, para no abrumar mostrando muchos a la vez.
 */
export function buildInsights(input: BuildInsightsInput): Insight[] {
  const candidates = [
    buildBudgetInsight(input.budgetProgress, input.totalBudgetProgress),
    buildInvestmentGoalInsight(input.investmentMonthlyTargetUsd, input.investmentContributedUsd),
    buildCategorySpendInsight(input.expensesByCategoryThisMonth, input.expensesByCategoryLastMonth),
    buildBalanceInsight(input.balanceThisMonth, input.balanceLastMonth),
    buildTopCategoryInsight(input.expensesByCategoryThisMonth, input.totalExpensesThisMonth),
  ];

  return candidates.filter((insight): insight is Insight => insight !== null).slice(0, MAX_INSIGHTS);
}
