"use client";

import { RefreshIcon } from "@/components/shared/icons";

interface AutoQuoteStatusProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * Aviso chico de que hay posiciones con cotización automática (CoinGecko) —
 * solo se muestra si hay al menos una (ver `hasCandidates` en
 * `useAutoCryptoQuotes`). Mismo criterio visual que `ExchangeRateField`, pero
 * sin mostrar un precio propio: el resultado ya se ve en el % de cada
 * posición marcada "auto".
 */
export function AutoQuoteStatus({ isRefreshing, onRefresh }: AutoQuoteStatusProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
      style={{ background: "var(--color-brand-soft)" }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-brand)" }}>
          Cotización cripto
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {isRefreshing ? "Buscando precios en vivo…" : "Posiciones \"auto\" al día con CoinGecko"}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Actualizar cotizaciones cripto"
        title="Actualizar con CoinGecko"
        className="flex shrink-0 items-center justify-center disabled:opacity-50"
        style={{ color: "var(--color-brand)" }}
      >
        <RefreshIcon className={isRefreshing ? "animate-spin" : undefined} />
      </button>
    </div>
  );
}
