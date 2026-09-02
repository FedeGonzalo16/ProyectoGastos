"use client";

import { useSyncStatus } from "@/hooks/useSyncStatus";

/**
 * Chip chico que avisa cuando algo no está "todo al día": sin conexión, o
 * subiendo cambios pendientes. No muestra nada cuando ya está todo
 * sincronizado — solo aparece cuando hay algo que el usuario debería saber.
 */
export function SyncStatusChip() {
  const status = useSyncStatus();

  if (status === "synced") return null;

  const label = status === "offline" ? "Sin conexión" : "Sincronizando…";
  const dotColor = status === "offline" ? "var(--color-muted)" : "var(--color-brand)";

  return (
    <div
      className="fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold shadow-sm"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor, animation: status === "syncing" ? "gastosapp-pulse 1.2s ease-in-out infinite" : undefined }}
      />
      {label}
    </div>
  );
}
