import type { BaseRecord, FixedIncome, Income } from "@/lib/types";
import { dateWithinMonth, type YearMonth } from "@/lib/dateRange";
import type { Repository } from "@/lib/repository/types";

/** El día del mes es opcional; si no se eligió ninguno, se genera el día 1. */
const DEFAULT_DAY_OF_MONTH = 1;

type NewIncomeInput = Omit<Income, keyof BaseRecord>;

/**
 * Mismo concepto que `planFixedExpenseGeneration`, del lado de los ingresos
 * (ej. el sueldo) — decide qué ingresos habría que crear para un mes dado a
 * partir de las plantillas activas, sin tocar ningún repositorio. Es
 * idempotente por construcción (mira `existingIncomes`), así que se puede
 * llamar las veces que haga falta sin duplicar nada.
 *
 * Un cambio posterior en el monto de la plantilla (ej. te aumentaron el
 * sueldo) NO reescribe los ingresos ya generados — cada uno queda con el
 * monto que tenía en el momento en que se creó.
 */
export function planFixedIncomeGeneration(
  templates: FixedIncome[],
  existingIncomes: Income[],
  yearMonth: YearMonth
): NewIncomeInput[] {
  const activeTemplates = templates.filter((template) => template.active);

  const plans: NewIncomeInput[] = [];
  for (const template of activeTemplates) {
    const alreadyGenerated = existingIncomes.some(
      (income) => income.fixed_income_id === template.id && income.date.startsWith(monthPrefix(yearMonth))
    );
    if (alreadyGenerated) continue;

    plans.push({
      date: dateWithinMonth(yearMonth, template.day_of_month ?? DEFAULT_DAY_OF_MONTH),
      amount: template.amount_estimate,
      // La plantilla no categoriza — el ingreso generado arranca sin
      // categoría y se puede asignar una después, editándolo en Mensual
      // (mismo criterio que un gasto fijo generado).
      category_id: null,
      description: template.name,
      is_fixed: true,
      fixed_income_id: template.id,
    });
  }

  return plans;
}

/**
 * Genera, para un mes dado, un ingreso por cada plantilla de ingreso fijo
 * activa que todavía no tenga uno generado ese mes. Se puede llamar cada vez
 * que se abre Mensual sin duplicar nada (ver `planFixedIncomeGeneration`).
 */
export function ensureFixedIncomesGeneratedForMonth(
  fixedIncomes: Repository<FixedIncome>,
  incomes: Repository<Income>,
  yearMonth: YearMonth
): void {
  const plans = planFixedIncomeGeneration(fixedIncomes.list(), incomes.list(), yearMonth);
  for (const plan of plans) {
    incomes.create(plan);
  }
}

function monthPrefix({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
