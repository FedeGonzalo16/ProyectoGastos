"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Único lugar de la app que sabe cómo obtener la sesión del usuario logueado.
 * Todo lo demás (repositorios, sincronización, pantallas) recibe el usuario
 * a través de `useAuth()` en vez de hablar con Supabase Auth directamente.
 */
interface AuthContextValue {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  /** true mientras se está resolviendo si hay una sesión guardada o no. */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // useMemo evita crear un cliente nuevo en cada render.
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1) Sesión que ya pueda existir (usuario que refresca la página logueado).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 2) Cambios posteriores: login, logout, refresh de token.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  const value: AuthContextValue = {
    supabase,
    session,
    user: session?.user ?? null,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para leer la sesión/usuario actual desde cualquier Client Component. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
