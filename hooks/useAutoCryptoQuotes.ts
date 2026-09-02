"use client";

import { useEffect, useState } from "react";
import { fetchCryptoPricesUsd } from "@/lib/crypto/cryptoPriceApi";
import { autoQuoteCandidates, returnPercentageFromLivePrice } from "@/lib/aggregations/investmentSummary";
import type { Investment } from "@/lib/types";

export interface AutoQuoteResult {
  investmentId: string;
  returnPercentage: number;
}

/**
 * Cotización automática de cripto (CoinGecko, gratis, sin clave) para las
 * compras con cantidad + símbolo de mercado reconocido (ver
 * `autoQuoteCandidates` / `lib/crypto/coinGeckoIds.ts`) — el resto de las
 * posiciones (ETF, moneda, otro, o cripto sin esos datos) sigue con % de
 * rendimiento manual como antes.
 *
 * No persiste nada por sí solo: devuelve el % ya calculado por inversión
 * para que quien llama (Inversiones) lo guarde como una valuación más, igual
 * que si se hubiera cargado a mano.
 */
export function useAutoCryptoQuotes(investments: Investment[]) {
  const [results, setResults] = useState<AutoQuoteResult[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const candidates = autoQuoteCandidates(investments);
  // Clave estable derivada de los candidatos (no la lista de investments
  // completa): solo se vuelve a pedir la cotización si cambió QUÉ hay que
  // cotizar, no en cada re-render por otro motivo (ej. borrar un gasto).
  const candidatesKey = candidates.map((candidate) => `${candidate.investment.id}:${candidate.coinGeckoId}`).join(",");

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesKey]);

  async function refresh() {
    if (candidates.length === 0) {
      setResults([]);
      return;
    }

    setIsRefreshing(true);
    const ids = Array.from(new Set(candidates.map((candidate) => candidate.coinGeckoId)));
    const prices = await fetchCryptoPricesUsd(ids);
    setResults(
      candidates
        .filter((candidate) => prices[candidate.coinGeckoId] !== undefined)
        .map((candidate) => ({
          investmentId: candidate.investment.id,
          returnPercentage: returnPercentageFromLivePrice(candidate.investment, prices[candidate.coinGeckoId]),
        }))
    );
    setIsRefreshing(false);
  }

  return { results, refresh, isRefreshing, hasCandidates: candidates.length > 0 };
}
