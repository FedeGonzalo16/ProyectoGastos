import { AuthProvider } from "@/app/providers/AuthProvider";

// Esta pantalla depende de la sesión del navegador (Supabase Auth) y no
// tiene nada que ganar generándose como HTML estático en el build — al
// contrario, forzarla a "estática" haría que el build falle si todavía no
// se configuraron las variables de entorno de Supabase.
export const dynamic = "force-dynamic";

/**
 * `/login` solo necesita el cliente de Supabase para poder loguearse — no la
 * sincronización automática ni el guard de `RequireAuth` (sería absurdo
 * exigir estar logueado para entrar a loguearse).
 */
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <AuthProvider>{children}</AuthProvider>;
}
