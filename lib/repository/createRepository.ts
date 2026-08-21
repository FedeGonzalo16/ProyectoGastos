import type { BaseRecord } from "@/lib/types";
import type { SyncedTable } from "@/lib/offline/syncEngine";
import { readAll, getOne, upsertOne, removeOne } from "@/lib/offline/localStore";
import { enqueue } from "@/lib/offline/syncQueue";
import type { Repository } from "@/lib/repository/types";

/**
 * La cola de sincronización guarda el payload como JSON genérico (así puede
 * encolar cualquier tabla sin conocer su tipo). Los registros de dominio
 * (`T extends BaseRecord`) son siempre objetos planos serializables, así que
 * esta conversión es segura — solo existe para satisfacer a TypeScript.
 */
function asQueuePayload<T extends BaseRecord>(record: T): Record<string, unknown> {
  return record as unknown as Record<string, unknown>;
}

interface CreateRepositoryOptions {
  table: SyncedTable;
  /** Id del usuario logueado, para completar `user_id` en los registros nuevos. */
  getUserId: () => string;
}

/**
 * Fábrica genérica de repositorios: implementa `Repository<T>` para
 * cualquier tabla siguiendo siempre las mismas reglas (guardar local +
 * encolar el cambio para subirlo). Cada archivo en `lib/repository/*` solo
 * le pone el nombre de tabla y el tipo correcto — así se evita repetir esta
 * lógica seis veces, una por entidad (principio de abierto/cerrado: para
 * agregar una tabla nueva no hay que tocar esta función).
 *
 * La sincronización real contra Supabase no ocurre acá: este repositorio
 * solo deja la operación anotada en la cola (`syncQueue`); quien la sube es
 * `syncEngine.ts`, corriendo en segundo plano.
 */
export function createRepository<T extends BaseRecord>({
  table,
  getUserId,
}: CreateRepositoryOptions): Repository<T> {
  function list(): T[] {
    return readAll<T>(table);
  }

  function create(input: Omit<T, keyof BaseRecord>): T {
    const now = new Date().toISOString();
    const record = {
      ...input,
      id: crypto.randomUUID(),
      user_id: getUserId(),
      created_at: now,
      updated_at: now,
    } as T;

    upsertOne(table, record);
    enqueue({ table, operation: "upsert", recordId: record.id, payload: asQueuePayload(record) });

    return record;
  }

  function update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): T | undefined {
    const existing = getOne<T>(table, id);
    if (!existing) return undefined;

    const updated: T = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    upsertOne(table, updated);
    enqueue({ table, operation: "upsert", recordId: updated.id, payload: asQueuePayload(updated) });

    return updated;
  }

  function remove(id: string): void {
    removeOne(table, id);
    enqueue({ table, operation: "delete", recordId: id });
  }

  return { list, create, update, remove };
}
