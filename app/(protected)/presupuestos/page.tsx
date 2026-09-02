"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { buildColorIndexById } from "@/lib/charts/categoricalColor";
import { sortByCategoryOrder } from "@/lib/repository/categoryOrder";
import { BudgetRow } from "@/components/presupuestos/BudgetRow";
import { SingleBudgetField } from "@/components/presupuestos/SingleBudgetField";
import { MonthlyInvestmentGoalField, type MonthlyInvestmentGoalValue } from "@/components/presupuestos/MonthlyInvestmentGoalField";

/**
 * Presupuestos del mes: un tope total de gastos, un mínimo a aportar en
 * inversiones, y un tope opcional por categoría de gasto. Vive fuera de
 * Configuración por el mismo motivo que Gastos fijos: es parte del flujo de
 * Mensual (de ahí se llega acá), no un ajuste general de la app.
 */
export default function PresupuestosPage() {
  const { categories, categoryBudgets, investmentGoals } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);
  const { rate: exchangeRate } = useCurrentExchangeRate();

  const expenseCategories = useMemo(
    () => categories.list().filter((category) => category.kind === "gasto"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, refreshKey]
  );
  const colorIndexById = useMemo(() => buildColorIndexById(expenseCategories), [expenseCategories]);
  // No tiene sentido ofrecer un tope para una categoría borrada — ya no se
  // le pueden cargar gastos nuevos, así que si tenía un presupuesto ya se
  // borró (ver deactivateCategory). El color sigue viniendo de la lista
  // completa, para que no cambie si en algún momento hubo una borrada antes.
  const activeExpenseCategories = useMemo(
    () => sortByCategoryOrder(expenseCategories.filter((category) => category.active)),
    [expenseCategories]
  );

  const allBudgets = useMemo(
    () => categoryBudgets.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryBudgets, refreshKey]
  );
  const budgetByCategoryId = useMemo(
    () => new Map(allBudgets.filter((budget) => budget.category_id !== null).map((budget) => [budget.category_id, budget])),
    [allBudgets]
  );
  // El tope total del mes es la fila especial con category_id null — no es
  // una categoría más, por eso se maneja aparte del mapa de arriba.
  const totalBudget = allBudgets.find((budget) => budget.category_id === null) ?? null;

  const goal = useMemo(
    () => investmentGoals.list()[0] ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investmentGoals, refreshKey]
  );

  function handleSaveCategoryBudget(categoryId: string, amount: number | null) {
    const existing = budgetByCategoryId.get(categoryId);

    if (amount === null) {
      if (existing) categoryBudgets.remove(existing.id);
    } else if (existing) {
      categoryBudgets.update(existing.id, { monthly_amount: amount });
    } else {
      categoryBudgets.create({ category_id: categoryId, monthly_amount: amount });
    }

    setRefreshKey((key) => key + 1);
  }

  function handleSaveTotalBudget(amount: number | null) {
    if (amount === null) {
      if (totalBudget) categoryBudgets.remove(totalBudget.id);
    } else if (totalBudget) {
      categoryBudgets.update(totalBudget.id, { monthly_amount: amount });
    } else {
      categoryBudgets.create({ category_id: null, monthly_amount: amount });
    }

    setRefreshKey((key) => key + 1);
  }

  // Convierte a USD (para poder comparar contra los aportes reales) igual
  // que una inversión cargada en pesos: monto / cotización del día. Solo
  // toca los campos del aporte mensual — el resto de la meta (monto y fecha
  // objetivo) se edita desde Inversiones, es el mismo registro.
  function handleSaveMinInvestment({ amount, currency }: MonthlyInvestmentGoalValue) {
    const monthlyContributionUsd =
      amount === null ? null : currency === "USD" ? amount : exchangeRate ? amount / exchangeRate : null;

    // Sin cotización no se puede convertir un monto en ARS — no se guarda
    // nada a medias (el campo ya avisa que hace falta definirla primero).
    if (amount !== null && currency === "ARS" && monthlyContributionUsd === null) return;

    const patch = {
      monthly_contribution_amount: amount,
      monthly_contribution_currency: amount === null ? null : currency,
      monthly_contribution_usd: monthlyContributionUsd,
    };

    if (goal) {
      investmentGoals.update(goal.id, patch);
    } else {
      investmentGoals.create({ target_amount_usd: null, target_date: null, ...patch });
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Presupuestos</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Dejá un campo vacío para no ponerle límite
        </p>
      </header>

      <SingleBudgetField
        label="Tope de gastos del mes"
        description="Total de todos los gastos del mes, sin importar la categoría."
        prefix="$"
        value={totalBudget?.monthly_amount ?? null}
        onSave={handleSaveTotalBudget}
      />

      <MonthlyInvestmentGoalField
        value={{ amount: goal?.monthly_contribution_amount ?? null, currency: goal?.monthly_contribution_currency ?? "USD" }}
        exchangeRate={exchangeRate}
        onSave={handleSaveMinInvestment}
      />

      <div>
        <p className="mb-3 text-sm font-semibold">Por categoría</p>
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          {activeExpenseCategories.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Todavía no tenés categorías de gasto.
            </p>
          ) : (
            activeExpenseCategories.map((category, index) => (
              <div key={category.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
                <BudgetRow
                  category={category}
                  colorIndex={colorIndexById.get(category.id) ?? 0}
                  monthlyAmount={budgetByCategoryId.get(category.id)?.monthly_amount ?? null}
                  onSave={(amount) => handleSaveCategoryBudget(category.id, amount)}
                />
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
