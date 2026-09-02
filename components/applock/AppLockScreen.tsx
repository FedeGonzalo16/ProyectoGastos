"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

const PIN_LENGTH = 4;
// "" = hueco vacío (debajo del 7-8-9, a la izquierda del 0) para que el 0
// quede centrado como en cualquier teclado numérico.
const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

interface AppLockScreenProps {
  onUnlockWithPin: (pin: string) => Promise<boolean>;
  onUnlockWithBiometric: () => Promise<boolean>;
  /** Ya combina "el dispositivo tiene lector" + "hay Face ID activado" — si es `false`, no se muestra el botón. */
  showBiometricButton: boolean;
}

/**
 * Pantalla completa que tapa TODO el contenido protegido mientras la app
 * está bloqueada (ver `components/applock/AppLockGate.tsx`). "Olvidé mi
 * PIN" no intenta recuperarlo (es un bloqueo local, no hay nada que
 * recuperar del lado del servidor) — directamente cierra la sesión de
 * Supabase, así se puede volver a entrar desde cero.
 */
export function AppLockScreen({ onUnlockWithPin, onUnlockWithBiometric, showBiometricButton }: AppLockScreenProps) {
  const { supabase } = useAuth();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function handleDigit(digit: string) {
    if (isChecking || digit === "") return;

    if (digit === "⌫") {
      setPin((current) => current.slice(0, -1));
      setHasError(false);
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + digit;
    setPin(next);
    setHasError(false);

    if (next.length === PIN_LENGTH) {
      setIsChecking(true);
      const success = await onUnlockWithPin(next);
      setIsChecking(false);
      if (!success) {
        setHasError(true);
        setPin("");
      }
    }
  }

  async function handleBiometric() {
    const success = await onUnlockWithBiometric();
    if (!success) setHasError(true);
  }

  async function handleForgotPin() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="text-center">
        <p className="font-heading text-xl font-semibold">GastosApp</p>
        <p className="mt-1 text-xs" style={{ color: hasError ? "var(--chart-8)" : "var(--color-text-secondary)" }}>
          {hasError ? "PIN incorrecto, probá de nuevo" : "Ingresá tu PIN para continuar"}
        </p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className="h-3 w-3 rounded-full"
            style={{
              background: index < pin.length ? (hasError ? "var(--chart-8)" : "var(--color-brand)") : "transparent",
              border: `1.5px solid ${hasError ? "var(--chart-8)" : "var(--color-border)"}`,
            }}
          />
        ))}
      </div>

      <div className="grid w-52 grid-cols-3 gap-3">
        {KEYPAD_DIGITS.map((digit, index) => (
          <button
            key={index}
            type="button"
            disabled={digit === "" || isChecking}
            onClick={() => handleDigit(digit)}
            className="flex h-14 items-center justify-center rounded-full text-lg font-semibold"
            style={{
              background: digit === "" || digit === "⌫" ? "transparent" : "var(--color-card)",
              color: "var(--color-text)",
              visibility: digit === "" ? "hidden" : "visible",
            }}
          >
            {digit}
          </button>
        ))}
      </div>

      {showBiometricButton && (
        <button type="button" onClick={handleBiometric} className="text-sm font-semibold" style={{ color: "var(--color-brand)" }}>
          Usar Face ID / Touch ID
        </button>
      )}

      <button
        type="button"
        onClick={handleForgotPin}
        className="text-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        ¿Olvidaste el PIN? Cerrar sesión
      </button>
    </div>
  );
}
