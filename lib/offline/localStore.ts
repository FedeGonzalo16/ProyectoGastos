import type { BaseRecord } from "@/lib/types";

/**
 * Copia local de los datos, guardada en localStorage.
 *
 * Es la única responsabilidad de este archivo: leer y escribir arrays de
 * registros por "tabla" (mismo nombre que la tabla de Supabase). No sabe nada
 * de Supabase ni de sincronización — eso lo maneja `syncEngine.ts` y
 * `syncQueue.ts`, que usan estas funciones como base.
 *
 * Todas las funciones son no-op en el servidor (SSR) porque `localStorage`
 * no existe ahí; están pensadas para llamarse solo desde Client Components.
 */

const STORAGE_PREFIX = "gastosapp:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(table: string): string {
  return `${STORAGE_PREFIX}${table}`;
}

/** Lee todos los registros guardados localmente para una tabla. */
export function readAll<T>(table: string): T[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(storageKey(table));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    // Datos corruptos (poco probable, pero mejor no romper la app por esto).
    return [];
  }
}

/** Reemplaza por completo los registros locales de una tabla. */
export function writeAll<T>(table: string, records: T[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(storageKey(table), JSON.stringify(records));
}

/** Busca un registro por id dentro de una tabla. */
export function getOne<T extends BaseRecord>(table: string, id: string): T | undefined {
  return readAll<T>(table).find((record) => record.id === id);
}

/**
 * Inserta o actualiza un registro: si ya existe uno con el mismo id lo
 * reemplaza, si no lo agrega. Es la operación que usan tanto las escrituras
 * locales (crear/editar) como la sincronización al bajar datos del servidor.
 */
export function upsertOne<T extends BaseRecord>(table: string, record: T): void {
  const records = readAll<T>(table);
  const index = records.findIndex((existing) => existing.id === record.id);

  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }

  writeAll(table, records);
}

/** Saca un registro de la copia local por id. */
export function removeOne(table: string, id: string): void {
  const records = readAll<BaseRecord>(table).filter((record) => record.id !== id);
  writeAll(table, records);
}
