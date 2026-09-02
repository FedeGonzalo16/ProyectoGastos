/**
 * Helpers de fechas para trabajar con "meses" (año + mes) sin arrastrar un
 * objeto Date de un lado a otro — evita bugs de zona horaria, ya que todas
 * las fechas de la app se guardan como texto "YYYY-MM-DD".
 */

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

/** El año y mes actuales, según el reloj del dispositivo. */
export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Suma (o resta, con delta negativo) meses a un YearMonth, ajustando el año. */
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBasedTotal = (month - 1) + delta;
  const wrappedMonth = ((zeroBasedTotal % 12) + 12) % 12;
  const yearOffset = Math.floor(zeroBasedTotal / 12);
  return { year: year + yearOffset, month: wrappedMonth + 1 };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Cuántos días tiene ese mes (28-31), para no generar por ejemplo un 31 de febrero. */
export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(year, month, 0).getDate();
}

/** Arma una fecha "YYYY-MM-DD" para ese mes, ajustando el día si el mes es más corto. */
export function dateWithinMonth(yearMonth: YearMonth, day: number): string {
  const clampedDay = Math.min(day, daysInMonth(yearMonth));
  return `${yearMonth.year}-${pad2(yearMonth.month)}-${pad2(clampedDay)}`;
}

/** Rango [inicio, fin] (ambos incluidos) de un mes, en formato "YYYY-MM-DD". */
export function monthDateRange(yearMonth: YearMonth): { start: string; end: string } {
  return {
    start: dateWithinMonth(yearMonth, 1),
    end: dateWithinMonth(yearMonth, daysInMonth(yearMonth)),
  };
}

/** true si una fecha "YYYY-MM-DD" cae dentro de ese año/mes. */
export function isDateInMonth(isoDate: string, yearMonth: YearMonth): boolean {
  const { start, end } = monthDateRange(yearMonth);
  return isoDate >= start && isoDate <= end;
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Ej: {year: 2026, month: 8} → "Agosto 2026" */
export function formatYearMonth({ year, month }: YearMonth): string {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

/** Ej: {year: 2026, month: 8} → "Ago" (para etiquetas cortas de gráficos). */
export function formatYearMonthShort({ month }: YearMonth): string {
  return MONTH_LABELS[month - 1].slice(0, 3);
}

/** Los últimos `count` meses, en orden cronológico (el más viejo primero), terminando en `endingAt`. */
export function lastNMonths(endingAt: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, index) => addMonths(endingAt, index - (count - 1)));
}

/** El año y mes de una fecha "YYYY-MM-DD" (para comparar contra otro YearMonth). */
export function yearMonthFromDate(isoDate: string): YearMonth {
  const [year, month] = isoDate.split("-").map(Number);
  return { year, month };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Cuántos días hay entre dos fechas "YYYY-MM-DD" (negativo si `to` es anterior a `from`). */
export function daysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  // Date.UTC en vez de `new Date(y, m, d)`: evita que un cambio de horario de
  // verano entre las dos fechas corra el resultado medio día para un lado.
  const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toMs = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/** Cuántos meses hay entre dos YearMonth, ambos incluidos (ej. Ago→Ago = 1, Ago→Oct = 3). */
export function monthsBetweenInclusive(from: YearMonth, to: YearMonth): number {
  return (to.year - from.year) * 12 + (to.month - from.month) + 1;
}

/** Convierte a "YYYY-MM", el formato que espera un <input type="month">. */
export function yearMonthToMonthInput({ year, month }: YearMonth): string {
  return `${year}-${pad2(month)}`;
}

/** Inverso de `yearMonthToMonthInput` — parsea el valor de un <input type="month">. */
export function yearMonthFromMonthInput(value: string): YearMonth {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

// Tope de seguridad para un rango personalizado: evita que una fecha "hasta"
// anterior a la "desde" (o un rango absurdamente largo) rompa el gráfico.
const MAX_CUSTOM_RANGE_MONTHS = 36;

/** Todos los meses entre `from` y `to` (ambos incluidos), en orden cronológico. Si `to` quedó antes que `from`, se devuelve solo `from`. */
export function monthRangeInclusive(from: YearMonth, to: YearMonth): YearMonth[] {
  const count = Math.min(monthsBetweenInclusive(from, to), MAX_CUSTOM_RANGE_MONTHS);
  if (count <= 0) return [from];
  return Array.from({ length: count }, (_, index) => addMonths(from, index));
}
