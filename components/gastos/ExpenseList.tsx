import type { Category, Expense, PaymentMethod } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { formatArs, formatShortDate } from "@/lib/format";

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
}

/**
 * Lista de gastos recientes. No sabe de dónde vienen los datos (eso lo
 * decide la pantalla que la usa) — solo los ordena y los pinta.
 */
export function ExpenseList({ expenses, categoriesById, colorIndexById }: ExpenseListProps) {
  const sortedByDateDesc = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sortedByDateDesc.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Todavía no cargaste ningún gasto.
      </p>
    );
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

        return (
          <div
            key={expense.id}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}
          >
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
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                {formatShortDate(expense.date)}
                {expense.payment_method ? ` · ${PAYMENT_METHOD_LABELS[expense.payment_method]}` : ""}
              </div>
            </div>

            <div className="text-[13.5px] font-semibold tabular-nums">{formatArs(expense.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}
