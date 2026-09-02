import type { DueStatus } from "@/lib/dueStatus";
import { formatShortDate } from "@/lib/format";

interface DueStatusBadgeProps {
  status: DueStatus;
  /** Solo se usa cuando `status === "upcoming"`, para mostrar la fecha. */
  dueDate: string | null;
}

/**
 * Badge de vencimiento/pago de un gasto — mismo estilo de pill que ya usan
 * los badges "FIJO"/"INACTIVO", pero con color según el estado. No se
 * renderiza nada cuando `status === "none"` (gasto sin vencimiento).
 */
export function DueStatusBadge({ status, dueDate }: DueStatusBadgeProps) {
  if (status === "none") return null;

  const { label, color } =
    status === "paid"
      ? { label: "PAGADO", color: "var(--chart-3)" }
      : status === "overdue"
        ? { label: "VENCIDO", color: "var(--chart-8)" }
        : { label: `Vence ${dueDate ? formatShortDate(dueDate) : ""}`, color: "var(--color-text-secondary)" };

  return (
    <span
      className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
}
