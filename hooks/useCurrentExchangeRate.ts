"use client";

import { useEffect, useState } from "react";
import { getCachedExchangeRate, setCachedExchangeRate } from "@/lib/currentExchangeRate";
import { fetchCurrentExchangeRate } from "@/lib/exchangeRateApi";

/**
 * Cotización del dólar blue (compra/venta) — siempre de DolarAPI, ya no se
 * edita a mano. Se auto-carga al montar (mostrando primero lo cacheado en
 * este dispositivo si hay, para no arrancar vacía) y se puede refrescar a
 * pedido; si la API falla, queda lo último cacheado.
 *
 * `rate` (= venta) es el valor que usa el resto de la app para convertir
 * ARS→USD en los totales — "compra" es solo para mostrar.
 */
export function useCurrentExchangeRate() {
  const [compra, setCompra] = useState<number | null>(null);
  const [venta, setVenta] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const cached = getCachedExchangeRate();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage recién en el cliente, ver hooks/useTheme.ts
      setCompra(cached.compra);
      setVenta(cached.venta);
    }
    refresh();
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    const fetched = await fetchCurrentExchangeRate();
    if (fetched) {
      setCompra(fetched.compra);
      setVenta(fetched.venta);
      setCachedExchangeRate(fetched);
    }
    setIsRefreshing(false);
  }

  return { rate: venta, compra, venta, refresh, isRefreshing };
}
