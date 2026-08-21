"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { useAutoSync } from "@/hooks/useAutoSync";

/**
 * Arranca la sincronización automática una vez que `AuthProvider` ya sabe
 * quién es el usuario. Es un componente aparte (en vez de meter el hook
 * directo en `AppProviders`) para que su única responsabilidad sea esa —
 * no renderiza nada propio, solo `children`.
 */
function AutoSyncBoundary({ children }: { children: ReactNode }) {
  useAutoSync();
  return children;
}

/**
 * Junta todos los providers globales de la app en un solo componente para
 * que `app/layout.tsx` no tenga que saber cuántos hay ni en qué orden van.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AutoSyncBoundary>{children}</AutoSyncBoundary>
    </AuthProvider>
  );
}
