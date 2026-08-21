import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Client Components (código que corre en el navegador).
 *
 * Se crea una instancia nueva cada vez que se llama a esta función a propósito:
 * es una operación liviana y evita compartir estado entre distintos componentes
 * por accidente. `createBrowserClient` maneja solo la sesión vía cookies.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
