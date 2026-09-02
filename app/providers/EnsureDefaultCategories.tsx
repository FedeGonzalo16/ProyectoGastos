"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRepositories } from "@/hooks/useRepositories";
import { seedDefaultCategoriesIfEmpty } from "@/lib/repository/seedDefaults";
import { syncNow } from "@/lib/offline/syncEngine";

/**
 * Se asegura de que el usuario tenga categorías básicas apenas entra a la
 * app por primera vez. No renderiza nada — su única responsabilidad es
 * disparar el seed una vez que hay repositorios disponibles.
 *
 * Antes de decidir si hace falta sembrar, espera el primer intento de
 * sincronización (`syncNow`): si esta cuenta ya tenía categorías cargadas en
 * otro dispositivo, hay que bajarlas primero — si no, en un dispositivo
 * nuevo (recién logueado, storage local vacío) `categories.list()` daba 0
 * ANTES de que el pull terminara, y se sembraba un segundo juego completo de
 * categorías por encima del que ya existía. Si está offline, `syncNow` falla
 * rápido y se sigue sembrando igual — la app tiene que funcionar sin
 * conexión también para un usuario realmente nuevo.
 *
 * Si el seed sí creó categorías, dispara OTRA sincronización enseguida para
 * subirlas ya: el intento de `useAutoSync` (que también corre al montar) muy
 * probablemente ya pasó ANTES de que estas existieran, así que sin este
 * empujón quedarían encoladas localmente hasta el próximo ciclo automático
 * (cada 60s, ver `startAutoSync`) — bastante para notarlo como "no sincronizó".
 */
export function EnsureDefaultCategories() {
  const { supabase, user } = useAuth();
  const { categories } = useRepositories();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    syncNow(supabase).finally(() => {
      if (cancelled) return;
      const didSeed = seedDefaultCategoriesIfEmpty(categories);
      if (didSeed) void syncNow(supabase);
    });

    return () => {
      cancelled = true;
    };
    // Corre de nuevo si cambia el usuario (login con otra cuenta) o el
    // repositorio de categorías.
  }, [supabase, user, categories]);

  return null;
}
