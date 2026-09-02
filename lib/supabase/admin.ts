import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service-role key: bypassea Row Level Security por completo,
 * ve las filas de TODOS los usuarios. Es intencional — lo usa el chequeo de
 * notificaciones (`app/api/notifications/check`), que corre sin una sesión
 * de usuario y necesita mirar los datos de todas las cuentas para decidir a
 * quién avisarle qué.
 *
 * ⚠️ Nunca importar este archivo desde un componente cliente ni desde nada
 * que termine en el bundle del navegador — `SUPABASE_SERVICE_ROLE_KEY` es un
 * secreto de servidor (por eso no lleva el prefijo `NEXT_PUBLIC_`). Solo se
 * usa en Route Handlers.
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
