import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Route Handlers y Server Actions.
 *
 * Lee y escribe la sesión del usuario a través de las cookies de la request
 * actual — es lo que permite que el login persista entre navegaciones del lado
 * del servidor. El `try/catch` al escribir cookies existe porque Next.js no
 * permite modificarlas desde un Server Component puro (solo desde una Server
 * Action o un Route Handler); en ese caso el middleware (`middleware.ts`) es
 * quien se encarga de refrescarlas.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: no se puede escribir la cookie
            // acá, pero el middleware la refresca en la siguiente request.
          }
        },
      },
    }
  );
}
