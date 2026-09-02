/**
 * Config del bloqueo con PIN/Face ID — todo por-dispositivo, en
 * localStorage, igual que la cotización cacheada del dólar (nunca viaja a
 * Supabase: configurarlo en el celular no lo activa en la compu, mismo
 * criterio que las notificaciones push).
 */

const STORAGE_KEY = "gastosapp:appLock";

interface StoredAppLock {
  pinHash: string;
  webAuthnCredentialId?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read(): StoredAppLock | null {
  if (!isBrowser()) return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<StoredAppLock>;
    return typeof parsed.pinHash === "string" ? (parsed as StoredAppLock) : null;
  } catch {
    return null;
  }
}

function write(value: StoredAppLock | null): void {
  if (!isBrowser()) return;
  if (value === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
}

export function getPinHash(): string | null {
  return read()?.pinHash ?? null;
}

export function setPinHash(pinHash: string): void {
  const current = read();
  write({ pinHash, webAuthnCredentialId: current?.webAuthnCredentialId });
}

export function getWebAuthnCredentialId(): string | null {
  return read()?.webAuthnCredentialId ?? null;
}

/** No hace nada si todavía no hay un PIN — Face ID siempre necesita el PIN como respaldo. */
export function setWebAuthnCredentialId(webAuthnCredentialId: string): void {
  const current = read();
  if (!current) return;
  write({ pinHash: current.pinHash, webAuthnCredentialId });
}

export function clearWebAuthnCredential(): void {
  const current = read();
  if (!current) return;
  write({ pinHash: current.pinHash });
}

/** Desactiva el bloqueo por completo (PIN y Face ID, si estaba). */
export function clearAppLock(): void {
  write(null);
}
