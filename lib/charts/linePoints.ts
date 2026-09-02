export interface LinePoint {
  x: number;
  y: number;
}

/**
 * Convierte una lista de valores en puntos (x, y) dentro de un área de
 * `width` x `height`, escalando el eje Y entre el mínimo y el máximo de la
 * serie. Función pura, separada del componente que dibuja el SVG.
 */
export function buildLinePoints(
  values: number[],
  width: number,
  height: number,
  paddingX = 12,
  paddingY = 16
): LinePoint[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // evita dividir por cero cuando todos los valores son iguales
  const stepX = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: paddingX + index * stepX,
    y: paddingY + (height - paddingY * 2) * (1 - (value - min) / range),
  }));
}

/** Arma el atributo `d` de un `<path>` que conecta los puntos con líneas rectas. */
export function pointsToLinePath(points: LinePoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

/** Igual que `pointsToLinePath`, pero cerrando el área contra la base del gráfico (para el relleno). */
export function pointsToAreaPath(points: LinePoint[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = pointsToLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `M${first.x.toFixed(1)},${baselineY} ${line.replace(/^M/, "L")} L${last.x.toFixed(1)},${baselineY} Z`;
}

/**
 * Igual que `buildLinePoints`, pero para varias series que comparten el
 * mismo eje Y (ej. el rendimiento de cada activo por separado) — el mínimo y
 * el máximo se calculan sobre TODAS las series juntas, así quedan
 * comparables entre sí en la misma escala en vez de que cada una estire su
 * propio rango. Un valor `null` (ej. un activo que todavía no existía en esa
 * fecha) se preserva como hueco en vez de forzarlo a cero.
 */
export function buildMultiLinePoints(
  seriesValues: (number | null)[][],
  width: number,
  height: number,
  paddingX = 12,
  paddingY = 16
): (LinePoint | null)[][] {
  const allDefinedValues = seriesValues.flat().filter((value): value is number => value !== null);
  const pointCount = Math.max(0, ...seriesValues.map((values) => values.length));
  const stepX = pointCount > 1 ? (width - paddingX * 2) / (pointCount - 1) : 0;

  if (allDefinedValues.length === 0) {
    return seriesValues.map((values) => values.map(() => null));
  }

  const min = Math.min(...allDefinedValues);
  const max = Math.max(...allDefinedValues);
  const range = max - min || 1; // evita dividir por cero cuando todos los valores son iguales

  return seriesValues.map((values) =>
    values.map((value, index) =>
      value === null
        ? null
        : { x: paddingX + index * stepX, y: paddingY + (height - paddingY * 2) * (1 - (value - min) / range) }
    )
  );
}

/** Igual que `pointsToLinePath`, pero cortando la línea en cada hueco (`null`) en vez de conectarla por encima. */
export function pointsToMultiSegmentPath(points: (LinePoint | null)[]): string {
  const segments: string[] = [];
  let currentSegment: LinePoint[] = [];

  for (const point of points) {
    if (point === null) {
      if (currentSegment.length > 0) {
        segments.push(pointsToLinePath(currentSegment));
        currentSegment = [];
      }
    } else {
      currentSegment.push(point);
    }
  }
  if (currentSegment.length > 0) segments.push(pointsToLinePath(currentSegment));

  return segments.join(" ");
}
