"use client";

import { useEffect, useState } from "react";
import { hashPin } from "@/lib/appLock/pinHash";
import {
  clearAppLock,
  clearWebAuthnCredential,
  getPinHash,
  getWebAuthnCredentialId,
  setPinHash as storePinHash,
  setWebAuthnCredentialId as storeWebAuthnCredentialId,
} from "@/lib/appLock/lockStorage";
import { isBiometricAvailable, registerBiometric, verifyBiometric } from "@/lib/appLock/webauthn";
import { shouldRelock } from "@/lib/appLock/reauthTiming";

/**
 * Bloqueo local de la app con PIN (+ Face ID/Touch ID opcional como atajo,
 * ver lib/appLock/webauthn.ts para qué protege esto en realidad) — nunca
 * pisa nada del login de Supabase, es una pantalla previa. Si nunca se
 * activó un PIN en este dispositivo, `isLocked` siempre da `false` — el
 * gate queda completamente invisible, no cambia nada de cómo funciona hoy.
 */
export function useAppLock() {
  const [pinHash, setPinHashState] = useState<string | null>(null);
  const [webAuthnCredentialId, setWebAuthnCredentialIdState] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const storedPinHash = getPinHash();
    // Recién se puede leer localStorage/WebAuthn del lado del cliente —
    // mismo patrón que useCurrentExchangeRate/useTheme.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinHashState(storedPinHash);
    setWebAuthnCredentialIdState(getWebAuthnCredentialId());
    setIsLocked(storedPinHash !== null);

    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Vuelve a bloquear si la app estuvo en 2° plano más del umbral (ver
  // reauthTiming.ts) — solo mientras haya un PIN configurado, si no no hay
  // nada que re-bloquear.
  useEffect(() => {
    if (!pinHash) return;

    let hiddenAt: number | null = null;
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && shouldRelock(hiddenAt, Date.now())) setIsLocked(true);
      hiddenAt = null;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pinHash]);

  async function unlockWithPin(pin: string): Promise<boolean> {
    if (!pinHash) return false;
    const success = (await hashPin(pin)) === pinHash;
    if (success) setIsLocked(false);
    return success;
  }

  async function unlockWithBiometric(): Promise<boolean> {
    if (!webAuthnCredentialId) return false;
    const success = await verifyBiometric(webAuthnCredentialId);
    if (success) setIsLocked(false);
    return success;
  }

  async function enablePin(pin: string): Promise<void> {
    const hash = await hashPin(pin);
    storePinHash(hash);
    setPinHashState(hash);
    setIsLocked(false);
  }

  /** Desactiva todo (PIN y Face ID) — no hay Face ID sin PIN de respaldo. */
  function disableLock(): void {
    clearAppLock();
    setPinHashState(null);
    setWebAuthnCredentialIdState(null);
    setIsLocked(false);
  }

  async function enableBiometric(userId: string, userLabel: string): Promise<boolean> {
    const credentialId = await registerBiometric(userId, userLabel);
    if (!credentialId) return false;
    storeWebAuthnCredentialId(credentialId);
    setWebAuthnCredentialIdState(credentialId);
    return true;
  }

  function disableBiometric(): void {
    clearWebAuthnCredential();
    setWebAuthnCredentialIdState(null);
  }

  return {
    isPinConfigured: pinHash !== null,
    isBiometricConfigured: webAuthnCredentialId !== null,
    biometricAvailable,
    isLocked,
    unlockWithPin,
    unlockWithBiometric,
    enablePin,
    disableLock,
    enableBiometric,
    disableBiometric,
  };
}
