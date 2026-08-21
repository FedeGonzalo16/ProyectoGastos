"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { currentYearMonth, formatYearMonthShort, lastNMonths } from "@/lib/dateRange";
import { filterByMonth, groupByCategory, sumAmounts, sumPerMonth } from "@/lib/aggregations/monthlySummary";
import { averagePortfolioReturn, totalInvestedUsd } from "@/lib/aggregations/investmentSummary";
import { formatArs, formatUsd } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { PeriodSelector, type ComparisonPeriod } from "@/components/dashboard/PeriodSelector";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { DonutLegend } from "@/components/charts/DonutLegend";

/**
 * Dashboard: el pantallazo general — balance del mes, total invertido y
 * rendimiento, la comparativa Ingresos/Gastos/Inversión, y las tortas de
 * categorías del mes actual. No escribe nada, solo lee y combina lo que ya
 * cargaron Gastos, Mensual e Inversiones.
 */
export default function DashboardPage() {
  const { categories, expenses, incomes, investments, investmentValuations } = useRepositories();
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>(6);

  const currentMonth = useMemo(() => currentYearMonth(), []);

  const allCategories = categories.list();
  const expenseCategories = allCategories.filter((category) => category.kind === "gasto");
  const incomeCategories = allCategories.filter((category) => category.kind === "ingreso");

  const allExpenses = expenses.list();
  const allIncomes = incomes.list();
  const allInvestments = investments.list();
  const allValuations = investmentValuations.list();

  const expensesThisMonth = filterByMonth(allExpenses, currentMonth);
  const incomesThisMonth = filterByMonth(allIncomes, currentMonth);
  const balanceThisMonth = sumAmounts(incomesThisMonth) - sumAmounts(expensesThisMonth);

  const expensesByCategory = groupByCategory(expensesThisMonth, expenseCategories);
  const incomesByCategory = groupByCategory(incomesThisMonth, incomeCategories);

  const comparisonMonths = useMemo(
    () => lastNMonths(currentMonth, comparisonPeriod),
    [currentMonth, comparisonPeriod]
  );
  // Los aportes a inversión son un monto con fecha, igual que un gasto o un
  // ingreso — se reusa `sumPerMonth` mapeando `amount_usd` a `amount`.
  const investmentContributions = allInvestments.map((investment) => ({
    date: investment.date,
    amount: investment.amount_usd,
  }));

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Resumen</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Balance del mes"
          value={formatArs(balanceThisMonth)}
          valueColor={balanceThisMonth < 0 ? "var(--chart-8)" : undefined}
        />
        <StatCard label="Total invertido" value={formatUsd(totalInvestedUsd(allInvestments))} caption={`${allInvestments.length} posiciones`} />
        <StatCard
          label="Rendimiento"
          value={`${averagePortfolioReturn(allInvestments, allValuations) >= 0 ? "+" : ""}${averagePortfolioReturn(allInvestments, allValuations).toFixed(1)}%`}
          valueColor="var(--color-good)"
          caption="promedio cartera"
        />
      </div>

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Ingresos, gastos e inversión</h2>
        </div>
        <div className="mt-3">
          <PeriodSelector value={comparisonPeriod} onChange={setComparisonPeriod} />
        </div>
        <div className="mt-3.5">
          <GroupedBarChart
            periodLabels={comparisonMonths.map(formatYearMonthShort)}
            series={[
              { label: "Ingresos", values: sumPerMonth(allIncomes, comparisonMonths) },
              { label: "Gastos", values: sumPerMonth(allExpenses, comparisonMonths) },
              { label: "Inversión", values: sumPerMonth(investmentContributions, comparisonMonths) },
            ]}
            highlightPeriodIndex={comparisonMonths.length - 1}
          />
        </div>
      </section>

      {expensesByCategory.length > 0 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold">Gastos por categoría</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Este mes
          </p>
          <div className="mt-3.5 flex items-center gap-4">
            <DonutChart items={expensesByCategory} />
            <DonutLegend items={expensesByCategory} />
          </div>
        </section>
      )}

      {incomesByCategory.length > 0 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold">Ingresos por categoría</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Este mes
          </p>
          <div className="mt-3.5 flex items-center gap-4">
            <DonutChart items={incomesByCategory} radius={44} strokeWidth={16} />
            <DonutLegend items={incomesByCategory} />
          </div>
        </section>
      )}

      {expensesByCategory.length === 0 && incomesByCategory.length === 0 && (
        <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Cargá algún gasto o ingreso este mes para ver los gráficos.
        </p>
      )}
    </div>
  );
}
