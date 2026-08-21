import { buildDonutSegments } from "@/lib/charts/donutSegments";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";

export interface DonutChartItem {
  label: string;
  value: number;
  /**
   * Color fijo por entidad (no por posición): dos tortas distintas que
   * comparten una categoría deben pintarla siempre igual, sin importar en
   * qué orden aparece en cada una. Si se omite, se usa la posición en el
   * array — válido solo cuando el conjunto de items es siempre el mismo
   * (ej. los 4 tipos de activo de inversión).
   */
  colorIndex?: number;
}

interface DonutChartProps {
  items: DonutChartItem[];
  radius?: number;
  strokeWidth?: number;
}

/**
 * Gráfico de torta genérico: recibe una lista de {label, value} ya ordenada
 * por quien la use (el orden determina el color, siempre el mismo índice →
 * mismo color, según la paleta categórica fija de la app) y dibuja los
 * segmentos. No sabe nada de gastos, ingresos ni inversiones — por eso lo
 * puede usar cualquier pantalla que necesite una torta.
 */
export function DonutChart({ items, radius = 54, strokeWidth = 20 }: DonutChartProps) {
  const segments = buildDonutSegments(items.map((item) => item.value), radius);
  const viewBoxSize = (radius + strokeWidth / 2) * 2;
  const center = viewBoxSize / 2;

  return (
    <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
      <g transform={`rotate(-90 ${center} ${center})`}>
        {segments.map((segment, index) => (
          <circle
            key={items[index].label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={categoricalColorVar(items[index].colorIndex ?? index)}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.dasharray}
            strokeDashoffset={segment.dashoffset}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
