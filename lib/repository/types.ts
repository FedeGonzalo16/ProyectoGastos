import type { BaseRecord } from "@/lib/types";

/**
 * Contrato que usan las pantallas para leer/escribir datos.
 *
 * Los componentes dependen únicamente de esta interfaz, nunca de Supabase ni
 * de localStorage directamente (principio de inversión de dependencias): así
 * el día de mañana se podría cambiar cómo se guardan los datos sin tocar una
 * sola pantalla.
 */
export interface Repository<T extends BaseRecord> {
  /** Lee todos los registros del usuario desde la copia local (instantáneo). */
  list(): T[];

  /** Crea un registro nuevo: lo guarda local y lo encola para subir a Supabase. */
  create(input: Omit<T, keyof BaseRecord>): T;

  /** Edita un registro existente. Devuelve `undefined` si no se encontró. */
  update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): T | undefined;

  /** Borra un registro (local + encola el borrado remoto). */
  remove(id: string): void;
}
