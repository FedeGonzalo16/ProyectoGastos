export type ComparisonPeriod = 6 | 12;

interface PeriodSelectorProps {
  value: ComparisonPeriod;
  onChange: (value: ComparisonPeriod) => void;
}

const OPTIONS: ComparisonPeriod[] = [6, 12];

/**
 * Elige cuántos meses hacia atrás muestra la comparativa del Dashboard. Las
 * tortas de categorías no dependen de esto — siempre son del mes actual — así
 * que solo controla el gráfico de barras.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const isSelected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
            style={
              isSelected
                ? { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
                : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
            }
          >
            Últimos {option} meses
          </button>
        );
      })}
    </div>
  );
}
