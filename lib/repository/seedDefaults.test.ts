import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/types";
import type { Repository } from "@/lib/repository/types";
import { seedDefaultCategoriesIfEmpty } from "@/lib/repository/seedDefaults";

/**
 * Mock mínimo en memoria de `Repository<Category>` — alcanza con `list`/
 * `create`, que es todo lo que usa `seedDefaultCategoriesIfEmpty`.
 */
function makeInMemoryCategoriesRepo(initial: Category[] = []): Repository<Category> {
  const rows = [...initial];
  return {
    list: () => rows,
    create: (input) => {
      const record: Category = {
        ...input,
        id: `cat-${rows.length}`,
        user_id: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      rows.push(record);
      return record;
    },
    update: () => undefined,
    remove: () => {},
  };
}

describe("seedDefaultCategoriesIfEmpty", () => {
  it("siembra y devuelve true si el usuario no tenía ninguna categoría", () => {
    const repo = makeInMemoryCategoriesRepo();

    expect(seedDefaultCategoriesIfEmpty(repo)).toBe(true);
    expect(repo.list().length).toBeGreaterThan(0);
  });

  it("no siembra y devuelve false si ya tenía al menos una (evita duplicar)", () => {
    const repo = makeInMemoryCategoriesRepo([
      {
        id: "existing",
        user_id: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        name: "Comida",
        kind: "gasto",
        color: null,
        active: true,
        sort_order: 0,
      },
    ]);

    expect(seedDefaultCategoriesIfEmpty(repo)).toBe(false);
    expect(repo.list().length).toBe(1);
  });
});
