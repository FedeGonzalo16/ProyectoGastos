import { categoricalColorVar } from "@/lib/charts/categoricalColor";

/**
 * Fila de referencia "punto de color + nombre" para identificar cada serie
 * de un gráfico de barras/líneas. El índice de cada item define su color,
 * igual que en `DonutLegend` — así una serie nunca cambia de color aunque
 * se agregue o filtre otra.
 */
export function SeriesLegend({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {labels.map((label, index) => (
        <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: categoricalColorVar(index) }} />
          {label}
        </div>
      ))}
    </div>
  );
}
