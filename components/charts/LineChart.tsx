import { buildLinePoints, pointsToAreaPath, pointsToLinePath } from "@/lib/charts/linePoints";

interface LineChartProps {
  periodLabels: string[];
  values: number[];
  height?: number;
  /** Color de la línea/área — una variable CSS, ej. "var(--chart-3)". */
  colorVar?: string;
}

const CHART_WIDTH = 342;
const LABELS_HEIGHT = 20;
const GRADIENT_ID = "line-chart-fill";

/**
 * Gráfico de línea de una sola serie (ej. evolución del % de rendimiento).
 * No sabe qué representa el valor — solo lo dibuja — así se puede reusar
 * para cualquier métrica que evolucione en el tiempo.
 */
export function LineChart({ periodLabels, values, height = 140, colorVar = "var(--chart-3)" }: LineChartProps) {
  const points = buildLinePoints(values, CHART_WIDTH, height);
  const viewBoxHeight = height + LABELS_HEIGHT;

  return (
    <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${viewBoxHeight}`}>
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorVar} stopOpacity={0.22} />
          <stop offset="100%" stopColor={colorVar} stopOpacity={0} />
        </linearGradient>
      </defs>

      <line x1={0} y1={height} x2={CHART_WIDTH} y2={height} stroke="var(--color-grid)" strokeWidth={1} />

      {points.length > 0 && (
        <>
          <path d={pointsToAreaPath(points, height)} fill={`url(#${GRADIENT_ID})`} className="chart-fade-in" />
          <path
            d={pointsToLinePath(points)}
            pathLength={1}
            fill="none"
            stroke={colorVar}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line-draw"
          />
          {points.map((point, index) => {
            const isLast = index === points.length - 1;
            return isLast ? (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4}
                fill="var(--color-card)"
                stroke={colorVar}
                strokeWidth={2.4}
                className="chart-fade-in"
                style={{ animationDelay: "550ms" }}
              />
            ) : (
              <circle key={index} cx={point.x} cy={point.y} r={3} fill={colorVar} />
            );
          })}
        </>
      )}

      {periodLabels.map((label, index) => {
        const x = points[index]?.x ?? 0;
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
  );
}
