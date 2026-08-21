export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Índice de serie (0, 1, 2...), para elegir el color categórico. */
  seriesIndex: number;
}

export interface BarGroup {
  periodIndex: number;
  /** Centro horizontal del grupo, útil para ubicar la etiqueta del período debajo. */
  centerX: number;
  bars: BarRect[];
}

interface BuildGroupedBarsOptions {
  chartWidth: number;
  chartHeight: number;
  barGap?: number;
}

/**
 * Calcula la geometría (x/y/ancho/alto) de un gráfico de barras agrupadas,
 * a partir de varias series con el mismo número de períodos. Función pura:
 * no dibuja nada, solo hace la cuenta — así el componente de React que
 * renderiza el SVG queda simple y esto se puede reusar (o testear) solo.
 */
export function buildGroupedBars(
  series: number[][],
  { chartWidth, chartHeight, barGap = 3 }: BuildGroupedBarsOptions
): BarGroup[] {
  const periodCount = series[0]?.length ?? 0;
  const seriesCount = series.length;
  if (periodCount === 0 || seriesCount === 0) return [];

  const periodWidth = chartWidth / periodCount;
  const maxValue = Math.max(1, ...series.flat());
  const barWidth = (periodWidth - barGap * (seriesCount + 1)) / seriesCount;

  return Array.from({ length: periodCount }, (_, periodIndex) => {
    const bars: BarRect[] = series.map((values, seriesIndex) => {
      const value = values[periodIndex];
      const height = (value / maxValue) * chartHeight;
      const x = periodIndex * periodWidth + barGap + seriesIndex * (barWidth + barGap);
      return { x, y: chartHeight - height, width: barWidth, height, seriesIndex };
    });

    return { periodIndex, centerX: periodIndex * periodWidth + periodWidth / 2, bars };
  });
}
