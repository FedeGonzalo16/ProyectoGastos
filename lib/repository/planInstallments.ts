import type { BaseRecord, Expense } from "@/lib/types";
import { addMonths, dateWithinMonth, yearMonthFromDate } from "@/lib/dateRange";

type NewExpenseInput = Omit<Expense, keyof BaseRecord>;

function dayOf(isoDate: string): number {
  return Number(isoDate.split("-")[2]);
}

/**
 * A partir de los datos de la primera cuota (tal como los arma
 * `QuickAddExpenseForm`, con `installment_count` ya en más de 1), genera el
 * resto de las filas — una por mes, mismo día del mes que la original
 * (ajustado si ese mes es más corto, ver `dateWithinMonth`) y compartiendo
 * un `installment_group_id` para poder identificarlas como una sola compra
 * más adelante.
 *
 * Cada cuota queda fechada (`date`) en el mes que le corresponde, no solo su
 * `due_date` — el resumen mensual filtra los gastos por `date`
 * (`filterByMonth`), así que si todas compartieran la fecha de la compra
 * original, las cuotas futuras nunca aparecerían en el mes en que en
 * realidad impactan. Si además se cargó un vencimiento, se lo avanza el
 * mismo número de meses conservando su propio día (puede ser distinto al de
 * la compra, ej. compraste el 5 pero la tarjeta cierra el 15).
 *
 * Si `installment_count` es 1 (o no está), no es una compra en cuotas:
 * devuelve la fila tal cual, solo normalizando los campos de cuota a null
 * (por si el formulario llegó a dejar algo cargado a medias).
 */
export function planInstallments(firstInstallment: NewExpenseInput): NewExpenseInput[] {
  const count = firstInstallment.installment_count ?? 1;
  if (count <= 1) {
    return [{ ...firstInstallment, installment_number: null, installment_count: null, installment_group_id: null }];
  }

  const groupId = crypto.randomUUID();
  const baseYearMonth = yearMonthFromDate(firstInstallment.date);
  const day = dayOf(firstInstallment.date);
  const dueDay = firstInstallment.due_date !== null ? dayOf(firstInstallment.due_date) : null;

  return Array.from({ length: count }, (_, index) => {
    const yearMonth = addMonths(baseYearMonth, index);
    return {
      ...firstInstallment,
      date: dateWithinMonth(yearMonth, day),
      due_date: dueDay !== null ? dateWithinMonth(yearMonth, dueDay) : null,
      installment_number: index + 1,
      installment_count: count,
      installment_group_id: groupId,
    };
  });
}
