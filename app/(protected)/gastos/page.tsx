"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";
import { QuickAddExpenseForm } from "@/components/gastos/QuickAddExpenseForm";
import { ExpenseList } from "@/components/gastos/ExpenseList";
import type { Expense } from "@/lib/types";

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

  const colorIndexById = useMemo(() => buildColorIndexById(expenseCategories), [expenseCategories]);
  const categoriesById = useMemo(
    () => new Map(expenseCategories.map((category) => [category.id, category])),
    [expenseCategories]
  );

  function handleCreateExpense(input: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at">) {
    expenses.create(input);
    setRefreshKey((key) => key + 1);
  }

  // Los gastos recientes son los últimos 20, no toda la historia — la
  // pantalla de Mensual es la que muestra un mes entero agregado.
  const recentExpenses = [...allExpenses]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Nuevo gasto</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Cargalo en unos segundos
        </p>
      </header>

      <QuickAddExpenseForm expenseCategories={expenseCategories} onSubmit={handleCreateExpense} />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Gastos recientes</h2>
        <ExpenseList expenses={recentExpenses} categoriesById={categoriesById} colorIndexById={colorIndexById} />
      </section>
    </div>
  );
}
