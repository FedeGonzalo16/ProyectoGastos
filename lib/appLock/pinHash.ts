/**
 * Hashea el PIN con SHA-256 (Web Crypto, nativo del navegador) antes de
 * guardarlo — nunca se guarda en texto plano, ni siquiera en este mismo
 * dispositivo. No es para protegerse de un atacante sofisticado (ver el
 * comentario de lib/appLock/webauthn.ts: esto es un bloqueo LOCAL, no
 * reemplaza el login de Supabase que ya protege los datos del lado del
 * servidor) — alcanza para que el PIN no quede a la vista en el storage.
 */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
