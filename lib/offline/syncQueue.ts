/**
 * Cola de cambios pendientes de subir a Supabase.
 *
 * Cada vez que se crea, edita o borra un registro estando offline (o incluso
 * online, para no depender de la latencia de red), la operación se guarda acá
 * antes de intentar mandarla al servidor. La cola vive en localStorage, así
 * que sobrevive a un refresh de la página o a cerrar el navegador.
 *
 * Este archivo solo sabe guardar/leer/borrar entradas de la cola — no sabe
 * cómo mandarlas a Supabase, eso es trabajo de `syncEngine.ts`.
 */

export type QueueOperation = "upsert" | "delete";

export interface QueueEntry {
  /** Id propio de la entrada en la cola (no confundir con el id del registro). */
  queueEntryId: string;
  table: string;
  operation: QueueOperation;
  recordId: string;
  /** Solo presente en operaciones "upsert": el registro completo a guardar. */
  payload?: Record<string, unknown>;
  queuedAt: string;
}

const QUEUE_STORAGE_KEY = "gastosapp:_syncQueue";

/**
 * Se dispara cada vez que cambia el tamaño de la cola (se encola algo nuevo,
 * o se saca algo porque ya se subió). `useSyncStatus` lo escucha para poder
 * mostrar "Sincronizando..." al instante, sin depender de un sondeo.
 */
export const QUEUE_CHANGED_EVENT = "gastosapp:queue-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyQueueChanged(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

/** Lee todas las operaciones pendientes, en el orden en que se encolaron. */
export function readQueue(): QueueEntry[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as QueueEntry[];
  } catch {
    return [];
  }
}

function writeQueue(entries: QueueEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(entries));
}

/** Agrega una operación al final de la cola. */
export function enqueue(entry: Omit<QueueEntry, "queueEntryId" | "queuedAt">): void {
  const entries = readQueue();
  entries.push({
    ...entry,
    queueEntryId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  });
  writeQueue(entries);
  notifyQueueChanged();
}

/** Quita una operación de la cola una vez que se confirmó que llegó a Supabase. */
export function removeFromQueue(queueEntryId: string): void {
  const remaining = readQueue().filter((entry) => entry.queueEntryId !== queueEntryId);
  writeQueue(remaining);
  notifyQueueChanged();
}
