import { AuthProvider } from "@/app/providers/AuthProvider";

// Igual que /login: depende de la sesión de recuperación que Supabase arma
// al abrir el link del mail, no tiene sentido pre-generarla como HTML
// estático en el build.
export const dynamic = "force-dynamic";

/**
 * `/reset-password` es donde cae el link que manda el mail de "olvidé mi
 * contraseña" — necesita el cliente de Supabase, pero no `RequireAuth` (a
 * quien llega desde el mail todavía no tiene una sesión "normal", solo la de
 * recuperación que arma Supabase al abrir el link).
 */
export default function ResetPasswordLayout({ children }: LayoutProps<"/reset-password">) {
  return <AuthProvider>{children}</AuthProvider>;
}
