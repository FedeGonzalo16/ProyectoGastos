import type { Category, CategoryKind } from "@/lib/types";
import type { Repository } from "@/lib/repository/types";
import { nextSortOrder } from "@/lib/repository/categoryOrder";

/**
 * Crea una categoría nueva y la ubica al final del orden manual de su tipo
 * (gasto o ingreso) — así una categoría recién creada no se cuela en medio de
 * otras que el usuario ya reordenó a mano, sea cual sea la pantalla desde la
 * que se crea (Gastos, Gastos fijos, Mensual o Categorías).
 */
export function createCategoryWithOrder(categories: Repository<Category>, name: string, kind: CategoryKind): Category {
  const categoriesOfSameKind = categories.list().filter((category) => category.kind === kind);
  return categories.create({ name, kind, color: null, active: true, sort_order: nextSortOrder(categoriesOfSameKind) });
}
