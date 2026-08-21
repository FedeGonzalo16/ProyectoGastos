import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import type { DonutChartItem } from "@/components/charts/DonutChart";

interface DonutLegendProps {
  items: DonutChartItem[];
  /** Por defecto muestra el porcentaje sobre el total; se puede pisar (ej. para mostrar el monto). */
  formatValue?: (value: number, percentage: number) => string;
}

/**
 * Lista de referencia para un `DonutChart`: mismo orden → mismos colores.
 * Van separados a propósito (torta + leyenda) para poder acomodarlos en
 * layouts distintos (leyenda al lado, abajo, etc.) sin duplicar el cálculo
 * de colores/porcentajes en cada pantalla.
 */
export function DonutLegend({ items, formatValue }: DonutLegendProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-1 flex-col gap-2">
      {items.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const valueLabel = formatValue
          ? formatValue(item.value, percentage)
          : `${percentage.toFixed(0)}%`;

        return (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: categoricalColorVar(item.colorIndex ?? index) }}
              />
              {item.label}
            </span>
            <span className="font-semibold tabular-nums">{valueLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
