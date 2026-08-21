"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { ensureFixedExpensesGeneratedForMonth } from "@/lib/repository/generateFixedExpenses";
import {
  currentYearMonth,
  formatYearMonth,
  formatYearMonthShort,
  lastNMonths,
  type YearMonth,
} from "@/lib/dateRange";
import { filterByMonth, groupByCategory, sumAmounts, sumPerMonth } from "@/lib/aggregations/monthlySummary";
import { formatArs } from "@/lib/format";
import { MonthSwitcher } from "@/components/mensual/MonthSwitcher";
import { QuickAddIncomeForm } from "@/components/mensual/QuickAddIncomeForm";
import { AmountRow } from "@/components/mensual/AmountRow";
import { DonutChart } from "@/components/charts/DonutChart";
import { DonutLegend } from "@/components/charts/DonutLegend";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import type { Income } from "@/lib/types";

const MONTHS_IN_COMPARISON = 6;

/**
 * Resumen mensual: ingresos categorizados vs. gastos (fijos + variables, ya
 * sincronizados desde Gastos diarios porque leen de la misma tabla), balance,
 * y la comparativa contra meses anteriores.
 */
export default function MensualPage() {
  const { categories, expenses, incomes, fixedExpenses } = useRepositories();

  const [yearMonth, setYearMonth] = useState<YearMonth>(currentYearMonth());
  const [refreshKey, setRefreshKey] = useState(0);

  // Antes de leer los gastos del mes, nos aseguramos de que los gastos fijos
  // activos ya tengan su registro generado para este mes. Va ANTES que los
  // `useMemo` de más abajo (el orden de los hooks es el orden en que corren)
  // para que ya esté hecho cuando se lee `expenses.list()`. Es idempotente,
  // así que memoizarlo por mes solo evita repetir el escaneo en cada render.
  useMemo(
    () => ensureFixedExpensesGeneratedForMonth(fixedExpenses, expenses, yearMonth),
    [fixedExpenses, expenses, yearMonth]
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

  const fixedExpensesThisMonth = expensesThisMonth.filter((expense) => expense.is_fixed);
  const variableExpensesThisMonth = expensesThisMonth.filter((expense) => !expense.is_fixed);
  const fixedByCategory = groupByCategory(fixedExpensesThisMonth, expenseCategories);
  const variableByCategory = groupByCategory(variableExpensesThisMonth, expenseCategories);

  const expensesByCategory = groupByCategory(expensesThisMonth, expenseCategories);
  const incomesByCategory = groupByCategory(incomesThisMonth, incomeCategories);

  const comparisonMonths = useMemo(() => lastNMonths(yearMonth, MONTHS_IN_COMPARISON), [yearMonth]);

  function handleCreateIncome(input: Omit<Income, "id" | "user_id" | "created_at" | "updated_at">) {
    incomes.create(input);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Resumen mensual</h1>
      </header>

      <MonthSwitcher value={yearMonth} onChange={setYearMonth} />

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Balance del mes
        </p>
        <p className="font-heading text-3xl font-semibold">{formatArs(balance)}</p>

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
              <AmountRow key={item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
        <div className="mt-4">
          <QuickAddIncomeForm incomeCategories={incomeCategories} onSubmit={handleCreateIncome} />
        </div>
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

        <p className="mt-3.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-text-secondary)" }}>
          Fijos · {formatArs(sumAmounts(fixedExpensesThisMonth))}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {fixedByCategory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              No hay gastos fijos activos.
            </p>
          ) : (
            fixedByCategory.map((item) => (
              <AmountRow key={item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
        <Link href="/configuracion" className="mt-2 inline-block text-[11px] font-semibold" style={{ color: "var(--color-brand)" }}>
          Gestionar gastos fijos →
        </Link>

        <p className="mt-4 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-text-secondary)" }}>
          Variables · {formatArs(sumAmounts(variableExpensesThisMonth))}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {variableByCategory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              No hay gastos variables este mes todavía.
            </p>
          ) : (
            variableByCategory.map((item) => (
              <AmountRow key={item.label} label={item.label} amount={item.value} colorIndex={item.colorIndex} />
            ))
          )}
        </div>
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
    </div>
  );
}
