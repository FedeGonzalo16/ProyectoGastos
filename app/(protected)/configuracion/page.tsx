"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { ThemeSwitcher } from "@/components/configuracion/ThemeSwitcher";
import { AppLockSettings } from "@/components/configuracion/AppLockSettings";
import { ChangePasswordForm } from "@/components/configuracion/ChangePasswordForm";
import { NotificationsToggle } from "@/components/configuracion/NotificationsToggle";
import { DataExport } from "@/components/configuracion/DataExport";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { LogOutIcon } from "@/components/shared/icons";

/**
 * Configuración: ajustes generales de la app, no de un módulo en particular
 * (por eso los gastos fijos NO viven acá — esos son parte del flujo de
 * Mensual, ver app/(protected)/gastos-fijos). Apariencia, contraseña y
 * cerrar sesión son ajustes de cuenta/app en general; es el lugar natural
 * para agregar futuros ajustes globales (notificaciones, moneda por
 * defecto, etc.).
 */
export default function ConfiguracionPage() {
  const { supabase, user } = useAuth();
  const router = useRouter();
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // `scope: "global"` invalida la sesión en todos los dispositivos, no solo
  // en este — a diferencia del signOut normal, que por defecto es "local"
  // (solo cierra la sesión de este navegador).
  async function handleSignOutEverywhere() {
    const confirmed = await confirm("¿Cerrar sesión en todos los dispositivos donde esté abierta esta cuenta?", {
      confirmLabel: "Cerrar sesión",
      variant: "default",
    });
    if (!confirmed) return;

    setIsSigningOutEverywhere(true);
    await supabase.auth.signOut({ scope: "global" });
    setIsSigningOutEverywhere(false);
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Configuración</h1>
      </header>

      {user?.email && (
        <div
          className="flex items-center gap-3 rounded-2xl border p-4"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: "var(--color-brand)" }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
          <p className="min-w-0 truncate text-sm font-medium">{user.email}</p>
        </div>
      )}

      <ThemeSwitcher />

      <AppLockSettings />

      <NotificationsToggle />

      <DataExport />

      <ChangePasswordForm />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border py-3 text-sm font-semibold"
          style={{ borderColor: "var(--color-border)", color: "var(--chart-8)" }}
        >
          <LogOutIcon />
          Cerrar sesión
        </button>

        <button
          type="button"
          onClick={handleSignOutEverywhere}
          disabled={isSigningOutEverywhere}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border py-3 text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--color-border)", color: "var(--chart-8)" }}
        >
          <LogOutIcon />
          Cerrar sesión en todos los dispositivos
        </button>
      </div>

      {dialog}
    </div>
  );
}
