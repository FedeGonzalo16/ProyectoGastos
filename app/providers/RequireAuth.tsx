"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

/**
 * Envuelve las pantallas que necesitan un usuario logueado. Si todavía no se
 * sabe si hay sesión, no muestra nada (evita un parpadeo mostrando contenido
 * que en seguida se reemplaza por el login); si ya se sabe que no hay
 * usuario, redirige a `/login`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  return children;
}
