"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { startAutoSync } from "@/lib/offline/syncEngine";

/**
 * Arranca la sincronización automática (subir la cola pendiente + bajar
 * cambios remotos) mientras haya un usuario logueado, y la apaga si el
 * usuario cierra sesión o el componente se desmonta. Se llama una sola vez
 * cerca de la raíz de la app (ver `app/layout.tsx`) — las pantallas no
 * necesitan saber que esto existe, los repositorios ya asumen que hay algo
 * drenando la cola en segundo plano.
 */
export function useAutoSync(): void {
  const { supabase, user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const stopAutoSync = startAutoSync(supabase);
    return stopAutoSync;
  }, [supabase, user]);
}
