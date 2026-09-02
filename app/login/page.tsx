"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

/**
 * Pantalla de login. Como la app es de un solo usuario, no hace falta nada
 * más elaborado que email + contraseña: "Crear cuenta" está pensado para la
 * primera vez que se usa la app, no para múltiples usuarios registrándose.
 * "Olvidé mi contraseña" manda un mail con un link a `/reset-password`.
 */
export default function LoginPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    if (mode === "forgot-password") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setIsSubmitting(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setRecoveryEmailSent(true);
      return;
    }

    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/");
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setErrorMessage(null);
    setRecoveryEmailSent(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <h1 className="font-heading text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
          gastos
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {mode === "sign-in" && "Iniciá sesión para continuar"}
          {mode === "sign-up" && "Creá tu cuenta"}
          {mode === "forgot-password" && "Te mandamos un mail para elegir una nueva contraseña"}
        </p>

        {mode === "forgot-password" && recoveryEmailSent ? (
          <p className="mt-5 text-sm" style={{ color: "var(--color-good)" }}>
            Listo — revisá tu mail ({email}) y seguí el link para elegir una contraseña nueva.
          </p>
        ) : (
          <>
            <label className="mt-5 block text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
              />
            </label>

            {mode !== "forgot-password" && (
              <label className="mt-3 block text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
                />
              </label>
            )}

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
              {mode === "sign-in" && "Iniciar sesión"}
              {mode === "sign-up" && "Crear cuenta"}
              {mode === "forgot-password" && "Enviar instrucciones"}
            </button>
          </>
        )}

        {mode === "sign-in" && (
          <button
            type="button"
            onClick={() => switchMode("forgot-password")}
            className="mt-3 w-full text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button
          type="button"
          onClick={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")}
          className="mt-2 w-full text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {mode === "sign-up" ? "Ya tenés cuenta? Iniciá sesión" : "Primera vez acá? Creá tu cuenta"}
        </button>

        {mode === "forgot-password" && (
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="mt-2 w-full text-xs font-semibold"
            style={{ color: "var(--color-brand)" }}
          >
            Volver a iniciar sesión
          </button>
        )}
      </form>
    </main>
  );
}
