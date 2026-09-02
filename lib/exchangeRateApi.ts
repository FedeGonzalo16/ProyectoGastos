/**
 * Cotización pública del dólar vía DolarAPI (https://dolarapi.com) — no
 * necesita cuenta ni clave. "blue" es la referencia informal que más se usa
 * para ahorros/inversiones en pesos; si en algún momento se prefiere otra
 * (oficial, mep, cripto...), alcanza con cambiar esta constante.
 */
const DOLAR_API_CASA = "blue";

export interface DolarRate {
  compra: number;
  venta: number;
}

/**
 * Compra y venta del dólar blue de hoy. `null` si falla (sin conexión, la
 * API está caída, cambió de forma, etc.) — quien llama decide qué hacer en
 * ese caso (típicamente, quedarse con lo último cacheado).
 */
export async function fetchCurrentExchangeRate(): Promise<DolarRate | null> {
  try {
    const response = await fetch(`https://dolarapi.com/v1/dolares/${DOLAR_API_CASA}`);
    if (!response.ok) return null;

    const data = (await response.json()) as Partial<DolarRate>;
    if (typeof data.compra === "number" && typeof data.venta === "number" && data.compra > 0 && data.venta > 0) {
      return { compra: data.compra, venta: data.venta };
    }
    return null;
  } catch {
    return null;
  }
}
