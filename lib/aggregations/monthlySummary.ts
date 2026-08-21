import type { Category } from "@/lib/types";
import type { DonutChartItem } from "@/components/charts/DonutChart";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";
import { isDateInMonth, type YearMonth } from "@/lib/dateRange";

/**
 * Cálculos sobre listas de gastos/ingresos ya cargadas en memoria (vienen de
 * la copia local, así que no hay problema en recalcular en cada render).
 * Todas son funciones puras — no leen repositorios ni saben de Supabase — así
 * que Mensual y el Dashboard pueden compartirlas sin acoplarse entre sí.
 */

interface DatedAmount {
  date: string;
  amount: number;
}

/** Filtra una lista de gastos/ingresos a los que caen dentro de un mes. */
export function filterByMonth<T extends DatedAmount>(records: T[], yearMonth: YearMonth): T[] {
  return records.filter((record) => isDateInMonth(record.date, yearMonth));
}

/** Suma el campo `amount` de una lista de gastos/ingresos. */
export function sumAmounts(records: DatedAmount[]): number {
  return records.reduce((total, record) => total + record.amount, 0);
}

/** Suma por mes, para armar la serie de un gráfico de barras/líneas. */
export function sumPerMonth(records: DatedAmount[], months: YearMonth[]): number[] {
  return months.map((month) => sumAmounts(filterByMonth(records, month)));
}

interface CategorizedAmount extends DatedAmount {
  category_id: string | null;
}

/** Igual que `DonutChartItem`, pero conservando de qué categoría viene cada total. */
export interface CategoryAmount extends DonutChartItem {
  categoryId: string | null;
}

/**
 * Agrupa por categoría y devuelve el total de cada una, ordenado de mayor a
 * menor (así el gráfico de torta muestra primero las categorías más
 * relevantes). Las categorías sin registros no aparecen.
 *
 * El color de cada categoría (`colorIndex`) se asigna según su posición en
 * `categories` (orden de creación), no según el orden de este resultado —
 * así una categoría se ve siempre del mismo color, la muestre esta torta o
 * cualquier otra, sin importar cuál sea la más grande cada mes.
 */
export function groupByCategory(
  records: CategorizedAmount[],
  categories: Category[]
): CategoryAmount[] {
  const totalsByCategory = new Map<string, number>();

  for (const record of records) {
    const key = record.category_id ?? "sin-categoria";
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + record.amount);
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const colorIndexById = buildColorIndexById(categories);

  return Array.from(totalsByCategory.entries())
    .map(([categoryId, value]) => ({
      categoryId: categoryId === "sin-categoria" ? null : categoryId,
      label: categoryNameById.get(categoryId) ?? "Sin categoría",
      value,
      colorIndex: colorIndexById.get(categoryId),
    }))
    .sort((a, b) => b.value - a.value);
}
