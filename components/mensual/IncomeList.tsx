import type { Category, Income } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { formatArs, formatShortDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/EmptyState";
import { PencilIcon, TrashIcon } from "@/components/shared/icons";

interface IncomeListProps {
  incomes: Income[];
  categoriesById: Map<string, Category>;
  colorIndexById: Map<string, number>;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  /** Se puede pisar cuando la lista está vacía por un filtro, no porque no haya ingresos cargados. */
  emptyMessage?: string;
}

/**
 * Detalle de los ingresos individuales del mes (con acciones de editar/
 * borrar) — el resumen por categoría de más arriba en Mensual es un total,
 * esta lista es la que permite corregir una carga puntual.
 */
export function IncomeList({
  incomes,
  categoriesById,
  colorIndexById,
  onEdit,
  onDelete,
  emptyMessage = "Todavía no cargaste ingresos este mes.",
}: IncomeListProps) {
  const sortedByDateDesc = [...incomes].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sortedByDateDesc.length === 0) {
    return <EmptyState message={emptyMessage} className="py-5" />;
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {sortedByDateDesc.map((income, index) => {
        const category = income.category_id ? categoriesById.get(income.category_id) : undefined;
        const colorIndex = income.category_id ? colorIndexById.get(income.category_id) : undefined;
        const color = colorIndex !== undefined ? categoricalColorVar(colorIndex) : "var(--color-muted)";
        const isLast = index === sortedByDateDesc.length - 1;

        return (
          <div
            key={income.id}
            className="px-4 py-3"
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
                  <span className="truncate text-sm">{income.description || category?.name || "Ingreso"}</span>
                  {income.is_fixed && (
                    <span
                      className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      FIJO
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  {formatShortDate(income.date)}
                </div>
              </div>
              <div className="text-[13.5px] font-semibold tabular-nums">{formatArs(income.amount)}</div>
            </div>
            <div className="mt-2 flex gap-3 pl-12">
              <button
                type="button"
                onClick={() => onEdit(income)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--color-brand)" }}
              >
                <PencilIcon />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(income)}
                className="inline-flex items-center gap-1 text-[11px]"
                style={{ color: "var(--chart-8)" }}
              >
                <TrashIcon />
                Borrar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
