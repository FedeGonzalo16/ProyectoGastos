"use client";

import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { formatArs } from "@/lib/format";
import { RefreshIcon } from "@/components/shared/icons";

/**
 * Cotización del dólar blue de hoy — solo lectura (siempre viene de DolarAPI,
 * ver `useCurrentExchangeRate`), se usa para mostrar el total de la cartera
 * también en pesos. Con fondo propio a propósito: como bloque de texto chico
 * pasaba desapercibida — así se nota que hay un dato ahí, no solo un detalle.
 */
export function ExchangeRateField() {
  const { compra, venta, refresh, isRefreshing } = useCurrentExchangeRate();

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
      style={{ background: "var(--color-brand-soft)" }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-brand)" }}>
          Dólar blue
        </p>
        {compra !== null && venta !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Compra {formatArs(compra)} · Venta {formatArs(venta)}
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {isRefreshing ? "Buscando cotización…" : "No se pudo traer la cotización"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={isRefreshing}
        aria-label="Actualizar cotización"
        title="Actualizar con DolarAPI"
        className="flex shrink-0 items-center justify-center disabled:opacity-50"
        style={{ color: "var(--color-brand)" }}
      >
        <RefreshIcon className={isRefreshing ? "animate-spin" : undefined} />
      </button>
    </div>
  );
}
