import type { Repository } from "@/lib/repository/types";
import type { Expense, FixedExpense } from "@/lib/types";
import { dateWithinMonth, type YearMonth } from "@/lib/dateRange";

/**
 * Genera, para un mes dado, un gasto por cada plantilla de gasto fijo activa
 * que todavía no tenga uno generado ese mes. Es idempotente: se puede llamar
 * cada vez que se abre la pantalla de Mensual sin duplicar nada, porque antes
 * de crear revisa qué plantillas ya generaron su gasto en ese mes.
 *
 * Un cambio posterior en el monto de la plantilla NO reescribe los gastos ya
 * generados — cada uno queda con el monto que tenía en el momento en que se
 * creó, tal como se definió en el plan.
 */
export function ensureFixedExpensesGeneratedForMonth(
  fixedExpenses: Repository<FixedExpense>,
  expenses: Repository<Expense>,
  yearMonth: YearMonth
): void {
  const activeTemplates = fixedExpenses.list().filter((template) => template.active);
  const allExpenses = expenses.list();

  for (const template of activeTemplates) {
    const alreadyGenerated = allExpenses.some(
      (expense) =>
        expense.fixed_expense_id === template.id &&
        expense.date.startsWith(monthPrefix(yearMonth))
    );
    if (alreadyGenerated) continue;

    expenses.create({
      date: dateWithinMonth(yearMonth, template.day_of_month),
      amount: template.amount_estimate,
      category_id: template.category_id,
      description: template.name,
      payment_method: null,
      is_fixed: true,
      fixed_expense_id: template.id,
    });
  }
}

function monthPrefix({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
