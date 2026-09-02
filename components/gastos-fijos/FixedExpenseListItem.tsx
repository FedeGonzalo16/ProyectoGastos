import type { FixedExpense } from "@/lib/types";
import { formatArs } from "@/lib/format";
import { PencilIcon, TrashIcon } from "@/components/shared/icons";

interface FixedExpenseListItemProps {
  template: FixedExpense;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

/** Una fila de la lista de plantillas de gastos fijos, con sus acciones. */
export function FixedExpenseListItem({ template, onEdit, onToggleActive, onDelete }: FixedExpenseListItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium" style={{ opacity: template.active ? 1 : 0.5 }}>
            {template.name}
          </span>
          {!template.active && (
            <span
              className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              INACTIVO
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          {template.day_of_month !== null ? `Día ${template.day_of_month} · ` : ""}
          {formatArs(template.amount_estimate)}
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: "var(--color-brand)" }}
      >
        <PencilIcon />
        Editar
      </button>
      <button
        type="button"
        onClick={onToggleActive}
        className="text-[11px]"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {template.active ? "Desactivar" : "Activar"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 text-[11px]"
        style={{ color: "var(--chart-8)" }}
      >
        <TrashIcon />
        Borrar
      </button>
    </div>
  );
}
