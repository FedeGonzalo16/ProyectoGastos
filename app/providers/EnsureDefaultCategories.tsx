"use client";

import { useEffect } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { seedDefaultCategoriesIfEmpty } from "@/lib/repository/seedDefaults";

/**
 * Se asegura de que el usuario tenga categorías básicas apenas entra a la
 * app por primera vez. No renderiza nada — su única responsabilidad es
 * disparar el seed una vez que hay repositorios disponibles.
 */
export function EnsureDefaultCategories() {
  const { categories } = useRepositories();

  useEffect(() => {
    seedDefaultCategoriesIfEmpty(categories);
    // Solo debe correr cuando cambia el repositorio (o sea, cuando cambia el
    // usuario), no en cada render.
  }, [categories]);

  return null;
}
