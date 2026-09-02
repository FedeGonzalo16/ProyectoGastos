import type { Category, CategoryBudget, Expense } from "@/lib/types";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";

export interface BudgetProgress {
  category: Category;
  colorIndex: number;
  spent: number;
  budget: number;
  /** 0-100, ya recortado (nunca pasa de 100, para que la barra no se desborde). */
  percentage: number;
  isOverBudget: boolean;
}

/**
 * Compara lo gastado este mes en cada categoría contra su presupuesto (si
 * tiene uno definido). Las categorías sin presupuesto no aparecen — no hay
 * nada que mostrar de ellas acá.
 */
export function buildBudgetProgress(
  budgets: CategoryBudget[],
  expensesThisMonth: Expense[],
  expenseCategories: Category[]
): BudgetProgress[] {
  const colorIndexById = buildColorIndexById(expenseCategories);
  const categoryById = new Map(expenseCategories.map((category) => [category.id, category]));

  const spentByCategory = new Map<string, number>();
  for (const expense of expensesThisMonth) {
    if (!expense.category_id) continue;
    spentByCategory.set(expense.category_id, (spentByCategory.get(expense.category_id) ?? 0) + expense.amount);
  }

  return budgets
    .map((budget) => {
      // budget.category_id === null es el tope total del mes, no una
      // categoría — lo maneja `buildTotalBudgetProgress`, acá se ignora.
      if (!budget.category_id) return null;
      const category = categoryById.get(budget.category_id);
      if (!category) return null;

      const spent = spentByCategory.get(budget.category_id) ?? 0;
      return {
        category,
        colorIndex: colorIndexById.get(budget.category_id) ?? 0,
        spent,
        budget: budget.monthly_amount,
        percentage: Math.min(100, (spent / budget.monthly_amount) * 100),
        isOverBudget: spent > budget.monthly_amount,
      };
    })
    .filter((entry): entry is BudgetProgress => entry !== null)
    .sort((a, b) => b.percentage - a.percentage);
}

export interface TotalBudgetProgress {
  spent: number;
  budget: number;
  percentage: number;
  isOverBudget: boolean;
}

/**
 * El tope total de gastos del mes (no por categoría) — la fila de
 * `category_budgets` con `category_id: null`. Compara contra la suma de
 * TODOS los gastos del mes, sin importar su categoría.
 */
export function buildTotalBudgetProgress(
  budgets: CategoryBudget[],
  expensesThisMonth: Expense[]
): TotalBudgetProgress | null {
  const totalBudget = budgets.find((budget) => budget.category_id === null);
  if (!totalBudget) return null;

  const spent = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    spent,
    budget: totalBudget.monthly_amount,
    percentage: Math.min(100, (spent / totalBudget.monthly_amount) * 100),
    isOverBudget: spent > totalBudget.monthly_amount,
  };
}
