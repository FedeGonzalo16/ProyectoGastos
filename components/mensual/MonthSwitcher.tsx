import { addMonths, formatYearMonth, type YearMonth } from "@/lib/dateRange";

interface MonthSwitcherProps {
  value: YearMonth;
  onChange: (next: YearMonth) => void;
}

/** Selector "‹ Mes Año ›" — su única responsabilidad es mover el mes de a uno. */
export function MonthSwitcher({ value, onChange }: MonthSwitcherProps) {
  return (
    <div
      className="flex items-center justify-center gap-3.5 rounded-2xl border py-2.5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={() => onChange(addMonths(value, -1))}
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="font-heading text-sm font-semibold">{formatYearMonth(value)}</span>

      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={() => onChange(addMonths(value, 1))}
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
