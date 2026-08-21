import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { formatArs } from "@/lib/format";

interface AmountRowProps {
  label: string;
  amount: number;
  /** `undefined` cuando el registro no tiene categoría — se pinta en gris neutro. */
  colorIndex?: number;
}

/** Fila "punto de color + nombre + monto en pesos", usada en los desgloses de Mensual. */
export function AmountRow({ label, amount, colorIndex }: AmountRowProps) {
  const dotColor = colorIndex !== undefined ? categoricalColorVar(colorIndex) : "var(--color-muted)";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{formatArs(amount)}</span>
    </div>
  );
}
