export interface DonutSegment {
  dasharray: string;
  dashoffset: string;
}

/**
 * Calcula los `stroke-dasharray`/`stroke-dashoffset` de cada valor para
 * dibujar una torta como una serie de círculos SVG superpuestos (un truco
 * estándar: cada "porción" es en realidad un tramo punteado del mismo
 * círculo). Deja un pequeño espacio (`gap`) entre porciones para que se
 * distingan aunque tengan colores parecidos.
 *
 * Separado del componente de React a propósito: es una función pura, fácil
 * de razonar y de testear sin tener que renderizar nada.
 */
export function buildDonutSegments(values: number[], radius: number, gap = 2.5): DonutSegment[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  return values.map((value) => {
    const length = total > 0 ? (value / total) * circumference : 0;
    const dash = Math.max(length - gap, 0.1);
    const rest = circumference - dash;
    const offset = -cumulative;
    cumulative += length;

    return { dasharray: `${dash.toFixed(1)} ${rest.toFixed(1)}`, dashoffset: `${offset.toFixed(1)}` };
  });
}
