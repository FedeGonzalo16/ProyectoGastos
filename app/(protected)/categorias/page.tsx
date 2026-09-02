"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";
import { deactivateCategory, type CategoryDeletionMode } from "@/lib/repository/deleteCategory";
import { createCategoryWithOrder } from "@/lib/repository/createCategoryWithOrder";
import { sortByCategoryOrder, moveCategory } from "@/lib/repository/categoryOrder";
import { AddCategoryForm } from "@/components/categorias/AddCategoryForm";
import { CategoryListItem } from "@/components/categorias/CategoryListItem";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Category } from "@/lib/types";

/**
 * Administración de categorías (de gasto y de ingreso): crear, renombrar,
 * borrar. Vive fuera de Configuración por el mismo motivo que Gastos fijos y
 * Presupuestos — es un recurso que usan varios módulos (Gastos, Mensual,
 * Gastos fijos, Presupuestos), no un ajuste general de la app.
 *
 * Solo se listan las activas — "borrar" es un apagado suave (ver
 * lib/repository/deleteCategory.ts), así que una categoría borrada
 * simplemente deja de aparecer acá, aunque la fila siga existiendo por
 * dentro para que lo ya cargado con ella siga andando.
 */
export default function CategoriasPage() {
  const repositories = useRepositories();
  const { categories } = repositories;
  const [refreshKey, setRefreshKey] = useState(0);

  // El color de cada categoría se calcula con TODAS (activas e inactivas),
  // para que no cambie según cuáles estén activas en este momento — aunque
  // acá solo se rendericen las activas.
  const allCategories = useMemo(
    () => categories.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, refreshKey]
  );
  const allExpenseCategories = useMemo(() => allCategories.filter((c) => c.kind === "gasto"), [allCategories]);
  const allIncomeCategories = useMemo(() => allCategories.filter((c) => c.kind === "ingreso"), [allCategories]);
  const expenseColorIndexById = useMemo(() => buildColorIndexById(allExpenseCategories), [allExpenseCategories]);
  const incomeColorIndexById = useMemo(() => buildColorIndexById(allIncomeCategories), [allIncomeCategories]);

  // Orden manual: el que se ve acá es el mismo que después usan los pickers
  // de categoría y el listado de presupuestos por categoría.
  const activeExpenseCategories = useMemo(
    () => sortByCategoryOrder(allExpenseCategories.filter((c) => c.active)),
    [allExpenseCategories]
  );
  const activeIncomeCategories = useMemo(
    () => sortByCategoryOrder(allIncomeCategories.filter((c) => c.active)),
    [allIncomeCategories]
  );

  function handleAdd(name: string, kind: Category["kind"]) {
    createCategoryWithOrder(categories, name, kind);
    setRefreshKey((key) => key + 1);
  }

  function handleRename(categoryId: string, name: string) {
    categories.update(categoryId, { name });
    setRefreshKey((key) => key + 1);
  }

  function handleDelete(categoryId: string, mode: CategoryDeletionMode) {
    deactivateCategory(categoryId, mode, repositories);
    setRefreshKey((key) => key + 1);
  }

  /** Sube o baja una categoría un lugar dentro de su propio tipo (gasto/ingreso). */
  function handleMove(categoryId: string, kind: Category["kind"], direction: "up" | "down") {
    const orderedSameKind = kind === "gasto" ? activeExpenseCategories : activeIncomeCategories;
    moveCategory(categories, orderedSameKind, categoryId, direction);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Categorías</h1>
      </header>

      <div>
        <p className="mb-3 text-sm font-semibold">Gastos</p>
        <div className="flex flex-col gap-3">
          <AddCategoryForm onAdd={(name) => handleAdd(name, "gasto")} placeholder="Nueva categoría de Gastos" />
          <section
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {activeExpenseCategories.length === 0 ? (
              <EmptyState message="Todavía no tenés categorías de gasto." />
            ) : (
              activeExpenseCategories.map((category, index) => (
                <div key={category.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
                  <CategoryListItem
                    category={category}
                    colorIndex={expenseColorIndexById.get(category.id) ?? 0}
                    canMoveUp={index > 0}
                    canMoveDown={index < activeExpenseCategories.length - 1}
                    onMoveUp={() => handleMove(category.id, "gasto", "up")}
                    onMoveDown={() => handleMove(category.id, "gasto", "down")}
                    onRename={(name) => handleRename(category.id, name)}
                    onDelete={(mode) => handleDelete(category.id, mode)}
                  />
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">Ingresos</p>
        <div className="flex flex-col gap-3">
          <AddCategoryForm onAdd={(name) => handleAdd(name, "ingreso")} placeholder="Nueva categoría de Ingresos" />
          <section
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {activeIncomeCategories.length === 0 ? (
              <EmptyState message="Todavía no tenés categorías de ingreso." />
            ) : (
              activeIncomeCategories.map((category, index) => (
                <div key={category.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
                  <CategoryListItem
                    category={category}
                    colorIndex={incomeColorIndexById.get(category.id) ?? 0}
                    canMoveUp={index > 0}
                    canMoveDown={index < activeIncomeCategories.length - 1}
                    onMoveUp={() => handleMove(category.id, "ingreso", "up")}
                    onMoveDown={() => handleMove(category.id, "ingreso", "down")}
                    onRename={(name) => handleRename(category.id, name)}
                    onDelete={(mode) => handleDelete(category.id, mode)}
                  />
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
