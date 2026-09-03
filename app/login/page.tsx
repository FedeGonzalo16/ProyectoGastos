"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { CheckIcon } from "@/components/shared/icons";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

/** Un mail que ya se mandó y todavía se está esperando que el usuario lo abra. */
interface PendingConfirmation {
  kind: "recovery" | "sign-up";
  email: string;
}

/**
 * Pantalla de login. Como la app es de un solo usuario, no hace falta nada
 * más elaborado que email + contraseña: "Crear cuenta" está pensado para la
 * primera vez que se usa la app, no para múltiples usuarios registrándose.
 * "Olvidé mi contraseña" manda un mail con un link a `/reset-password` — se
 * le dio más peso visual a ese link a propósito, para que no pase
 * desapercibido (antes quedaba como un texto gris más, casi invisible).
 *
 * Registrarse también manda un mail (de confirmación, lo exige el proyecto
 * de Supabase) — se avisa ANTES de mandarlo (texto debajo del botón) y
 * DESPUÉS con una pantalla de "revisá tu mail", igual que "olvidé mi
 * contraseña". Sin esto, `signUp` no devuelve error pero tampoco una sesión
 * activa — mandar derecho a "/" hacía que `RequireAuth` rebotara de vuelta a
 * `/login` sin ninguna explicación de qué había pasado.
 */
export default function LoginPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Solo se pide/usa en el registro — confirma que no haya un typo en la
  // contraseña antes de mandarla (ahí no hay forma de "verla" para revisarla).
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

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
      setPendingConfirmation({ kind: "recovery", email });
      return;
    }

    if (mode === "sign-up") {
      if (password !== confirmPassword) {
        setIsSubmitting(false);
        setErrorMessage("Las contraseñas no coinciden.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      setIsSubmitting(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      // Sin sesión = el proyecto exige confirmar el mail antes de poder
      // entrar (lo normal) — todavía no hay nada para hacer acá.
      if (!data.session) {
        setPendingConfirmation({ kind: "sign-up", email });
        return;
      }
      router.push("/");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    setPendingConfirmation(null);
    setConfirmPassword("");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{
        background: "radial-gradient(circle at 50% -10%, var(--color-brand-soft), transparent 60%), var(--color-bg)",
      }}
    >
      <div className="chart-fade-in w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border p-6"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="mb-5 flex flex-col items-center gap-3 border-b pb-5 text-center" style={{ borderColor: "var(--color-border)" }}>
            {/* `unoptimized`: es un SVG local chico, no hace falta que el optimizador de imágenes de Next lo procese. */}
            <Image src="/icon.svg" alt="" width={56} height={56} unoptimized className="rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }} />
            <div>
              <h1 className="font-heading text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
                Gastos App
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {mode === "sign-in" && "Iniciá sesión para continuar"}
                {mode === "sign-up" && "Creá tu cuenta"}
                {mode === "forgot-password" && "Te vamos a mandar un mail para elegir una nueva contraseña"}
              </p>
            </div>
          </div>

          {pendingConfirmation ? (
            <>
              <p
                className="flex items-start gap-2 rounded-xl p-3 text-sm"
                style={{ background: "color-mix(in srgb, var(--color-good) 12%, transparent)", color: "var(--color-good)" }}
              >
                <CheckIcon className="mt-0.5 shrink-0" />
                {pendingConfirmation.kind === "recovery" ? (
                  <>Listo — revisá tu mail ({pendingConfirmation.email}) y seguí el link para elegir una contraseña nueva.</>
                ) : (
                  <>
                    Te mandamos un mail a {pendingConfirmation.email} para confirmar tu cuenta — abrí el link y después volvé
                    acá para iniciar sesión.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className="mt-3.5 w-full text-center text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--color-brand)" }}
              >
                ← Volver a iniciar sesión
              </button>
            </>
          ) : (
            <>
              <label className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>
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

              {mode === "sign-up" && (
                <label className="mt-3 block text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Repetir contraseña
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
                  />
                </label>
              )}

              {mode === "sign-up" && (
                <p className="mt-2.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  Te vamos a mandar un mail para confirmar la cuenta — hasta que no lo confirmes, no vas a poder iniciar
                  sesión.
                </p>
              )}

              {errorMessage && (
                <p
                  className="mt-3 rounded-xl p-2.5 text-xs"
                  style={{ background: "color-mix(in srgb, var(--chart-8) 12%, transparent)", color: "var(--chart-8)" }}
                >
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

              {mode === "sign-in" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot-password")}
                  className="mt-3.5 w-full text-center text-xs font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--color-brand)" }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              {mode === "forgot-password" && (
                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="mt-3.5 w-full text-center text-xs font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--color-brand)" }}
                >
                  ← Volver a iniciar sesión
                </button>
              )}

              {mode !== "forgot-password" && (
                <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")}
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {mode === "sign-up" ? (
                      <>
                        ¿Ya tenés cuenta?{" "}
                        <span className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-brand)" }}>
                          Iniciá sesión
                        </span>
                      </>
                    ) : (
                      <>
                        ¿Primera vez acá?{" "}
                        <span className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-brand)" }}>
                          Creá tu cuenta
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </main>
  );
}
