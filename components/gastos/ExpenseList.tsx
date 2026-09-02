import type { Category, Expense, PaymentMethod } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { formatArs, formatShortDate } from "@/lib/format";
import { getDueStatus } from "@/lib/dueStatus";
import { EmptyState } from "@/components/shared/EmptyState";
import { DueStatusBadge } from "@/components/shared/DueStatusBadge";
import { CheckIcon, PencilIcon, TrashIcon } from "@/components/shared/icons";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  otro: "Otro",
};

interface ExpenseListProps {
  expenses: Expense[];
  /** Categorías de gasto, para mostrar nombre en vez de solo el id. */
  categoriesById: Map<string, Category>;
  /** Índice de color fijo por categoría (ver `buildColorIndexById`). */
  colorIndexById: Map<string, number>;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onTogglePaid: (expense: Expense) => void;
  /** Se puede pisar cuando la lista está vacía por un filtro, no porque no haya datos. */
  emptyMessage?: string;
}

/**
 * Lista de gastos recientes. No sabe de dónde vienen los datos (eso lo
 * decide la pantalla que la usa) — solo los ordena y los pinta.
 */
export function ExpenseList({
  expenses,
  categoriesById,
  colorIndexById,
  onEdit,
  onDelete,
  onTogglePaid,
  emptyMessage = "Todavía no cargaste ningún gasto.",
}: ExpenseListProps) {
  const sortedByDateDesc = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sortedByDateDesc.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {sortedByDateDesc.map((expense, index) => {
        const category = expense.category_id ? categoriesById.get(expense.category_id) : undefined;
        const colorIndex = expense.category_id ? colorIndexById.get(expense.category_id) : undefined;
        const color = colorIndex !== undefined ? categoricalColorVar(colorIndex) : "var(--color-muted)";
        const isLast = index === sortedByDateDesc.length - 1;
        const dueStatus = getDueStatus(expense);

        return (
          <div
            key={expense.id}
            className="px-4 py-3.5"
            style={{ borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold"
                style={{ background: "var(--color-bg)", color }}
              >
                {category?.name.charAt(0).toUpperCase() ?? "?"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm">{expense.description || category?.name || "Gasto"}</span>
                  {expense.is_fixed && (
                    <span
                      className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      FIJO
                    </span>
                  )}
                  {expense.installment_count !== null && expense.installment_count > 1 && (
                    <span
                      className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      CUOTA {expense.installment_number}/{expense.installment_count}
                    </span>
                  )}
                  <DueStatusBadge status={dueStatus} dueDate={expense.due_date} />
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  {formatShortDate(expense.date)}
                  {expense.payment_method ? ` · ${PAYMENT_METHOD_LABELS[expense.payment_method]}` : ""}
                  {expense.tag ? ` · ${expense.tag}` : ""}
                </div>
              </div>

              <div className="text-[13.5px] font-semibold tabular-nums">{formatArs(expense.amount)}</div>
            </div>

            <div className="mt-2 flex gap-3 pl-12">
              <button
                type="button"
                onClick={() => onEdit(expense)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--color-brand)" }}
              >
                <PencilIcon />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(expense)}
                className="inline-flex items-center gap-1 text-[11px]"
                style={{ color: "var(--chart-8)" }}
              >
                <TrashIcon />
                Borrar
              </button>
              {expense.due_date && (
                <button
                  type="button"
                  onClick={() => onTogglePaid(expense)}
                  className="inline-flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <CheckIcon />
                  {expense.is_paid ? "Marcar pendiente" : "Marcar pagado"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
