import type { ReactNode } from "react";

export type ComparisonPeriod = 3 | 6 | 12 | "custom";

interface PeriodSelectorProps {
  value: ComparisonPeriod;
  onChange: (value: ComparisonPeriod) => void;
}

const PRESET_OPTIONS: ComparisonPeriod[] = [3, 6, 12];

/**
 * Elige qué meses muestra la comparativa del Dashboard: un preset fijo (3/6/12
 * meses hacia atrás) o "Seleccionar rango", que habilita elegir el rango a mano
 * (ver `CustomMonthRangeFields`, que se muestra al lado de este selector). Las
 * tortas de categorías no dependen de esto — siempre son del mes actual — así
 * que solo controla el gráfico de barras.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    // flex-wrap como red de seguridad: si algún día se agrega otra opción o
    // el texto no entra en una pantalla angosta, pasa a una segunda fila en
    // vez de desbordarse fuera de la tarjeta (como pasó con las stat cards).
    <div className="flex flex-wrap gap-2">
      {PRESET_OPTIONS.map((option) => (
        <PeriodButton key={option} isSelected={option === value} onClick={() => onChange(option)}>
          {option} meses
        </PeriodButton>
      ))}
      <PeriodButton isSelected={value === "custom"} onClick={() => onChange("custom")}>
        Seleccionar rango
      </PeriodButton>
    </div>
  );
}

function PeriodButton({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
      style={
        isSelected
          ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
          : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
      }
    >
      {children}
    </button>
  );
}
