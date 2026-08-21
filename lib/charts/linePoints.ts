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
