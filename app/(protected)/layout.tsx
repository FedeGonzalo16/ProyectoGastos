import { AppProviders } from "@/app/providers/AppProviders";
import { RequireAuth } from "@/app/providers/RequireAuth";
import { EnsureDefaultCategories } from "@/app/providers/EnsureDefaultCategories";
import { AppLockGate } from "@/components/applock/AppLockGate";
import { BottomNav } from "@/components/BottomNav";
import { SyncStatusChip } from "@/components/shared/SyncStatusChip";

// Mismo motivo que en app/login/layout.tsx: estas pantallas dependen de la
// sesión del usuario, no tiene sentido pre-generarlas como HTML estático.
export const dynamic = "force-dynamic";

/**
 * Layout de todas las pantallas que necesitan sesión (Dashboard, Gastos,
 * Mensual, Inversiones). `/login` queda fuera de este grupo a propósito, así
 * no exige estar logueado para poder loguearse. `AppProviders` (Supabase +
 * sincronización automática) se declara acá y no en la raíz, para que el
 * resto del sitio no dependa de tener credenciales de Supabase.
 */
export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <AppProviders>
      <RequireAuth>
        <AppLockGate>
          <div className="mx-auto flex min-h-screen w-full max-w-97.5 flex-1 flex-col">
            <EnsureDefaultCategories />
            <SyncStatusChip />
            <div className="flex-1">{children}</div>
            <BottomNav />
          </div>
        </AppLockGate>
      </RequireAuth>
    </AppProviders>
  );
}
