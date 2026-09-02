/**
 * Helpers de formato de números/fechas, para no repetir `Intl.NumberFormat`
 * con las mismas opciones en cada componente.
 */

const ARS_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

/** Ej: 12400 → "$12.400" */
export function formatArs(amount: number): string {
  return ARS_FORMATTER.format(amount);
}

/** Ej: 1434 → "US$ 1.434" (Intl da "$1,434"; se ajusta el símbolo/separador). */
export function formatUsd(amount: number): string {
  return `US$ ${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Ej: "2026-08-21" → "21 ago." (fechas guardadas como date-only, sin hora). */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return SHORT_DATE_FORMATTER.format(new Date(year, month - 1, day));
}

/** Fecha de hoy en formato "YYYY-MM-DD", el mismo que usan los inputs de tipo date. */
export function todayAsDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** La fecha de hace `days` días, en formato "YYYY-MM-DD" — para filtros como "últimos 7 días". */
export function daysAgoAsDateInput(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
