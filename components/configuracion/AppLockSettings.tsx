"use client";

import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useAppLock } from "@/hooks/useAppLock";
import { LockIcon } from "@/components/shared/icons";

const PIN_LENGTH = 4;

/**
 * Activar/cambiar/desactivar el bloqueo con PIN de este dispositivo (+ Face
 * ID/Touch ID opcional, si el dispositivo tiene lector biométrico) — ver
 * `hooks/useAppLock.ts` y el comentario de `lib/appLock/webauthn.ts` sobre
 * qué protege esto en realidad. Es por-dispositivo, igual que las
 * notificaciones push: activarlo acá no lo activa en otro dispositivo.
 */
export function AppLockSettings() {
  const { user } = useAuth();
  const { isPinConfigured, isBiometricConfigured, biometricAvailable, enablePin, disableLock, enableBiometric, disableBiometric } =
    useAppLock();

  const [isSettingPin, setIsSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  function resetPinForm() {
    setIsSettingPin(false);
    setNewPin("");
    setConfirmPin("");
    setPinError(null);
  }

  async function handleSavePin() {
    if (newPin.length !== PIN_LENGTH) {
      setPinError(`El PIN tiene que tener ${PIN_LENGTH} dígitos.`);
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Los dos PIN no coinciden.");
      return;
    }
    await enablePin(newPin);
    resetPinForm();
  }

  async function handleToggleBiometric() {
    if (isBiometricConfigured) {
      disableBiometric();
      return;
    }
    if (!user) return;

    setIsRegisteringBiometric(true);
    setBiometricError(null);
    const success = await enableBiometric(user.id, user.email ?? "GastosApp");
    setIsRegisteringBiometric(false);
    if (!success) setBiometricError("No se pudo activar — cancelaste el pedido o tu dispositivo no lo admite.");
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <LockIcon />
        Bloqueo de la app
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Pide un PIN al abrir la app en este dispositivo (y si estuvo un rato en
        segundo plano) — no protege contra un ataque real, solo evita que
        alguien con el teléfono desbloqueado vea los datos de un vistazo.
      </p>

      {!isPinConfigured && !isSettingPin && (
        <button
          type="button"
          onClick={() => setIsSettingPin(true)}
          className="mt-2.5 w-full rounded-xl py-2.5 text-xs font-semibold"
          style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
        >
          Activar PIN
        </button>
      )}

      {isSettingPin && (
        <div className="mt-2.5 flex flex-col gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={PIN_LENGTH}
            placeholder={`PIN de ${PIN_LENGTH} dígitos`}
            value={newPin}
            onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={PIN_LENGTH}
            placeholder="Repetí el PIN"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          {pinError && (
            <p className="text-[11px]" style={{ color: "var(--chart-8)" }}>
              {pinError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSavePin}
              className="flex-1 rounded-xl py-2 text-xs font-semibold text-white"
              style={{ background: "var(--color-brand)" }}
            >
              Guardar PIN
            </button>
            <button
              type="button"
              onClick={resetPinForm}
              className="rounded-xl px-3 py-2 text-xs"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isPinConfigured && !isSettingPin && (
        <div className="mt-2.5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsSettingPin(true)}
            className="w-full rounded-xl py-2.5 text-xs font-semibold"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Cambiar PIN
          </button>

          {biometricAvailable && (
            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={isRegisteringBiometric}
              className="w-full rounded-xl py-2.5 text-xs font-semibold disabled:opacity-60"
              style={
                isBiometricConfigured
                  ? { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }
                  : { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
              }
            >
              {isBiometricConfigured ? "Desactivar Face ID / Touch ID" : "Activar Face ID / Touch ID"}
            </button>
          )}
          {biometricError && (
            <p className="text-[11px]" style={{ color: "var(--chart-8)" }}>
              {biometricError}
            </p>
          )}

          <button
            type="button"
            onClick={disableLock}
            className="w-full rounded-xl py-2.5 text-xs font-semibold"
            style={{ color: "var(--chart-8)" }}
          >
            Desactivar bloqueo
          </button>
        </div>
      )}
    </section>
  );
}
