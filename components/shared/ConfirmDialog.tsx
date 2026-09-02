import { CheckIcon, TrashIcon, XIcon } from "@/components/shared/icons";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  /** "danger" (rojo) para borrar algo; "default" (verde de marca) para acciones consecuentes pero no destructivas. */
  variant?: "danger" | "default";
}

/**
 * Modal de confirmación con la estética de la app, para reemplazar
 * `window.confirm()` — ese cartel es del navegador, no de la app (se ve como
 * una alerta nativa de Safari), y rompe la sensación de estar en una PWA
 * propia. Se maneja con el hook `useConfirmDialog`, no se usa directo.
 */
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirmar", variant = "danger" }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onCancel}
    >
      <div
        className="chart-fade-in w-full max-w-sm rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm leading-snug">{message}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <XIcon />
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ background: variant === "danger" ? "var(--chart-8)" : "var(--color-brand)" }}
          >
            {variant === "danger" ? <TrashIcon /> : <CheckIcon />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
