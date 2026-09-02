/**
 * Precios de cripto en USD vía CoinGecko (https://www.coingecko.com/en/api) —
 * API pública gratis, no necesita cuenta ni clave, mismo criterio que
 * lib/exchangeRateApi.ts para el dólar. Se pide por "id" de CoinGecko (no el
 * ticker) — ver lib/crypto/coinGeckoIds.ts para la conversión.
 */

/**
 * Precio actual (USD) de cada id pedido. Los que no vinieron en la respuesta
 * (id no reconocido por CoinGecko, o falló del todo) simplemente no
 * aparecen en el resultado — quien llama decide qué hacer con lo que falta
 * (típicamente, dejar esa posición con su último % manual/automático).
 */
export async function fetchCryptoPricesUsd(coinGeckoIds: string[]): Promise<Record<string, number>> {
  if (coinGeckoIds.length === 0) return {};

  try {
    const idsParam = encodeURIComponent(coinGeckoIds.join(","));
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`);
    if (!response.ok) return {};

    const data = (await response.json()) as Record<string, { usd?: number } | undefined>;
    const prices: Record<string, number> = {};
    for (const id of coinGeckoIds) {
      const price = data[id]?.usd;
      if (typeof price === "number" && price > 0) prices[id] = price;
    }
    return prices;
  } catch {
    return {};
  }
}
