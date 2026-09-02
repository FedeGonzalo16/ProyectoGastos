import { yearMonthFromMonthInput, yearMonthToMonthInput, type YearMonth } from "@/lib/dateRange";

interface CustomMonthRangeFieldsProps {
  from: YearMonth;
  to: YearMonth;
  /** No se puede elegir un mes futuro — no hay datos que mostrar todavía. */
  maxTo: YearMonth;
  onChangeFrom: (value: YearMonth) => void;
  onChangeTo: (value: YearMonth) => void;
}

/**
 * Par de selectores "desde/hasta" (mes y año) para cuando se elige
 * "Seleccionar rango" en `PeriodSelector`. Usa <input type="month"> nativo en vez
 * de un <select> a medida — a diferencia del <select> de categorías, este sí
 * se ve bien en Windows porque el navegador dibuja un ícono de calendario, no
 * una lista desplegable completa.
 *
 * Van uno debajo del otro (no lado a lado): el formato largo en español
 * ("agosto de 2026") más el ícono de calendario del navegador no entran
 * cómodos en dos columnas dentro del ancho de la tarjeta — puestos así,
 * cada campo tiene todo el ancho disponible y no se desborda.
 */
export function CustomMonthRangeFields({ from, to, maxTo, onChangeFrom, onChangeTo }: CustomMonthRangeFieldsProps) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <label className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <span className="block text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
          Desde
        </span>
        <input
          type="month"
          value={yearMonthToMonthInput(from)}
          max={yearMonthToMonthInput(to)}
          onChange={(event) => onChangeFrom(yearMonthFromMonthInput(event.target.value))}
          className="w-full text-xs outline-none"
          style={{ background: "transparent", color: "var(--color-text)" }}
        />
      </label>
      <label className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <span className="block text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
          Hasta
        </span>
        <input
          type="month"
          value={yearMonthToMonthInput(to)}
          min={yearMonthToMonthInput(from)}
          max={yearMonthToMonthInput(maxTo)}
          onChange={(event) => onChangeTo(yearMonthFromMonthInput(event.target.value))}
          className="w-full text-xs outline-none"
          style={{ background: "transparent", color: "var(--color-text)" }}
        />
      </label>
    </div>
  );
}
