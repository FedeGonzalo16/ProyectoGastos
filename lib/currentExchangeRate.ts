/**
 * Cotización del dólar blue (compra/venta) cacheada en este dispositivo —
 * siempre viene de DolarAPI (ver lib/exchangeRateApi.ts), ya no se edita a
 * mano. El caché es solo un respaldo para cuando no hay conexión al abrir la
 * app, no para persistir entre dispositivos ni forma parte de ningún registro
 * (no es la cotización con la que se cargó cada inversión, esa ya se guarda
 * por separado en cada una).
 */

const STORAGE_KEY = "gastosapp:currentExchangeRate";

export interface CachedExchangeRate {
  compra: number;
  venta: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getCachedExchangeRate(): CachedExchangeRate | null {
  if (!isBrowser()) return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<CachedExchangeRate>;
    if (typeof parsed.compra === "number" && typeof parsed.venta === "number" && parsed.compra > 0 && parsed.venta > 0) {
      return { compra: parsed.compra, venta: parsed.venta };
    }
  } catch {
    // Dato viejo con el formato anterior (un solo número) — se ignora, se vuelve a pedir a la API.
  }
  return null;
}

export function setCachedExchangeRate(value: CachedExchangeRate): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
