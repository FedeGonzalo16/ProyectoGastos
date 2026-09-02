"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface PendingConfirm {
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  resolve: (confirmed: boolean) => void;
}

/**
 * Reemplaza `window.confirm()` por un modal con la estética de la app —
 * mismo uso que el nativo: `if (!(await confirm("¿Borrar?"))) return;`. El
 * componente `dialog` que devuelve hay que renderizarlo una vez en la
 * pantalla que use este hook (no hace nada si no hay ninguna confirmación pendiente).
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((message: string, options?: { confirmLabel?: string; variant?: "danger" | "default" }) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, resolve, ...options });
    });
  }, []);

  function respond(confirmed: boolean) {
    pending?.resolve(confirmed);
    setPending(null);
  }

  const dialog = pending ? (
    <ConfirmDialog
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      variant={pending.variant}
      onConfirm={() => respond(true)}
      onCancel={() => respond(false)}
    />
  ) : null;

  return { confirm, dialog };
}
