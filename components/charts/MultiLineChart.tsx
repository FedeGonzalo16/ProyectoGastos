import { buildMultiLinePoints, pointsToMultiSegmentPath } from "@/lib/charts/linePoints";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { SeriesLegend } from "@/components/charts/SeriesLegend";

export interface MultiLineSeries {
  label: string;
  /** `null` en los períodos anteriores a que esta serie tuviera datos (ver `assetReturnHistory`). */
  values: (number | null)[];
}

interface MultiLineChartProps {
  periodLabels: string[];
  series: MultiLineSeries[];
  height?: number;
}

const CHART_WIDTH = 342;
const LABELS_HEIGHT = 20;
const PADDING_X = 12;

/**
 * Varias líneas compartiendo el mismo eje (ej. el rendimiento de cada activo
 * por separado). A diferencia de `LineChart`, no rellena el área bajo la
 * curva — con varias líneas superpuestas el relleno ensucia más de lo que
 * ayuda — y admite huecos: una serie sin datos todavía en un período
 * simplemente no dibuja nada ahí, en vez de "inventar" un valor.
 */
export function MultiLineChart({ periodLabels, series, height = 150 }: MultiLineChartProps) {
  const pointsPerSeries = buildMultiLinePoints(
    series.map((s) => s.values),
    CHART_WIDTH,
    height
  );
  const viewBoxHeight = height + LABELS_HEIGHT;
  const stepX = periodLabels.length > 1 ? (CHART_WIDTH - PADDING_X * 2) / (periodLabels.length - 1) : 0;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${viewBoxHeight}`}>
        <line x1={0} y1={height} x2={CHART_WIDTH} y2={height} stroke="var(--color-grid)" strokeWidth={1} />

        {pointsPerSeries.map((points, seriesIndex) => {
          const color = categoricalColorVar(seriesIndex);
          // El punto final de CADA serie es el último dato que tiene, no
          // necesariamente el último período del gráfico (un activo puede
          // haber dejado de actualizarse antes que los demás).
          const lastDefinedIndex = points.reduce((lastIdx, point, index) => (point !== null ? index : lastIdx), -1);
          const lastDefinedPoint = lastDefinedIndex >= 0 ? points[lastDefinedIndex] : null;

          const revealDelay = seriesIndex * 120;

          return (
            <g key={series[seriesIndex].label}>
              <path
                d={pointsToMultiSegmentPath(points)}
                pathLength={1}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chart-line-draw"
                style={{ animationDelay: `${revealDelay}ms` }}
              />
              {lastDefinedPoint && (
                <circle
                  cx={lastDefinedPoint.x}
                  cy={lastDefinedPoint.y}
                  r={3.5}
                  fill="var(--color-card)"
                  stroke={color}
                  strokeWidth={2.2}
                  className="chart-fade-in"
                  style={{ animationDelay: `${revealDelay + 550}ms` }}
                />
              )}
            </g>
          );
        })}

        {periodLabels.map((label, index) => {
          const x = PADDING_X + index * stepX;
          const isLast = index === periodLabels.length - 1;
          return (
            <text
              key={label + index}
              x={Math.max(0, Math.min(x, CHART_WIDTH - 18))}
              y={height + 14}
              fontSize={10}
              fontWeight={isLast ? 600 : 400}
              fill={isLast ? "var(--color-text)" : "var(--color-muted)"}
            >
              {label}
            </text>
          );
        })}
      </svg>

      <SeriesLegend labels={series.map((s) => s.label)} />
    </div>
  );
}
