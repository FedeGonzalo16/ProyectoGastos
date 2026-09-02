import type { Repository } from "@/lib/repository/types";
import type { Category, CategoryBudget, Expense, Income } from "@/lib/types";

export type CategoryDeletionMode = "keep-on-existing" | "clear-existing";

interface CategoryRepositories {
  categories: Repository<Category>;
  expenses: Repository<Expense>;
  incomes: Repository<Income>;
  categoryBudgets: Repository<CategoryBudget>;
}

/**
 * "Borra" una categoría sin borrar nunca la fila (`active: false`) — así los
 * gastos/ingresos que ya la tenían siguen resolviendo su nombre y color
 * después, si el usuario elige mantenerla en lo ya cargado (los gastos fijos
 * no categorizan, así que no hay nada que actualizar ahí). En cualquiera de
 * los dos modos, deja de poder elegirse para algo nuevo (los pickers filtran
 * por `active`).
 *
 * - "keep-on-existing": los registros que ya la tenían la conservan tal cual.
 * - "clear-existing": esos registros pasan a quedar sin categoría.
 */
export function deactivateCategory(
  categoryId: string,
  mode: CategoryDeletionMode,
  { categories, expenses, incomes, categoryBudgets }: CategoryRepositories
): void {
  if (mode === "clear-existing") {
    expenses.list()
      .filter((expense) => expense.category_id === categoryId)
      .forEach((expense) => expenses.update(expense.id, { category_id: null }));

    incomes.list()
      .filter((income) => income.category_id === categoryId)
      .forEach((income) => incomes.update(income.id, { category_id: null }));
  }

  // El presupuesto de esta categoría deja de tener sentido en los dos modos
  // — no se van a poder cargar más gastos nuevos con ella, así que un tope
  // mensual para algo que ya no se puede usar no aporta nada.
  categoryBudgets.list()
    .filter((budget) => budget.category_id === categoryId)
    .forEach((budget) => categoryBudgets.remove(budget.id));

  categories.update(categoryId, { active: false });
}
