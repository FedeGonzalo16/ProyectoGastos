import type { Category } from "@/lib/types";
import type { Repository } from "@/lib/repository/types";

/**
 * Orden manual de categorías (`Category.sort_order`): funciones puras para
 * calcularlo y aplicarlo. No tocan Supabase ni localStorage directamente —
 * eso lo hace quien las use, a través del repositorio.
 */

/** Categorías en su orden manual (el que se ve en Categorías, en los pickers y en los listados de presupuestos). */
export function sortByCategoryOrder(categories: Category[]): Category[] {
  // `Array.prototype.sort` es estable, así que dos categorías con el mismo
  // `sort_order` (ej. todas en 0, antes de que alguien reordene algo) quedan
  // en el orden en que ya estaban — el de creación, el comportamiento de
  // siempre — en vez de mezclarse al azar. El `?? 0` es por las dudas de que
  // quede alguna categoría vieja cacheada en localStorage de antes de este
  // campo, sin haberse vuelto a sincronizar todavía.
  return [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** El próximo `sort_order` para una categoría nueva de un tipo (gasto/ingreso): al final, después de todas las que ya tiene ese tipo. */
export function nextSortOrder(categoriesOfSameKind: Category[]): number {
  const sortOrders = categoriesOfSameKind.map((category) => category.sort_order).filter(Number.isFinite);
  if (sortOrders.length === 0) return 0;
  return Math.max(...sortOrders) + 1;
}

/**
 * Mueve una categoría un lugar hacia arriba o abajo dentro de una lista ya
 * ordenada (mismo tipo, normalmente solo las activas) y persiste el nuevo
 * orden reasignando `sort_order` de forma secuencial (0, 1, 2, ...) a toda
 * esa lista — así queda sin espacios ni empates, listo para la próxima vez.
 */
export function moveCategory(
  categories: Repository<Category>,
  orderedCategories: Category[],
  categoryId: string,
  direction: "up" | "down"
): void {
  const index = orderedCategories.findIndex((category) => category.id === categoryId);
  if (index === -1) return;

  const swapWithIndex = direction === "up" ? index - 1 : index + 1;
  if (swapWithIndex < 0 || swapWithIndex >= orderedCategories.length) return;

  const reordered = [...orderedCategories];
  [reordered[index], reordered[swapWithIndex]] = [reordered[swapWithIndex], reordered[index]];

  reordered.forEach((category, newIndex) => {
    if (category.sort_order !== newIndex) categories.update(category.id, { sort_order: newIndex });
  });
}
