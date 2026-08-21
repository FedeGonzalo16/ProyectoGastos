/**
 * Asigna colores de gráfico por posición fija (nunca por nombre ni al azar),
 * usando las variables CSS ya definidas en app/globals.css — así el mismo
 * índice se ve bien tanto en modo claro como oscuro sin lógica adicional.
 */
const CHART_COLOR_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-7",
  "--chart-8",
] as const;

/** Devuelve `var(--chart-N)` para la posición dada, ciclando si hay más de 8. */
export function categoricalColorVar(index: number): string {
  return `var(${CHART_COLOR_VARS[index % CHART_COLOR_VARS.length]})`;
}

/**
 * Asigna a cada id de una lista (ej. categorías) un índice de color fijo,
 * según su posición en el array. Se recibe la lista ya ordenada por quien
 * llama (normalmente por fecha de creación), para que el orden de colores
 * no cambie de una pantalla a otra.
 */
export function buildColorIndexById(items: { id: string }[]): Map<string, number> {
  return new Map(items.map((item, index) => [item.id, index]));
}
