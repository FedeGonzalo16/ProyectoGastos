"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useCountUp } from "@/hooks/useCountUp";
import { ensureFixedExpensesGeneratedForMonth } from "@/lib/repository/generateFixedExpenses";
import { ensureFixedIncomesGeneratedForMonth } from "@/lib/repository/generateFixedIncomes";
import {
  currentYearMonth,
  formatYearMonth,
  formatYearMonthShort,
  lastNMonths,
  type YearMonth,
} from "@/lib/dateRange";
import { filterByMonth, groupByCategory, sumAmounts, sumPerMonth } from "@/lib/aggregations/monthlySummary";
import { buildBudgetProgress, buildTotalBudgetProgress } from "@/lib/aggregations/budgetProgress";
import { formatArs } from "@/lib/format";
import { MonthSwitcher } from "@/components/mensual/MonthSwitcher";
import { QuickAddIncomeForm } from "@/components/mensual/QuickAddIncomeForm";
import { IncomeList } from "@/components/mensual/IncomeList";
import { SearchInput } from "@/components/shared/SearchInput";
import { ManageLink } from "@/components/shared/ManageLink";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { AmountRow } from "@/components/mensual/AmountRow";
import { BudgetProgressBar } from "@/components/mensual/BudgetProgressBar";
import { FixedExpenseChecklist } from "@/components/mensual/FixedExpenseChecklist";
import { DonutChart } from "@/components/charts/DonutChart";
import { DonutLegend } from "@/components/charts/DonutLegend";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { buildColorIndexById, categoricalColorVar } from "@/lib/charts/categoricalColor";
import { createCategoryWithOrder } from "@/lib/repository/createCategoryWithOrder";
import { sortByCategoryOrder } from "@/lib/repository/categoryOrder";
import type { Category, Expense, Income } from "@/lib/types";

const MONTHS_IN_COMPARISON = 6;

/**
 * Resumen mensual: ingresos categorizados vs. gastos (fijos + variables, ya
 * sincronizados desde Gastos diarios porque leen de la misma tabla), balance,
 * y la comparativa contra meses anteriores.
 */
export default function MensualPage() {
  const { categories, expenses, incomes, fixedExpenses, fixedIncomes, categoryBudgets } = useRepositories();

  const [yearMonth, setYearMonth] = useState<YearMonth>(currentYearMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeSearchQuery, setIncomeSearchQuery] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const { showToast, toast } = useToast();

  // Antes de leer los gastos del mes, nos aseguramos de que los gastos fijos
  // activos ya tengan su registro generado para este mes. Va ANTES que los
  // `useMemo` de más abajo (el orden de los hooks es el orden en que corren)
  // para que ya esté hecho cuando se lee `expenses.list()`. Es idempotente,
  // así que memoizarlo por mes solo evita repetir el escaneo en cada render.
  useMemo(
    () => ensureFixedExpensesGeneratedForMonth(fixedExpenses, expenses, yearMonth),
    [fixedExpenses, expenses, yearMonth]
  );
  // Mismo criterio, del lado de los ingresos (ej. el sueldo) — ver
  // lib/repository/generateFixedIncomes.ts.
  useMemo(
    () => ensureFixedIncomesGeneratedForMonth(fixedIncomes, incomes, yearMonth),
    [fixedIncomes, incomes, yearMonth]
  );

  const allCategories = useMemo(
    () => categories.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, refreshKey]
  );
  const expenseCategories = useMemo(
    () => allCategories.filter((category) => category.kind === "gasto"),
    [allCategories]
  );
  const incomeCategories = useMemo(
    () => allCategories.filter((category) => category.kind === "ingreso"),
    [allCategories]
  );

  const allExpenses = useMemo(
    () => expenses.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, refreshKey]
  );
  const allIncomes = useMemo(
    () => incomes.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incomes, refreshKey]
  );

  const expensesThisMonth = useMemo(() => filterByMonth(allExpenses, yearMonth), [allExpenses, yearMonth]);
  const incomesThisMonth = useMemo(() => filterByMonth(allIncomes, yearMonth), [allIncomes, yearMonth]);

  const totalExpenses = sumAmounts(expensesThisMonth);
  const totalIncomes = sumAmounts(incomesThisMonth);
  const balance = totalIncomes - totalExpenses;
  const animatedBalance = useCountUp(balance);

  const fixedExpensesThisMonth = expensesThisMonth.filter((expense) => expense.is_fixed);
  const variableExpensesThisMonth = expensesThisMonth.filter((expense) => !expense.is_fixed);
  const fixedByCategory = groupByCategory(fixedExpensesThisMonth, expenseCategories);
  const variableByCategory = groupByCategory(variableExpensesThisMonth, expenseCategories);
  const expenseCategoriesById = useMemo(
    () => new Map(expenseCategories.map((category) => [category.id, category])),
    [expenseCategories]
  );

  const expensesByCategory = groupByCategory(expensesThisMonth, expenseCategories);
  const incomesByCategory = groupByCategory(incomesThisMonth, incomeCategories);

  // La búsqueda solo filtra el detalle (la lista de ingresos individuales),
  // no los totales por categoría de arriba — así no da la sensación de que
  // "desapareció" plata al buscar algo que no coincide con ningún ingreso.
  const normalizedIncomeSearch = incomeSearchQuery.trim().toLowerCase();
  const searchedIncomes = normalizedIncomeSearch
    ? incomesThisMonth.filter((income) => (income.description ?? "").toLowerCase().includes(normalizedIncomeSearch))
    : incomesThisMonth;

  const incomeColorIndexById = useMemo(() => buildColorIndexById(incomeCategories), [incomeCategories]);
  const orderedIncomeCategories = useMemo(() => sortByCategoryOrder(incomeCategories), [incomeCategories]);
  const incomeCategoriesById = useMemo(
    () => new Map(incomeCategories.map((category) => [category.id, category])),
    [incomeCategories]
  );

  const allBudgets = useMemo(
    () => categoryBudgets.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryBudgets, refreshKey]
  );
  const budgetProgress = useMemo(
    () => buildBudgetProgress(allBudgets, expensesThisMonth, expenseCategories),
    [allBudgets, expensesThisMonth, expenseCategories]
  );
  const totalBudgetProgress = useMemo(
    () => buildTotalBudgetProgress(allBudgets, expensesThisMonth),
    [allBudgets, expensesThisMonth]
  );

  const comparisonMonths = useMemo(() => lastNMonths(yearMonth, MONTHS_IN_COMPARISON), [yearMonth]);

  function handleSubmitIncome(input: Omit<Income, "id" | "user_id" | "created_at" | "updated_at">) {
    if (editingIncome) {
      incomes.update(editingIncome.id, input);
      setEditingIncome(null);
      showToast("Ingreso actualizado");
    } else {
      incomes.create(input);
      showToast("Ingreso agregado");
    }
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteIncome(income: Income) {
    const confirmed = await confirm("¿Borrar este ingreso? No se puede deshacer.", { confirmLabel: "Borrar" });
    if (!confirmed) return;

    incomes.remove(income.id);
    if (editingIncome?.id === income.id) setEditingIncome(null);
    setRefreshKey((key) => key + 1);
  }

  function handleTogglePaid(expense: Expense) {
    expenses.update(expense.id, { is_paid: !expense.is_paid });
    setRefreshKey((key) => key + 1);
  }

  /** Igual que en Gastos: la categoría creada acá queda disponible en toda la app. */
  function handleCreateIncomeCategory(name: string): Category {
    const created = createCategoryWithOrder(categories, name, "ingreso");
    setRefreshKey((key) => key + 1);
    return created;
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Resumen mensual</h1>
      </header>

      <MonthSwitcher value={yearMonth} onChange={setYearMonth} />

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Balance del mes
        </p>
        <p className="font-heading text-4xl font-semibold tabular-nums">{formatArs(animatedBalance)}</p>

        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 rounded-xl p-3" style={{ background: "var(--color-bg)" }}>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <span className="inline-block h-1.75 w-1.75 rounded-full" style={{ background: "var(--chart-3)" }} />
              Ingresos
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{formatArs(totalIncomes)}</p>
          </div>
          <div className="flex-1 rounded-xl p-3" style={{ background: "var(--color-bg)" }}>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <span className="inline-block h-1.75 w-1.75 rounded-full" style={{ background: "var(--chart-2)" }} />
              Gastos
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{formatArs(totalExpenses)}</p>
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Ingresos</h2>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {formatArs(totalIncomes)}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          {incomesByCategory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Todavía no cargaste ingresos este mes.
            </p>
          ) : (
            incomesByCategory.map((item) => (
              // key por categoryId, no por label: dos categorías distintas pueden
              // mostrar el mismo nombre (ej. una borrada y otra creada de nuevo con igual nombre).
              <AmountRow key={item.categoryId ?? item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <SearchInput value={incomeSearchQuery} onChange={setIncomeSearchQuery} placeholder="Buscar por descripción..." />
          <IncomeList
            incomes={searchedIncomes}
            categoriesById={incomeCategoriesById}
            colorIndexById={incomeColorIndexById}
            onEdit={setEditingIncome}
            onDelete={handleDeleteIncome}
            emptyMessage={
              incomesThisMonth.length === 0
                ? "Todavía no cargaste ingresos este mes."
                : "No hay ingresos que coincidan con esta búsqueda."
            }
          />
        </div>
        <div className="mt-4">
          <QuickAddIncomeForm
            incomeCategories={orderedIncomeCategories}
            onSubmit={handleSubmitIncome}
            onCreateCategory={handleCreateIncomeCategory}
            editingIncome={editingIncome}
            onCancelEdit={() => setEditingIncome(null)}
          />
        </div>
        <ManageLink href="/ingresos-fijos" className="mt-2">
          Gestionar ingresos fijos →
        </ManageLink>
      </section>

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Presupuestos</h2>
          <ManageLink href="/presupuestos">
            {totalBudgetProgress || budgetProgress.length > 0 ? "Gestionar →" : "Definir →"}
          </ManageLink>
        </div>

        {!totalBudgetProgress && budgetProgress.length === 0 ? (
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Todavía no definiste ningún tope mensual.
          </p>
        ) : (
          <div className="mt-3.5 flex flex-col gap-3.5">
            {totalBudgetProgress && (
              <BudgetProgressBar label="Total del mes" barColor="var(--color-brand)" {...totalBudgetProgress} />
            )}
            {budgetProgress.map((progress) => (
              <BudgetProgressBar
                key={progress.category.id}
                label={progress.category.name}
                barColor={categoricalColorVar(progress.colorIndex)}
                spent={progress.spent}
                budget={progress.budget}
                percentage={progress.percentage}
                isOverBudget={progress.isOverBudget}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Gastos</h2>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {formatArs(totalExpenses)}
          </span>
        </div>

        <p className="mt-3.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-brand)" }}>
          Fijos · {formatArs(sumAmounts(fixedExpensesThisMonth))}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {fixedByCategory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              No hay gastos fijos activos.
            </p>
          ) : (
            fixedByCategory.map((item) => (
              // key por categoryId, no por label: dos categorías distintas pueden
              // mostrar el mismo nombre (ej. una borrada y otra creada de nuevo con igual nombre).
              <AmountRow key={item.categoryId ?? item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
        <FixedExpenseChecklist
          expenses={fixedExpensesThisMonth}
          categoriesById={expenseCategoriesById}
          onTogglePaid={handleTogglePaid}
        />
        <ManageLink href="/gastos-fijos" className="mt-2">
          Gestionar gastos fijos →
        </ManageLink>

        <p className="mt-4 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-brand)" }}>
          Variables · {formatArs(sumAmounts(variableExpensesThisMonth))}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {variableByCategory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              No hay gastos variables este mes todavía.
            </p>
          ) : (
            variableByCategory.map((item) => (
              // key por categoryId, no por label: dos categorías distintas pueden
              // mostrar el mismo nombre (ej. una borrada y otra creada de nuevo con igual nombre).
              <AmountRow key={item.categoryId ?? item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
        <ManageLink href="/categorias" className="mt-3">
          Gestionar categorías →
        </ManageLink>
      </section>

      {(expensesByCategory.length > 0 || incomesByCategory.length > 0) && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold">Gastos por categoría</h2>
          <div className="mt-3.5 flex items-center gap-4">
            <DonutChart items={expensesByCategory} />
            <DonutLegend items={expensesByCategory} />
          </div>
        </section>
      )}

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <h2 className="text-sm font-semibold">Ingresos vs gastos</h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Comparado con meses anteriores
        </p>
        <div className="mt-3.5">
          <GroupedBarChart
            periodLabels={comparisonMonths.map(formatYearMonthShort)}
            series={[
              { label: "Ingresos", values: sumPerMonth(allIncomes, comparisonMonths) },
              { label: "Gastos", values: sumPerMonth(allExpenses, comparisonMonths) },
            ]}
            highlightPeriodIndex={comparisonMonths.length - 1}
          />
        </div>
      </section>

      <p className="text-center text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
        Mostrando {formatYearMonth(yearMonth)}
      </p>

      {dialog}
      {toast}
    </div>
  );
}
