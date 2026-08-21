"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { ThemeSwitcher } from "@/components/configuracion/ThemeSwitcher";

/**
 * Configuración: ajustes generales de la app, no de un módulo en particular
 * (por eso los gastos fijos NO viven acá — esos son parte del flujo de
 * Mensual, ver app/(protected)/gastos-fijos). Por ahora es solo apariencia
 * y cerrar sesión; es el lugar natural donde agregar futuros ajustes
 * globales (notificaciones, moneda por defecto, etc.).
 */
export default function ConfiguracionPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Configuración</h1>
      </header>

      <ThemeSwitcher />

      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-2xl border py-3 text-sm font-semibold"
        style={{ borderColor: "var(--color-border)", color: "var(--chart-8)" }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
