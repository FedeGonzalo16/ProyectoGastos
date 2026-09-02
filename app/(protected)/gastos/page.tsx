"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";
import { daysAgoAsDateInput, formatArs } from "@/lib/format";
import { sumAmounts } from "@/lib/aggregations/monthlySummary";
import { QuickAddExpenseForm } from "@/components/gastos/QuickAddExpenseForm";
import { ExpenseList } from "@/components/gastos/ExpenseList";
import { ExpenseFilters, type PeriodFilter } from "@/components/gastos/ExpenseFilters";
import { SearchInput } from "@/components/shared/SearchInput";
import { ManageLink } from "@/components/shared/ManageLink";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { createCategoryWithOrder } from "@/lib/repository/createCategoryWithOrder";
import { sortByCategoryOrder } from "@/lib/repository/categoryOrder";
import { planInstallments } from "@/lib/repository/planInstallments";
import type { Category, Expense } from "@/lib/types";

const MAX_VISIBLE_EXPENSES = 50;

/**
 * Pantalla de Gastos diarios: alta rápida + listado reciente. La lectura es
 * síncrona (viene de la copia local) así que no hace falta un estado de
 * "cargando" — la sincronización con Supabase ocurre en segundo plano
 * (ver `useAutoSync`) sin bloquear la pantalla.
 */
export default function GastosPage() {
  const { categories, expenses } = useRepositories();

  // `refreshKey` fuerza a volver a leer del repositorio después de guardar,
  // ya que `list()` devuelve un array nuevo pero React no sabe que cambió el
  // contenido de localStorage por sí solo.
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const { showToast, toast } = useToast();

  // Se pasa la lista completa (activas e inactivas) a los componentes: el
  // picker de categorías filtra las inactivas por su cuenta (menos la que ya
  // esté elegida), y así el color/nombre de una categoría borrada sigue
  // resolviendo bien en lo que ya está cargado.
  const expenseCategories = useMemo(
    () => categories.list().filter((category) => category.kind === "gasto"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, refreshKey]
  );

  const allExpenses = useMemo(
    () => expenses.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, refreshKey]
  );

  // El color se calcula sobre el orden de creación (sin ordenar) para que no
  // cambie si el usuario reordena las categorías a mano; el picker y los
  // filtros, en cambio, sí respetan ese orden manual.
  const colorIndexById = useMemo(() => buildColorIndexById(expenseCategories), [expenseCategories]);
  const orderedExpenseCategories = useMemo(() => sortByCategoryOrder(expenseCategories), [expenseCategories]);
  const categoriesById = useMemo(
    () => new Map(expenseCategories.map((category) => [category.id, category])),
    [expenseCategories]
  );

  // Etiquetas ya usadas alguna vez, sin repetir — para el autocompletado del
  // formulario y la fila de filtro (ambos ocultos si todavía no hay ninguna).
  const existingTags = useMemo(
    () => Array.from(new Set(allExpenses.map((expense) => expense.tag).filter((tag): tag is string => tag !== null))).sort(),
    [allExpenses]
  );

  function handleSubmitExpense(input: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at">) {
    if (editingExpense) {
      expenses.update(editingExpense.id, input);
      setEditingExpense(null);
      showToast("Gasto actualizado");
    } else {
      // Una compra en cuotas se parte acá en N gastos (uno por mes) — para
      // un gasto normal (installment_count null o 1), esto devuelve la
      // misma fila tal cual, sin ninguna diferencia con antes.
      const installments = planInstallments(input);
      installments.forEach((installment) => expenses.create(installment));
      showToast(installments.length > 1 ? `${installments.length} cuotas agregadas` : "Gasto agregado");
    }
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteExpense(expense: Expense) {
    const confirmed = await confirm("¿Borrar este gasto? No se puede deshacer.", { confirmLabel: "Borrar" });
    if (!confirmed) return;

    expenses.remove(expense.id);
    if (editingExpense?.id === expense.id) setEditingExpense(null);
    setRefreshKey((key) => key + 1);
  }

  function handleTogglePaid(expense: Expense) {
    expenses.update(expense.id, { is_paid: !expense.is_paid });
    setRefreshKey((key) => key + 1);
  }

  /** La categoría creada acá queda disponible para todo el resto de la app (Mensual, Gastos fijos), no solo en este formulario. */
  function handleCreateCategory(name: string): Category {
    const created = createCategoryWithOrder(categories, name, "gasto");
    setRefreshKey((key) => key + 1);
    return created;
  }

  // Se filtra primero por período/categoría y recién después se recorta a
  // un máximo — así un filtro angosto no queda "vacío" por culpa del corte.
  const cutoffDate = periodFilter === "7d" ? daysAgoAsDateInput(7) : periodFilter === "30d" ? daysAgoAsDateInput(30) : null;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredExpenses = allExpenses.filter((expense) => {
    if (cutoffDate && expense.date < cutoffDate) return false;
    if (categoryFilter !== "all" && expense.category_id !== categoryFilter) return false;
    if (tagFilter !== "all" && expense.tag !== tagFilter) return false;
    if (normalizedSearch && !(expense.description ?? "").toLowerCase().includes(normalizedSearch)) return false;
    return true;
  });
  const recentExpenses = [...filteredExpenses]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, MAX_VISIBLE_EXPENSES);
  // Total de TODO lo que coincide con el filtro (no solo lo visible arriba)
  // — el caso de uso es ver cuánto salió un evento puntual (ej. una
  // etiqueta de viaje), no solo mirar la lista recortada.
  const filteredTotal = sumAmounts(filteredExpenses);

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{editingExpense ? "Editar gasto" : "Nuevo gasto"}</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {editingExpense ? "Corregí lo que haga falta" : "Cargalo en unos segundos"}
        </p>
      </header>

      <QuickAddExpenseForm
        expenseCategories={orderedExpenseCategories}
        onSubmit={handleSubmitExpense}
        onCreateCategory={handleCreateCategory}
        editingExpense={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
        existingTags={existingTags}
      />

      <ManageLink href="/categorias" className="-mt-2">
        Gestionar categorías →
      </ManageLink>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Gastos recientes</h2>
        <div className="mb-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por descripción..." />
        </div>
        <div className="mb-3">
          <ExpenseFilters
            categories={orderedExpenseCategories}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            tags={existingTags}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
          />
        </div>
        {tagFilter !== "all" && (
          <p className="mb-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Total en <span className="font-semibold" style={{ color: "var(--color-text)" }}>{tagFilter}</span>:{" "}
            <span className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>{formatArs(filteredTotal)}</span>
          </p>
        )}
        <ExpenseList
          expenses={recentExpenses}
          categoriesById={categoriesById}
          colorIndexById={colorIndexById}
          onEdit={setEditingExpense}
          onDelete={handleDeleteExpense}
          onTogglePaid={handleTogglePaid}
          emptyMessage={
            allExpenses.length === 0
              ? "Todavía no cargaste ningún gasto."
              : "No hay gastos que coincidan con este filtro."
          }
        />
      </section>

      {dialog}
      {toast}
    </div>
  );
}
