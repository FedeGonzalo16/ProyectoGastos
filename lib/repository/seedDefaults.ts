import type { Repository } from "@/lib/repository/types";
import type { Category } from "@/lib/types";

// Mismas categorías que se usaron en los mockups aprobados (design/), para
// que la app no arranque totalmente vacía la primera vez que se usa.
const DEFAULT_EXPENSE_CATEGORY_NAMES = [
  "Comida",
  "Transporte",
  "Servicios",
  "Entretenimiento",
  "Gimnasio",
  "Compras",
  "Crédito",
  "Salidas",
  "Otros",
];

const DEFAULT_INCOME_CATEGORY_NAMES = ["Sueldo", "Extra / freelance", "Otros"];

/**
 * Crea un set inicial de categorías si el usuario todavía no tiene ninguna.
 * Corre una sola vez por usuario: si ya existe al menos una categoría (de
 * cualquier tipo), no hace nada — así no se duplican si se llama más de una
 * vez (por ejemplo, al navegar entre pantallas). Devuelve `true` si sembró
 * algo — quien llama lo usa para saber si hace falta forzar una subida
 * inmediata (ver `EnsureDefaultCategories`), en vez de esperar al próximo
 * ciclo automático de sincronización.
 */
export function seedDefaultCategoriesIfEmpty(categories: Repository<Category>): boolean {
  if (categories.list().length > 0) return false;

  // El orden manual arranca igual al de esta lista (0, 1, 2, ...) — el mismo
  // orden que ya tenían por creación, así no cambia nada hasta que el usuario
  // decida reordenar algo a mano.
  DEFAULT_EXPENSE_CATEGORY_NAMES.forEach((name, index) =>
    categories.create({ name, kind: "gasto", color: null, active: true, sort_order: index })
  );
  DEFAULT_INCOME_CATEGORY_NAMES.forEach((name, index) =>
    categories.create({ name, kind: "ingreso", color: null, active: true, sort_order: index })
  );
  return true;
}
