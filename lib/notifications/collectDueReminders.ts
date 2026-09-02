import type { Expense } from "@/lib/types";
import { getDueStatus } from "@/lib/dueStatus";
import { daysBetween } from "@/lib/dateRange";
import { formatShortDate } from "@/lib/format";

export type DueReminderKind = "due_upcoming" | "due_overdue";

export interface DueReminderCandidate {
  userId: string;
  kind: DueReminderKind;
  /** Id del gasto — junto con `period`, identifica de forma única este aviso en `notification_log`. */
  entityId: string;
  /** El `due_date` del gasto — si se edita la fecha, cuenta como un aviso distinto. */
  period: string;
  title: string;
  body: string;
}

/** Avisa "por vencer" con esta anticipación (en días) — hoy, mañana o pasado. */
const UPCOMING_WINDOW_DAYS = 2;

/**
 * A partir de TODOS los gastos con vencimiento (de cualquier usuario), arma
 * los candidatos a notificar hoy: los que entran en la ventana de "por
 * vencer", o los que ya están vencidos. No decide si ya se avisó antes de
 * esto — esa deduplicación la hace quien llama, contra `notification_log`
 * (acá solo se calcula el "qué correspondería avisar hoy, en el vacío").
 */
export function collectDueReminders(expenses: Expense[], today: string): DueReminderCandidate[] {
  const candidates: DueReminderCandidate[] = [];

  for (const expense of expenses) {
    if (!expense.due_date) continue;

    const status = getDueStatus(expense, today);
    const label = expense.description || "Un gasto";

    if (status === "upcoming") {
      if (daysBetween(today, expense.due_date) > UPCOMING_WINDOW_DAYS) continue;
      candidates.push({
        userId: expense.user_id,
        kind: "due_upcoming",
        entityId: expense.id,
        period: expense.due_date,
        title: "Vencimiento próximo",
        body: `${label} vence el ${formatShortDate(expense.due_date)}.`,
      });
    } else if (status === "overdue") {
      candidates.push({
        userId: expense.user_id,
        kind: "due_overdue",
        entityId: expense.id,
        period: expense.due_date,
        title: "Gasto vencido",
        body: `${label} venció el ${formatShortDate(expense.due_date)} y sigue sin marcarse como pagado.`,
      });
    }
  }

  return candidates;
}
