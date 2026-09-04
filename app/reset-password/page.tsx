"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { PasswordField } from "@/components/shared/PasswordField";

/**
 * Pantalla a la que llega el link del mail de "olvidé mi contraseña".
 * Supabase ya arma una sesión de recuperación al abrir ese link (lee el
 * token de la URL), así que alcanza con pedir la contraseña nueva y llamar
 * a `updateUser` — no hace falta manejar el token a mano.
 */
export default function ResetPasswordPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <h1 className="font-heading text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
          Elegí una contraseña nueva
        </h1>

        <PasswordField label="Contraseña nueva" value={password} onChange={setPassword} labelClassName="mt-5 block text-xs" />

        {errorMessage && (
          <p className="mt-3 text-xs" style={{ color: "var(--chart-8)" }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--color-brand)" }}
        >
          Guardar contraseña
        </button>
      </form>
    </main>
  );
}
