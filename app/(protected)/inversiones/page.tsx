"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRepositories } from "@/hooks/useRepositories";
import { useCountUp } from "@/hooks/useCountUp";
import { formatArs, formatShortDate, formatUsd, todayAsDateInput } from "@/lib/format";
import { currentYearMonth, lastNMonths, monthDateRange } from "@/lib/dateRange";
import { filterByMonth, sumAmounts } from "@/lib/aggregations/monthlySummary";
import {
  assetReturnHistory,
  autoQuoteCandidates,
  averagePortfolioReturn,
  groupByAssetName,
  groupByAssetType,
  investmentContributionAmounts,
  latestValuation,
  portfolioReturnHistory,
  portfolioValueHistory,
  totalInvestedUsd,
  totalRealizedGainUsd,
} from "@/lib/aggregations/investmentSummary";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { useAutoCryptoQuotes } from "@/hooks/useAutoCryptoQuotes";
import { InvestmentPositionRow } from "@/components/inversiones/InvestmentPositionRow";
import { AutoQuoteStatus } from "@/components/inversiones/AutoQuoteStatus";
import { InvestmentFilters, type InvestmentPeriodFilter } from "@/components/inversiones/InvestmentFilters";
import { ManageLink } from "@/components/shared/ManageLink";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExchangeRateField } from "@/components/inversiones/ExchangeRateField";
import { GoalCard, type GoalInput } from "@/components/inversiones/GoalCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { DonutLegend } from "@/components/charts/DonutLegend";
import { LineChart } from "@/components/charts/LineChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import type { AssetType, Currency, Investment, InvestmentKind } from "@/lib/types";

/**
 * Inversiones: solo para VER los datos — totales, distribución por tipo,
 * evolución del rendimiento y del valor de la cartera, meta de inversión.
 * "Posiciones" es el neto actual por activo (compras menos lo liberado por
 * ventas); "Historial" es cada compra/venta individual, en orden
 * cronológico, para consultar (con editar/borrar). Cargar una posición
 * nueva es otra pantalla (`/inversiones/nueva`), para que esa acción no
 * compita visualmente con toda esta información.
 */
export default function InversionesPage() {
  const router = useRouter();
  const { investments, investmentValuations, investmentGoals } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);
  const [valueChartCurrency, setValueChartCurrency] = useState<Currency>("USD");
  // Filtros del Historial (no afectan los totales/gráficos de arriba, solo
  // qué se ve en la lista de abajo) — mismo criterio que Gastos.
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<InvestmentPeriodFilter>("all");
  const [historyKindFilter, setHistoryKindFilter] = useState<InvestmentKind | "all">("all");
  const [historyAssetTypeFilter, setHistoryAssetTypeFilter] = useState<AssetType | "all">("all");
  const [historySearch, setHistorySearch] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const { rate: exchangeRate } = useCurrentExchangeRate();

  const allInvestments = useMemo(
    () => [...investments.list()].sort((a, b) => (a.date < b.date ? 1 : -1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investments, refreshKey]
  );
  const allValuations = useMemo(
    () => investmentValuations.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investmentValuations, refreshKey]
  );
  const goal = useMemo(
    () => investmentGoals.list()[0] ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investmentGoals, refreshKey]
  );

  const totalUsd = totalInvestedUsd(allInvestments);
  const averageReturn = averagePortfolioReturn(allInvestments, allValuations);
  const animatedTotalUsd = useCountUp(totalUsd);
  const animatedAverageReturn = useCountUp(averageReturn);
  const assetTypeDistribution = groupByAssetType(allInvestments);
  const positionsByAssetName = groupByAssetName(allInvestments, allValuations);
  // Mismo color para un activo en todos lados: esta lista, el avatar de cada
  // posición y el gráfico de "Rendimiento por activo" comparten el orden
  // (de mayor a menor monto invertido).
  const assetNameColorIndexById = new Map(positionsByAssetName.map((position, index) => [position.assetName, index]));
  const returnHistory = portfolioReturnHistory(allInvestments, allValuations);
  const valueHistory = portfolioValueHistory(allInvestments, allValuations);
  const assetReturns = assetReturnHistory(allInvestments, allValuations);
  const latestPortfolioValueUsd = valueHistory[valueHistory.length - 1]?.totalValueUsd ?? 0;

  const contributionsThisMonthUsd = sumAmounts(
    filterByMonth(investmentContributionAmounts(allInvestments), currentYearMonth())
  );
  const realizedGainUsd = totalRealizedGainUsd(allInvestments);

  // Cotización automática de cripto (CoinGecko) para las compras con
  // cantidad + símbolo reconocido — el resultado se persiste como una
  // valuación más (mismo lugar que si se hubiera cargado el % a mano), así
  // el resto de los cálculos de arriba no necesitan saber que existe.
  const { results: autoQuotes, refresh: refreshAutoQuotes, isRefreshing: isRefreshingAutoQuotes, hasCandidates: hasAutoQuoteCandidates } =
    useAutoCryptoQuotes(allInvestments);
  const autoQuotedInvestmentIds = useMemo(
    () => new Set(autoQuoteCandidates(allInvestments).map((candidate) => candidate.investment.id)),
    [allInvestments]
  );

  useEffect(() => {
    if (autoQuotes.length === 0) return;

    const today = todayAsDateInput();
    let didChange = false;
    for (const { investmentId, returnPercentage } of autoQuotes) {
      const investment = allInvestments.find((candidate) => candidate.id === investmentId);
      if (!investment) continue;

      const valueUsd = investment.amount_usd * (1 + returnPercentage / 100);
      const existingToday = allValuations.find((valuation) => valuation.investment_id === investmentId && valuation.date === today);
      if (existingToday) {
        // Umbral chico para no reescribir por un redondeo insignificante —
        // solo importa si el precio se movió de verdad desde la última vez.
        if (Math.abs(existingToday.return_percentage - returnPercentage) > 0.01) {
          investmentValuations.update(existingToday.id, { return_percentage: returnPercentage, value_usd: valueUsd });
          didChange = true;
        }
      } else {
        investmentValuations.create({ investment_id: investmentId, date: today, value_usd: valueUsd, return_percentage: returnPercentage, notes: null });
        didChange = true;
      }
    }
    // Se persiste como valuación, no como estado de React — mismo criterio
    // que useTheme/useCurrentExchangeRate para sincronizar con algo externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (didChange) setRefreshKey((key) => key + 1);
    // Solo cuando cambia el resultado de la cotización (nuevo fetch) — no en
    // cada re-render por otro motivo, para no generar un loop con setRefreshKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuotes]);

  // Filtrado del Historial — `allInvestments` (arriba) sigue siendo la base
  // de todos los totales/gráficos de la pantalla, esto solo recorta qué se
  // ve en la lista de abajo, igual que en Gastos.
  const historyCutoffDate =
    historyPeriodFilter === "all" ? null : monthDateRange(lastNMonths(currentYearMonth(), historyPeriodFilter === "3m" ? 3 : 12)[0]).start;
  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredInvestments = allInvestments.filter((investment) => {
    if (historyCutoffDate && investment.date < historyCutoffDate) return false;
    if (historyKindFilter !== "all" && investment.kind !== historyKindFilter) return false;
    if (historyAssetTypeFilter !== "all" && investment.asset_type !== historyAssetTypeFilter) return false;
    if (normalizedHistorySearch && !investment.asset_name.toLowerCase().includes(normalizedHistorySearch)) return false;
    return true;
  });

  async function handleDeleteInvestment(investment: Investment) {
    const confirmed = await confirm(`¿Borrar esta ${investment.kind} de ${investment.asset_name}? No se puede deshacer.`, {
      confirmLabel: "Borrar",
    });
    if (!confirmed) return;

    // Se borran también sus valuaciones — si no, quedarían huérfanas en la
    // copia local (en Supabase se borrarían solas por el "on delete cascade"
    // del esquema, pero acá no hay que depender de esa sincronización).
    allValuations
      .filter((valuation) => valuation.investment_id === investment.id)
      .forEach((valuation) => investmentValuations.remove(valuation.id));

    investments.remove(investment.id);
    setRefreshKey((key) => key + 1);
  }

  function handleUpdateReturn(investment: Investment, returnPercentage: number) {
    investmentValuations.create({
      investment_id: investment.id,
      date: todayAsDateInput(),
      value_usd: investment.amount_usd * (1 + returnPercentage / 100),
      return_percentage: returnPercentage,
      notes: null,
    });
    setRefreshKey((key) => key + 1);
  }

  function handleSaveGoal(input: GoalInput) {
    if (goal) {
      // Solo pisa monto/fecha objetivo — el aporte mensual (ARS o USD) es
      // otro campo del mismo registro, se define en /presupuestos.
      investmentGoals.update(goal.id, input);
    } else {
      investmentGoals.create({
        ...input,
        monthly_contribution_amount: null,
        monthly_contribution_currency: null,
        monthly_contribution_usd: null,
      });
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Inversiones</h1>
        <ManageLink href="/inversiones/nueva">+ Nueva inversión</ManageLink>
      </header>

      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex gap-3.5">
          <div className="flex-1">
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Total invertido
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums">{formatUsd(animatedTotalUsd)}</p>
            {exchangeRate !== null && (
              <p className="mt-0.5 text-[11.5px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                ≈ ${(totalUsd * exchangeRate).toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS
              </p>
            )}
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
              {positionsByAssetName.length} {positionsByAssetName.length === 1 ? "posición" : "posiciones"}
            </p>
          </div>
          <div className="w-px" style={{ background: "var(--color-border)" }} />
          <div className="flex-1">
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Rendimiento
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums" style={{ color: "var(--color-good)" }}>
              {animatedAverageReturn > 0 ? "+" : ""}
              {animatedAverageReturn.toFixed(1)}%
            </p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
              promedio cartera
            </p>
          </div>
        </div>

        {allInvestments.some((investment) => investment.kind === "venta") && (
          <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Ganancia realizada (ventas)
            </p>
            <p
              className="text-sm font-semibold tabular-nums"
              style={{ color: realizedGainUsd >= 0 ? "var(--color-good)" : "var(--chart-8)" }}
            >
              {realizedGainUsd >= 0 ? "+" : ""}
              {formatUsd(realizedGainUsd)}
            </p>
          </div>
        )}

        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <ExchangeRateField />
        </div>

        {hasAutoQuoteCandidates && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            <AutoQuoteStatus isRefreshing={isRefreshingAutoQuotes} onRefresh={refreshAutoQuotes} />
          </div>
        )}
      </section>

      <GoalCard
        goal={goal}
        totalInvestedUsd={totalUsd}
        contributionsThisMonthUsd={contributionsThisMonthUsd}
        onSave={handleSaveGoal}
      />

      {positionsByAssetName.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">Posiciones</h2>
          <p className="mb-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Cuánto tenés invertido ahora, neto de ventas, por activo.
          </p>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {positionsByAssetName.map((position, index) => (
              <div
                key={position.assetName}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: categoricalColorVar(index) }}
                  />
                  {position.assetName}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-semibold tabular-nums">{formatUsd(position.totalUsd)}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                    {position.percentageOfTotal.toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {assetTypeDistribution.length > 0 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold">Distribución por activo</h2>
          <div className="mt-3.5 flex items-center gap-4">
            <DonutChart items={assetTypeDistribution} />
            <DonutLegend items={assetTypeDistribution} />
          </div>
        </section>
      )}

      {returnHistory.length > 1 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Evolución del rendimiento</h2>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-good)" }}>
              {averageReturn > 0 ? "+" : ""}
              {averageReturn.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5">
            <LineChart
              periodLabels={returnHistory.map((point) => formatShortDate(point.date))}
              values={returnHistory.map((point) => point.averageReturn)}
            />
          </div>
        </section>
      )}

      {valueHistory.length > 1 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Evolución del valor de la cartera</h2>
            <span className="text-xs font-semibold tabular-nums">
              {valueChartCurrency === "USD"
                ? formatUsd(latestPortfolioValueUsd)
                : exchangeRate !== null
                  ? formatArs(latestPortfolioValueUsd * exchangeRate)
                  : formatUsd(latestPortfolioValueUsd)}
            </span>
          </div>
          {/* Es cuánto vale hoy lo invertido (capital + rendimiento), no cuánto se puso — por eso puede no coincidir con "Total invertido" de arriba. */}
          <div className="mt-2 flex justify-end gap-1">
            {(["USD", "ARS"] as Currency[]).map((option) => {
              const isSelected = option === valueChartCurrency;
              const isDisabled = option === "ARS" && exchangeRate === null;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setValueChartCurrency(option)}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                  style={
                    isSelected
                      ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
                      : {
                          color: isDisabled ? "var(--color-border)" : "var(--color-text-secondary)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <LineChart
              periodLabels={valueHistory.map((point) => formatShortDate(point.date))}
              values={
                valueChartCurrency === "USD" || exchangeRate === null
                  ? valueHistory.map((point) => point.totalValueUsd)
                  : valueHistory.map((point) => point.totalValueUsd * exchangeRate)
              }
              colorVar="var(--chart-1)"
            />
          </div>
        </section>
      )}

      {assetReturns.series.length > 1 && assetReturns.dates.length > 1 && (
        <section
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold">Rendimiento por activo</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Agrupa todas las cargas de cada activo (ej. todo el BTC junto)
          </p>
          <div className="mt-2.5">
            <MultiLineChart
              periodLabels={assetReturns.dates.map(formatShortDate)}
              series={assetReturns.series.map((series) => ({ label: series.assetName, values: series.values }))}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold">Historial</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Cada compra y venta que cargaste, para consultar — el neto actual está arriba, en Posiciones.
        </p>

        {allInvestments.length > 0 && (
          <>
            <div className="mb-3">
              <SearchInput value={historySearch} onChange={setHistorySearch} placeholder="Buscar por activo..." />
            </div>
            <div className="mb-3">
              <InvestmentFilters
                periodFilter={historyPeriodFilter}
                onPeriodFilterChange={setHistoryPeriodFilter}
                kindFilter={historyKindFilter}
                onKindFilterChange={setHistoryKindFilter}
                assetTypeFilter={historyAssetTypeFilter}
                onAssetTypeFilterChange={setHistoryAssetTypeFilter}
              />
            </div>
          </>
        )}

        {allInvestments.length === 0 ? (
          <EmptyState message="Todavía no cargaste ninguna inversión." />
        ) : filteredInvestments.length === 0 ? (
          <EmptyState message="No hay inversiones que coincidan con este filtro." />
        ) : (
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {filteredInvestments.map((investment, index) => (
              <div key={investment.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
                <InvestmentPositionRow
                  investment={investment}
                  latestReturnPercentage={latestValuation(allValuations, investment.id)?.return_percentage ?? null}
                  colorIndex={assetNameColorIndexById.get(investment.asset_name) ?? 0}
                  isAutoQuoted={autoQuotedInvestmentIds.has(investment.id)}
                  onUpdateReturn={(pct) => handleUpdateReturn(investment, pct)}
                  onEdit={() => router.push(`/inversiones/nueva?id=${investment.id}`)}
                  onDelete={() => handleDeleteInvestment(investment)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {dialog}
    </div>
  );
}
