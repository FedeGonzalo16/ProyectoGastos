import type { Repository } from "@/lib/repository/types";
import type { BaseRecord, Expense, FixedExpense } from "@/lib/types";
import { dateWithinMonth, type YearMonth } from "@/lib/dateRange";

/** El día del mes es opcional; si no se eligió ninguno, se genera el día 1. */
const DEFAULT_DAY_OF_MONTH = 1;

type NewExpenseInput = Omit<Expense, keyof BaseRecord>;

/**
 * La parte pura de la generación: decide QUÉ gastos habría que crear para un
 * mes dado a partir de las plantillas activas, sin tocar ningún repositorio.
 * Es idempotente por construcción (mira `existingExpenses` para no repetir),
 * así que se puede llamar las veces que haga falta sin duplicar nada.
 *
 * Separada de `ensureFixedExpensesGeneratedForMonth` para que el chequeo de
 * notificaciones (`app/api/notifications/check`, que corre en el servidor
 * con el cliente admin, no con un `Repository<T>`) pueda generar los gastos
 * del mes de usuarios que todavía no abrieron la app — si no, nunca verían
 * un recordatorio de sus gastos fijos.
 *
 * Un cambio posterior en el monto de la plantilla NO reescribe los gastos ya
 * generados — cada uno queda con el monto que tenía en el momento en que se
 * creó, tal como se definió en el plan.
 */
export function planFixedExpenseGeneration(
  templates: FixedExpense[],
  existingExpenses: Expense[],
  yearMonth: YearMonth
): NewExpenseInput[] {
  const activeTemplates = templates.filter((template) => template.active);

  const plans: NewExpenseInput[] = [];
  for (const template of activeTemplates) {
    const alreadyGenerated = existingExpenses.some(
      (expense) => expense.fixed_expense_id === template.id && expense.date.startsWith(monthPrefix(yearMonth))
    );
    if (alreadyGenerated) continue;

    plans.push({
      date: dateWithinMonth(yearMonth, template.day_of_month ?? DEFAULT_DAY_OF_MONTH),
      amount: template.amount_estimate,
      // La plantilla no categoriza — el gasto generado arranca sin categoría
      // y se puede asignar una después, editándolo en Gastos.
      category_id: null,
      description: template.name,
      payment_method: null,
      is_fixed: true,
      fixed_expense_id: template.id,
      // Vencimiento por defecto = el mismo día del mes en que se genera; si
      // algún mes vence distinto (ej. el cierre de una tarjeta), se edita ese
      // gasto puntual sin tocar la plantilla.
      due_date: template.day_of_month !== null ? dateWithinMonth(yearMonth, template.day_of_month) : null,
      is_paid: false,
      // Un gasto fijo generado nunca es una cuota (eso es exclusivo de una
      // compra puntual en crédito) ni trae etiqueta — se puede editar después.
      installment_number: null,
      installment_count: null,
      installment_group_id: null,
      tag: null,
    });
  }

  return plans;
}

/**
 * Genera, para un mes dado, un gasto por cada plantilla de gasto fijo activa
 * que todavía no tenga uno generado ese mes. Se puede llamar cada vez que se
 * abre la pantalla de Mensual sin duplicar nada (ver `planFixedExpenseGeneration`).
 */
export function ensureFixedExpensesGeneratedForMonth(
  fixedExpenses: Repository<FixedExpense>,
  expenses: Repository<Expense>,
  yearMonth: YearMonth
): void {
  const plans = planFixedExpenseGeneration(fixedExpenses.list(), expenses.list(), yearMonth);
  for (const plan of plans) {
    expenses.create(plan);
  }
}

function monthPrefix({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
