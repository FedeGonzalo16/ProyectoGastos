"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useCountUp } from "@/hooks/useCountUp";
import { addMonths, currentYearMonth, formatYearMonthShort, lastNMonths, monthRangeInclusive, type YearMonth } from "@/lib/dateRange";
import { creditCardAmountsByMonth, filterByMonth, groupByCategory, sumAmounts, sumPerMonth } from "@/lib/aggregations/monthlySummary";
import { averagePortfolioReturn, investmentContributionAmounts, totalInvestedUsd } from "@/lib/aggregations/investmentSummary";
import { buildBudgetProgress, buildTotalBudgetProgress } from "@/lib/aggregations/budgetProgress";
import { buildInsights } from "@/lib/aggregations/insights";
import { formatArs, formatUsd } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { PeriodSelector, type ComparisonPeriod } from "@/components/dashboard/PeriodSelector";
import { CustomMonthRangeFields } from "@/components/dashboard/CustomMonthRangeFields";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { CreditCardOutlookCard } from "@/components/dashboard/CreditCardOutlookCard";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const { categories, expenses, incomes, investments, investmentValuations, categoryBudgets, investmentGoals } =
    useRepositories();
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>(6);

  const currentMonth = useMemo(() => currentYearMonth(), []);
  const previousMonth = useMemo(() => addMonths(currentMonth, -1), [currentMonth]);

  // Rango del selector "Seleccionar rango" — arranca en los últimos 6 meses (el
  // mismo default que el preset) y solo se usa cuando `comparisonPeriod` es
  // "custom", pero conviene mantenerlo en estado ya para que no se resetee al
  // ir y volver de esa opción.
  const [customRangeFrom, setCustomRangeFrom] = useState<YearMonth>(() => lastNMonths(currentYearMonth(), 6)[0]);
  const [customRangeTo, setCustomRangeTo] = useState<YearMonth>(() => currentYearMonth());

  const allCategories = categories.list();
  const expenseCategories = allCategories.filter((category) => category.kind === "gasto");
  const incomeCategories = allCategories.filter((category) => category.kind === "ingreso");

  const allExpenses = expenses.list();
  const allIncomes = incomes.list();
  const allInvestments = investments.list();
  const allValuations = investmentValuations.list();

  const expensesThisMonth = filterByMonth(allExpenses, currentMonth);
  const incomesThisMonth = filterByMonth(allIncomes, currentMonth);
  const totalExpensesThisMonth = sumAmounts(expensesThisMonth);
  const balanceThisMonth = sumAmounts(incomesThisMonth) - totalExpensesThisMonth;
  const animatedBalance = useCountUp(balanceThisMonth);

  // Mes anterior, solo para los insights (comparar "este mes vs el pasado").
  const expensesLastMonth = filterByMonth(allExpenses, previousMonth);
  const incomesLastMonth = filterByMonth(allIncomes, previousMonth);
  const balanceLastMonth = sumAmounts(incomesLastMonth) - sumAmounts(expensesLastMonth);
  const expensesByCategoryLastMonth = groupByCategory(expensesLastMonth, expenseCategories);

  const expensesByCategory = groupByCategory(expensesThisMonth, expenseCategories);
  const incomesByCategory = groupByCategory(incomesThisMonth, incomeCategories);

  const comparisonMonths = useMemo(
    () =>
      comparisonPeriod === "custom"
        ? monthRangeInclusive(customRangeFrom, customRangeTo)
        : lastNMonths(currentMonth, comparisonPeriod),
    [currentMonth, comparisonPeriod, customRangeFrom, customRangeTo]
  );
  // El mes actual se resalta si aparece en el rango elegido — con los presets
  // siempre es el último mes, pero con un rango personalizado podría no estar
  // incluido (ej. "Ene 2025 a Jun 2025"), y en ese caso no se resalta nada.
  const highlightPeriodIndex = comparisonMonths.findIndex(
    (month) => month.year === currentMonth.year && month.month === currentMonth.month
  );
  // Los aportes a inversión son un monto con fecha, igual que un gasto o un
  // ingreso — se reusa `sumPerMonth`/`filterByMonth`. Solo compras: una venta
  // no es un aporte nuevo (ver `investmentContributionAmounts`).
  const investmentContributions = investmentContributionAmounts(allInvestments);
  const investmentContributionsThisMonth = sumAmounts(filterByMonth(investmentContributions, currentMonth));

  // Este mes + los próximos 2 — no depende de qué período eligió el usuario
  // en el comparador de más abajo, siempre mira hacia adelante desde hoy.
  const creditCardMonths = useMemo(() => monthRangeInclusive(currentMonth, addMonths(currentMonth, 2)), [currentMonth]);
  const creditCardAmounts = creditCardAmountsByMonth(allExpenses, creditCardMonths);
  const hasCreditCardExpenses = allExpenses.some((expense) => expense.payment_method === "credito");

  const investmentGoal = investmentGoals.list()[0] ?? null;
  const insights = buildInsights({
    budgetProgress: buildBudgetProgress(categoryBudgets.list(), expensesThisMonth, expenseCategories),
    totalBudgetProgress: buildTotalBudgetProgress(categoryBudgets.list(), expensesThisMonth),
    investmentMonthlyTargetUsd: investmentGoal?.monthly_contribution_usd ?? null,
    investmentContributedUsd: investmentContributionsThisMonth,
    expensesByCategoryThisMonth: expensesByCategory,
    expensesByCategoryLastMonth,
    balanceThisMonth,
    balanceLastMonth,
    totalExpensesThisMonth,
  });

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Resumen</h1>
        {/* Único acceso directo a Configuración (tema, gastos fijos) — no está en la barra de abajo a propósito, para no ocupar un 5º ícono. */}
        <Link href="/configuracion" aria-label="Configuración" style={{ color: "var(--color-text-secondary)" }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </header>

      {/* El balance del mes es EL número que se quiere ver de un vistazo —
          por eso tiene su propia tarjeta grande, separado de los otros dos
          (que son datos de apoyo, no la pregunta principal del Dashboard). */}
      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Balance del mes
        </p>
        <p
          className="font-heading text-4xl font-semibold tabular-nums"
          style={{ color: balanceThisMonth < 0 ? "var(--chart-8)" : undefined }}
        >
          {formatArs(animatedBalance)}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Total invertido"
          value={formatUsd(totalInvestedUsd(allInvestments))}
          caption={`${allInvestments.length} posiciones`}
          icon={<WalletIcon />}
        />
        <StatCard
          label="Rendimiento"
          value={`${averagePortfolioReturn(allInvestments, allValuations) >= 0 ? "+" : ""}${averagePortfolioReturn(allInvestments, allValuations).toFixed(1)}%`}
          valueColor="var(--color-good)"
          caption="promedio cartera"
          icon={<TrendingUpIcon />}
        />
      </div>

      <InsightsCard insights={insights} />

      {hasCreditCardExpenses && <CreditCardOutlookCard months={creditCardMonths} amountsByMonth={creditCardAmounts} />}

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
        {comparisonPeriod === "custom" && (
          <CustomMonthRangeFields
            from={customRangeFrom}
            to={customRangeTo}
            maxTo={currentMonth}
            onChangeFrom={setCustomRangeFrom}
            onChangeTo={setCustomRangeTo}
          />
        )}
        <div className="mt-3.5">
          <GroupedBarChart
            periodLabels={comparisonMonths.map(formatYearMonthShort)}
            series={[
              { label: "Ingresos", values: sumPerMonth(allIncomes, comparisonMonths) },
              { label: "Gastos", values: sumPerMonth(allExpenses, comparisonMonths) },
              { label: "Inversión", values: sumPerMonth(investmentContributions, comparisonMonths) },
            ]}
            highlightPeriodIndex={highlightPeriodIndex}
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
        <EmptyState message="Cargá algún gasto o ingreso este mes para ver los gráficos." />
      )}
    </div>
  );
}

/** Ícono de "Total invertido" para su StatCard. */
function WalletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Ícono de "Rendimiento" para su StatCard — mismo trazo que el ícono de Inversión en la barra de navegación. */
function TrendingUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M4 17l5-5.5 4 3.5L20 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
