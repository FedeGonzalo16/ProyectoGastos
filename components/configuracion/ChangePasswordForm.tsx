"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { CheckIcon, LockIcon } from "@/components/shared/icons";
import { PasswordField } from "@/components/shared/PasswordField";

/**
 * Cambiar la contraseña estando ya logueado — distinto del flujo de "olvidé
 * mi contraseña" (`/login` → mail → `/reset-password`), que es para cuando
 * no podés entrar. Este solo necesita `updateUser`, ya hay una sesión activa.
 */
export function ChangePasswordForm() {
  const { supabase } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage("Contraseña actualizada.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <LockIcon />
        Cambiar contraseña
      </p>

      <PasswordField label="Contraseña nueva" value={newPassword} onChange={setNewPassword} labelClassName="mt-3 block text-[10.5px]" />

      <PasswordField
        label="Repetir contraseña"
        value={confirmPassword}
        onChange={setConfirmPassword}
        labelClassName="mt-2.5 block text-[10.5px]"
      />

      {errorMessage && (
        <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--chart-8)" }}>
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--color-good)" }}>
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--color-brand)" }}
      >
        <CheckIcon />
        Guardar contraseña
      </button>
    </form>
  );
}
