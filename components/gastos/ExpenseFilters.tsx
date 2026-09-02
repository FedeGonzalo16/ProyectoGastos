import type { Category } from "@/lib/types";

export type PeriodFilter = "7d" | "30d" | "all";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "all", label: "Todo" },
];

interface ExpenseFiltersProps {
  categories: Category[];
  categoryFilter: string | "all";
  onCategoryFilterChange: (value: string | "all") => void;
  periodFilter: PeriodFilter;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  /** Etiquetas en uso (sin repetir) — vacío si nadie cargó ninguna todavía, en cuyo caso no se muestra esta fila. */
  tags: string[];
  tagFilter: string | "all";
  onTagFilterChange: (value: string | "all") => void;
}

/** Filtros del listado de "Gastos recientes": por período, categoría y etiqueta, cada uno independiente. */
export function ExpenseFilters({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  periodFilter,
  onPeriodFilterChange,
  tags,
  tagFilter,
  onTagFilterChange,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="chip-scroll flex gap-2 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = option.value === periodFilter;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodFilterChange(option.value)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="chip-scroll flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onCategoryFilterChange("all")}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
          style={
            categoryFilter === "all"
              ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
              : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
          }
        >
          Todas las categorías
        </button>
        {categories
          .filter((category) => category.active || category.id === categoryFilter)
          .map((category) => {
            const isSelected = category.id === categoryFilter;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryFilterChange(category.id)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
                style={
                  isSelected
                    ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {category.name}
              </button>
            );
          })}
      </div>

      {tags.length > 0 && (
        <div className="chip-scroll flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onTagFilterChange("all")}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
            style={
              tagFilter === "all"
                ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
            }
          >
            Todas las etiquetas
          </button>
          {tags.map((tagOption) => {
            const isSelected = tagOption === tagFilter;
            return (
              <button
                key={tagOption}
                type="button"
                onClick={() => onTagFilterChange(tagOption)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
                style={
                  isSelected
                    ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {tagOption}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
