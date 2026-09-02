/**
 * Face ID/Touch ID como atajo para desbloquear la app, vía WebAuthn (la API
 * del navegador para hablar con el lector biométrico del sistema operativo
 * — la misma tecnología de "iniciar sesión con tu huella" de muchos sitios).
 *
 * OJO — esto NO es una segunda autenticación verificada contra un servidor:
 * no hay backend propio guardando la clave pública ni validando la firma
 * que devuelve el dispositivo (eso haría falta para un login real). Acá
 * alcanza con que el navegador resuelva `credentials.get()` sin error, y
 * eso ya implica que el sistema operativo aprobó el Face ID/Touch ID —
 * porque esto es un bloqueo LOCAL (evitar que alguien con el teléfono
 * desbloqueado vea los datos a simple vista), no un reemplazo del login de
 * Supabase, que es quien de verdad protege los datos del lado del servidor.
 * El PIN sigue siendo el respaldo real (ver hooks/useAppLock.ts).
 *
 * Nota aparte: una credencial queda atada al origen (dominio) donde se creó
 * — una registrada en `localhost` no sirve en producción y viceversa, hay
 * que volver a activarla ahí.
 */

const RELYING_PARTY_NAME = "GastosApp";
const CHALLENGE_BYTES = 32;
const TIMEOUT_MS = 60_000;

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CHALLENGE_BYTES));
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** true si el dispositivo tiene un lector biométrico disponible (Face ID, Touch ID, Windows Hello...) y el navegador soporta WebAuthn. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Registra Face ID/Touch ID en este dispositivo. Devuelve el id de la credencial creada, o `null` si falló o el usuario canceló el pedido del sistema operativo. */
export async function registerBiometric(userId: string, userLabel: string): Promise<string | null> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge() as BufferSource,
        rp: { name: RELYING_PARTY_NAME },
        user: { id: new TextEncoder().encode(userId), name: userLabel, displayName: userLabel },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: TIMEOUT_MS,
      },
    })) as PublicKeyCredential | null;

    return credential ? base64UrlEncode(credential.rawId) : null;
  } catch {
    return null;
  }
}

/** Pide Face ID/Touch ID para desbloquear — `true` si el sistema operativo lo aprobó. */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge() as BufferSource,
        allowCredentials: [{ id: base64UrlDecode(credentialId) as BufferSource, type: "public-key" }],
        userVerification: "required",
        timeout: TIMEOUT_MS,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}
