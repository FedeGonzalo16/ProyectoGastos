"use client";

import { usePushSubscription } from "@/hooks/usePushSubscription";
import { BellIcon } from "@/components/shared/icons";

/**
 * Activa/desactiva las notificaciones push de este dispositivo (vencimientos
 * de gastos, alertas de presupuesto — ver `app/api/notifications/check`).
 * Es por-dispositivo: activarlas en el celular no las activa en la compu.
 */
export function NotificationsToggle() {
  const { state, subscribe, unsubscribe } = usePushSubscription();

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <BellIcon />
        Notificaciones
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Vencimientos de gastos y alertas de presupuesto, en este dispositivo.
      </p>

      {state === "unsupported" ? (
        <p className="mt-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Este navegador no admite notificaciones. En iPhone, primero agregá la app a
          la pantalla de inicio (Compartir → Agregar a inicio) — no funcionan desde
          una pestaña de Safari sin instalar.
        </p>
      ) : (
        <button
          type="button"
          onClick={state === "subscribed" ? unsubscribe : subscribe}
          disabled={state === "loading"}
          className="mt-2.5 w-full rounded-xl py-2.5 text-xs font-semibold disabled:opacity-60"
          style={
            state === "subscribed"
              ? { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }
              : { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
          }
        >
          {state === "subscribed" ? "Desactivar notificaciones" : "Activar notificaciones"}
        </button>
      )}
    </section>
  );
}
