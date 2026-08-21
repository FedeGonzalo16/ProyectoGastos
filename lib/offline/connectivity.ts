/**
 * Detección de conexión a internet.
 *
 * Una sola responsabilidad: saber si hay conexión ahora, y avisar cuando
 * cambia. `syncEngine.ts` se suscribe a esto para saber cuándo intentar
 * sincronizar; nadie más necesita saber cómo se detecta la conectividad.
 */

export function isOnline(): boolean {
  // En el servidor no hay "conexión" que evaluar; se asume offline para que
  // nada intente pegarle a Supabase durante el render en el servidor.
  if (typeof navigator === "undefined") return false;
  return navigator.onLine;
}

/**
 * Ejecuta `onOnline` cada vez que el navegador vuelve a tener conexión.
 * Devuelve una función para des-suscribirse (llamarla en el cleanup de un
 * `useEffect`).
 */
export function subscribeToOnline(onOnline: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
