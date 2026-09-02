"use client";

import { useEffect, useState } from "react";
import { isOnline, subscribeToOffline, subscribeToOnline } from "@/lib/offline/connectivity";
import { QUEUE_CHANGED_EVENT, readQueue } from "@/lib/offline/syncQueue";

export type SyncStatus = "offline" | "syncing" | "synced";

/** Cada cuánto se revisa el estado como red de seguridad, además de los eventos. */
const FALLBACK_POLL_MS = 5000;

function computeStatus(): SyncStatus {
  if (!isOnline()) return "offline";
  return readQueue().length > 0 ? "syncing" : "synced";
}

/**
 * Estado de sincronización visible para el usuario: sin conexión, subiendo
 * cambios pendientes, o todo al día. Se arranca en "synced" (el valor que
 * también daría el servidor, que no tiene `navigator`) y el primer chequeo
 * real se hace en el efecto — así el primer render en el cliente no choca
 * con lo que ya se mandó desde el servidor.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("synced");

  useEffect(() => {
    const recompute = () => setStatus(computeStatus());

    // Primer chequeo real, recién posible en el cliente (ver comentario de arriba).
    recompute();

    const unsubscribeOnline = subscribeToOnline(recompute);
    const unsubscribeOffline = subscribeToOffline(recompute);
    window.addEventListener(QUEUE_CHANGED_EVENT, recompute);
    const intervalId = setInterval(recompute, FALLBACK_POLL_MS);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      window.removeEventListener(QUEUE_CHANGED_EVENT, recompute);
      clearInterval(intervalId);
    };
  }, []);

  return status;
}
