import { buildGroupedBars } from "@/lib/charts/groupedBars";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { SeriesLegend } from "@/components/charts/SeriesLegend";

export interface ChartSeries {
  label: string;
  values: number[];
}

interface GroupedBarChartProps {
  /** Etiquetas del eje X, una por período (ej. los últimos 6 meses). */
  periodLabels: string[];
  series: ChartSeries[];
  /** Resalta un período (ej. el mes actual) con un fondo suave detrás del grupo. */
  highlightPeriodIndex?: number;
  height?: number;
}

const CHART_WIDTH = 342; // mismo ancho de contenido que el resto de las tarjetas (390px de frame - padding)
const LABELS_HEIGHT = 24;

/**
 * Gráfico de barras agrupadas (ej. Ingresos vs Gastos vs Inversión, por
 * mes). Genérico: no sabe qué representan las series, solo las dibuja según
 * la paleta categórica fija — por eso lo puede usar tanto el Dashboard como
 * Mensual con distinta cantidad de series.
 */
export function GroupedBarChart({
  periodLabels,
  series,
  highlightPeriodIndex,
  height = 150,
}: GroupedBarChartProps) {
  const groups = buildGroupedBars(series.map((s) => s.values), {
    chartWidth: CHART_WIDTH,
    chartHeight: height,
  });
  const viewBoxHeight = height + LABELS_HEIGHT;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${viewBoxHeight}`}>
        <line x1={0} y1={height} x2={CHART_WIDTH} y2={height} stroke="var(--color-grid)" strokeWidth={1} />

        {groups.map((group) => {
          const isHighlighted = group.periodIndex === highlightPeriodIndex;
          const groupSpanWidth = CHART_WIDTH / periodLabels.length;

          return (
            <g key={group.periodIndex}>
              {isHighlighted && (
                <rect
                  x={group.periodIndex * groupSpanWidth + 2}
                  y={0}
                  width={groupSpanWidth - 4}
                  height={height}
                  rx={10}
                  fill="var(--color-brand-soft)"
                />
              )}
              {group.bars.map((bar) => (
                <rect
                  key={bar.seriesIndex}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={Math.max(bar.height, 1)}
                  rx={2.5}
                  fill={categoricalColorVar(bar.seriesIndex)}
                />
              ))}
              <text
                x={group.centerX}
                y={height + 16}
                textAnchor="middle"
                fontSize={10}
                fontWeight={isHighlighted ? 600 : 400}
                fill={isHighlighted ? "var(--color-text)" : "var(--color-muted)"}
              >
                {periodLabels[group.periodIndex]}
              </text>
            </g>
          );
        })}
      </svg>

      <SeriesLegend labels={series.map((s) => s.label)} />
    </div>
  );
}
