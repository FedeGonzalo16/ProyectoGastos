/**
 * Cuánto tiempo en 2° plano (pantalla apagada, app minimizada) antes de
 * volver a pedir el PIN/Face ID al reabrir — 5 minutos, similar a lo que
 * suelen usar las apps de banco. No es configurable desde la UI hoy; si en
 * algún momento hace falta ajustarlo, alcanza con cambiar esta constante.
 */
export const REAUTH_THRESHOLD_MS = 5 * 60 * 1000;

/** true si pasó `thresholdMs` o más entre `hiddenAtMs` (cuándo quedó en 2° plano) y `nowMs` (ahora). */
export function shouldRelock(hiddenAtMs: number, nowMs: number, thresholdMs: number = REAUTH_THRESHOLD_MS): boolean {
  return nowMs - hiddenAtMs >= thresholdMs;
}
