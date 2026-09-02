import type { AssetType, InvestmentKind } from "@/lib/types";
import { ASSET_TYPES } from "@/lib/assetTypes";

export type InvestmentPeriodFilter = "3m" | "12m" | "all";

const PERIOD_OPTIONS: { value: InvestmentPeriodFilter; label: string }[] = [
  { value: "3m", label: "Últimos 3 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "all", label: "Todo" },
];

const KIND_OPTIONS: { value: InvestmentKind | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "compra", label: "Compras" },
  { value: "venta", label: "Ventas" },
];

interface InvestmentFiltersProps {
  periodFilter: InvestmentPeriodFilter;
  onPeriodFilterChange: (value: InvestmentPeriodFilter) => void;
  kindFilter: InvestmentKind | "all";
  onKindFilterChange: (value: InvestmentKind | "all") => void;
  assetTypeFilter: AssetType | "all";
  onAssetTypeFilterChange: (value: AssetType | "all") => void;
}

/**
 * Filtros del Historial de Inversiones: por período, tipo de operación
 * (compra/venta) y tipo de activo — cada uno independiente y combinable con
 * el resto, mismo criterio que `ExpenseFilters` en Gastos.
 */
export function InvestmentFilters({
  periodFilter,
  onPeriodFilterChange,
  kindFilter,
  onKindFilterChange,
  assetTypeFilter,
  onAssetTypeFilterChange,
}: InvestmentFiltersProps) {
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
        {KIND_OPTIONS.map((option) => {
          const isSelected = option.value === kindFilter;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onKindFilterChange(option.value)}
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
          onClick={() => onAssetTypeFilterChange("all")}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
          style={
            assetTypeFilter === "all"
              ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
              : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
          }
        >
          Todos los activos
        </button>
        {ASSET_TYPES.map((type) => {
          const isSelected = type.value === assetTypeFilter;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onAssetTypeFilterChange(type.value)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
