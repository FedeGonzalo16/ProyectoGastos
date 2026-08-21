import type { Repository } from "@/lib/repository/types";
import type { Category } from "@/lib/types";

// Mismas categorías que se usaron en los mockups aprobados (design/), para
// que la app no arranque totalmente vacía la primera vez que se usa.
const DEFAULT_EXPENSE_CATEGORY_NAMES = [
  "Comida",
  "Transporte",
  "Servicios",
  "Monotributo",
  "Entretenimiento",
  "Otros",
];

const DEFAULT_INCOME_CATEGORY_NAMES = ["Sueldo", "Extra / freelance", "Otros"];

/**
 * Crea un set inicial de categorías si el usuario todavía no tiene ninguna.
 * Corre una sola vez por usuario: si ya existe al menos una categoría (de
 * cualquier tipo), no hace nada — así no se duplican si se llama más de una
 * vez (por ejemplo, al navegar entre pantallas).
 */
export function seedDefaultCategoriesIfEmpty(categories: Repository<Category>): void {
  if (categories.list().length > 0) return;

  DEFAULT_EXPENSE_CATEGORY_NAMES.forEach((name) =>
    categories.create({ name, kind: "gasto", color: null })
  );
  DEFAULT_INCOME_CATEGORY_NAMES.forEach((name) =>
    categories.create({ name, kind: "ingreso", color: null })
  );
}
