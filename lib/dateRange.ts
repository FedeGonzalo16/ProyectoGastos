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
