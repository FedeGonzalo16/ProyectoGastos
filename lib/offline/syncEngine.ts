import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaseRecord } from "@/lib/types";
import { readAll, upsertMany } from "@/lib/offline/localStore";
import { QUEUE_CHANGED_EVENT, readQueue, removeFromQueue, type QueueEntry } from "@/lib/offline/syncQueue";
import { isOnline, subscribeToOnline } from "@/lib/offline/connectivity";

/**
 * Motor de sincronización: la única pieza que efectivamente habla con
 * Supabase para poner al día la copia local y subir los cambios pendientes.
 *
 * Reglas simples a propósito (la app es de un solo usuario, no hace falta
 * resolver conflictos entre varios editores):
 *  - Subir (push) siempre va antes que bajar (pull), así un cambio hecho
 *    offline no se pisa con lo que ya había en el servidor.
 *  - Para decidir qué versión de un registro vale, se usa "el que tiene
 *    updated_at más reciente gana" (ver `mergeRemoteRecord`).
 */

/** Todas las tablas que participan del modo offline. */
export const SYNCED_TABLES = [
  "categories",
  "fixed_expenses",
  "expenses",
  "fixed_incomes",
  "incomes",
  "investments",
  "investment_valuations",
  "category_budgets",
  "investment_goals",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/**
 * Sube al servidor una sola operación de la cola.
 * Devuelve true si se pudo aplicar (y por lo tanto ya se puede sacar de la
 * cola), false si falló por falta de conexión (hay que reintentarla después).
 */
async function applyQueueEntry(
  supabase: SupabaseClient,
  entry: QueueEntry
): Promise<boolean> {
  const table = supabase.from(entry.table);

  if (entry.operation === "upsert" && !entry.payload) {
    // No debería pasar nunca: `createRepository` siempre completa el payload
    // para un "upsert". Se descarta la entrada en vez de reintentarla para
    // siempre con datos que nunca van a estar.
    console.warn(`[sync] se descartó un "upsert" sin payload en "${entry.table}"`);
    return true;
  }

  const { error } =
    entry.operation === "upsert"
      ? await table.upsert(entry.payload!)
      : await table.delete().eq("id", entry.recordId);

  if (!error) return true;

  // Un error de red significa "seguimos offline": dejamos la entrada en la
  // cola para reintentarla más adelante. Cualquier otro error (ej. una
  // validación que rechaza la base) no se va a arreglar solo reintentando,
  // así que se descarta la entrada para no bloquear el resto de la cola.
  const isNetworkError = error.message?.toLowerCase().includes("fetch");
  if (isNetworkError) return false;

  console.warn(`[sync] se descartó una operación de "${entry.table}":`, error.message);
  return true;
}

/** Sube en orden todas las operaciones pendientes de la cola. */
export async function flushPendingChanges(supabase: SupabaseClient): Promise<void> {
  for (const entry of readQueue()) {
    const applied = await applyQueueEntry(supabase, entry);
    if (!applied) break; // sin conexión: se detiene y se reintenta en el próximo sync
    removeFromQueue(entry.queueEntryId);
  }
}

/**
 * Decide si conviene reemplazar el registro local por la versión que vino
 * del servidor: solo si no hay una versión local más nueva (por ejemplo, un
 * cambio hecho offline que todavía no se subió).
 */
function isRemoteNewer<T extends BaseRecord>(local: T | undefined, remote: T): boolean {
  if (!local) return true;
  return new Date(remote.updated_at) > new Date(local.updated_at);
}

/** Trae de Supabase los registros de una tabla y actualiza la copia local. */
async function pullTable(supabase: SupabaseClient, table: SyncedTable): Promise<void> {
  const { data, error } = await supabase.from(table).select("*");
  if (error || !data) return;

  const pendingRecordIds = new Set(
    readQueue()
      .filter((entry) => entry.table === table)
      .map((entry) => entry.recordId)
  );
  // Mapa en vez de buscar con `.find()` dentro del loop: con `.find()`, cada
  // registro remoto recorre TODA la copia local para encontrar su par (ej.
  // 1000 registros = hasta 1.000.000 de comparaciones en cada pull) — acá es
  // una sola lectura y cada búsqueda es instantánea, sin importar cuántos
  // registros haya.
  const localById = new Map(readAll<BaseRecord>(table).map((record) => [record.id, record]));

  // Se juntan los cambios y se escriben todos juntos al final
  // (`upsertMany`) en vez de uno por uno — evita releer/reescribir la tabla
  // completa una vez por cada registro que cambió.
  const changedRecords: BaseRecord[] = [];
  for (const remoteRecord of data as BaseRecord[]) {
    // Si hay un cambio local todavía sin subir para este registro, no lo
    // pisamos con lo que bajó del servidor — se resuelve solo en el próximo
    // pull, una vez que ese cambio se haya subido.
    if (pendingRecordIds.has(remoteRecord.id)) continue;

    if (isRemoteNewer(localById.get(remoteRecord.id), remoteRecord)) {
      changedRecords.push(remoteRecord);
    }
  }
  upsertMany(table, changedRecords);
}

/** Ciclo completo de sincronización: primero sube lo pendiente, después baja lo nuevo. */
export async function syncNow(supabase: SupabaseClient): Promise<void> {
  if (!isOnline()) return;

  await flushPendingChanges(supabase);
  await Promise.all(SYNCED_TABLES.map((table) => pullTable(supabase, table)));
}

/**
 * Pone en marcha la sincronización automática: corre una vez al montar,
 * de nuevo cada vez que el navegador recupera conexión, cada `intervalMs`
 * como red de seguridad (por si el evento "online" no llega, algo que pasa
 * en algunos navegadores/redes), y ADEMÁS apenas se encola un cambio nuevo
 * (crear/editar/borrar algo) — sin esto, un cambio quedaba esperando en la
 * cola hasta el próximo tick del intervalo (hasta 60s) antes de subirse, y
 * el chip de "Sincronizando..." quedaba prendido todo ese rato de más en
 * cada edición. Acá solo se sube lo pendiente (`flushPendingChanges`), no se
 * dispara además un pull completo de las 9 tablas en cada tecla — eso sigue
 * yendo por el intervalo/reconexión, más que suficiente para bajar cambios
 * de otro dispositivo. Devuelve una función de limpieza para el cleanup de
 * un `useEffect`.
 */
export function startAutoSync(supabase: SupabaseClient, intervalMs = 60_000): () => void {
  void syncNow(supabase);

  const unsubscribeFromOnline = subscribeToOnline(() => void syncNow(supabase));
  const intervalId = setInterval(() => void syncNow(supabase), intervalMs);

  function handleQueueChanged() {
    void flushPendingChanges(supabase);
  }
  window.addEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);

  return () => {
    unsubscribeFromOnline();
    clearInterval(intervalId);
    window.removeEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);
  };
}
