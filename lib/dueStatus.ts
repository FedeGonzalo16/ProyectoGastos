import type { Expense } from "@/lib/types";
import { todayAsDateInput } from "@/lib/format";

export type DueStatus = "none" | "upcoming" | "overdue" | "paid";

/**
 * Estado de vencimiento/pago de un gasto, a partir de `due_date`/`is_paid`.
 * `"none"` cuando no tiene vencimiento seteado (la mayoría de los gastos) —
 * en ese caso no corresponde mostrar ningún badge de pago.
 *
 * `today` es opcional (por defecto, hoy de verdad) — se puede fijar en los
 * tests y en el chequeo de notificaciones (`lib/notifications/`), que corre
 * en el servidor y necesita una única fecha de referencia para toda la
 * corrida, no una nueva por cada gasto que evalúa.
 */
export function getDueStatus(
  expense: Pick<Expense, "due_date" | "is_paid">,
  today: string = todayAsDateInput()
): DueStatus {
  if (!expense.due_date) return "none";
  if (expense.is_paid) return "paid";
  // Comparación de strings ISO ("YYYY-MM-DD"): funciona igual que compararlas como fechas.
  return expense.due_date < today ? "overdue" : "upcoming";
}
