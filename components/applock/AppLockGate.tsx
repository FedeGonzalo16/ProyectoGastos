"use client";

import type { ReactNode } from "react";
import { useAppLock } from "@/hooks/useAppLock";
import { AppLockScreen } from "@/components/applock/AppLockScreen";

/**
 * Envuelve toda la app protegida: si hay un PIN configurado en este
 * dispositivo y todavía no se desbloqueó (recién abierta, o volvió de 2°
 * plano después de un rato — ver `useAppLock`), tapa el contenido con la
 * pantalla de bloqueo. Si nunca se activó un PIN, no hace nada — queda
 * completamente invisible, el resto de la app funciona igual que siempre.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { isPinConfigured, isBiometricConfigured, biometricAvailable, isLocked, unlockWithPin, unlockWithBiometric } = useAppLock();

  if (isPinConfigured && isLocked) {
    return (
      <AppLockScreen
        onUnlockWithPin={unlockWithPin}
        onUnlockWithBiometric={unlockWithBiometric}
        showBiometricButton={biometricAvailable && isBiometricConfigured}
      />
    );
  }

  return <>{children}</>;
}
