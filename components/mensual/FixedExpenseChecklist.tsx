import type { Category, Expense } from "@/lib/types";
import { formatArs } from "@/lib/format";
import { getDueStatus } from "@/lib/dueStatus";
import { DueStatusBadge } from "@/components/shared/DueStatusBadge";
import { CheckIcon } from "@/components/shared/icons";

interface FixedExpenseChecklistProps {
  /** Gastos fijos ya generados para el mes que se está mirando. */
  expenses: Expense[];
  categoriesById: Map<string, Category>;
  onTogglePaid: (expense: Expense) => void;
}

/**
 * Checklist de los gastos fijos del mes con vencimiento: estado (vencido,
 * pendiente, pagado) y un botón para marcarlos. No tiene Editar/Borrar — eso
 * se sigue haciendo desde Gastos, esto es solo para el seguimiento de pagos.
 * Los gastos fijos sin vencimiento no aparecen acá (no hay nada que marcar).
 */
export function FixedExpenseChecklist({ expenses, categoriesById, onTogglePaid }: FixedExpenseChecklistProps) {
  const withDueDate = expenses
    .filter((expense) => expense.due_date !== null)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  if (withDueDate.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-text-secondary)" }}>
        Vencimientos del mes
      </p>
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        {withDueDate.map((expense, index) => {
          const category = expense.category_id ? categoriesById.get(expense.category_id) : undefined;
          const isLast = index === withDueDate.length - 1;

          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm">{expense.description || category?.name || "Gasto"}</span>
                  <DueStatusBadge status={getDueStatus(expense)} dueDate={expense.due_date} />
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  {category?.name ?? "Sin categoría"} · {formatArs(expense.amount)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTogglePaid(expense)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--color-brand)" }}
              >
                <CheckIcon />
                {expense.is_paid ? "Marcar pendiente" : "Marcar pagado"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
