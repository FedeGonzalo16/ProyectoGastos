"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { formatShortDate, formatUsd, todayAsDateInput } from "@/lib/format";
import {
  averagePortfolioReturn,
  groupByAssetName,
  groupByAssetType,
  latestValuation,
  portfolioReturnHistory,
  totalInvestedUsd,
} from "@/lib/aggregations/investmentSummary";
import { InvestmentForm } from "@/components/inversiones/InvestmentForm";
import { InvestmentPositionRow } from "@/components/inversiones/InvestmentPositionRow";
import { DonutChart } from "@/components/charts/DonutChart";
import { DonutLegend } from "@/components/charts/DonutLegend";
import { LineChart } from "@/components/charts/LineChart";
import type { Investment } from "@/lib/types";

/**
 * Inversiones: alta de posiciones (con nombre/ticker propio), conversión a
 * USD como moneda base, distribución por tipo de activo, evolución del
 * rendimiento promedio de la cartera, y el detalle de cada posición.
 */
export default function InversionesPage() {
  const { investments, investmentValuations } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);

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

  const totalUsd = totalInvestedUsd(allInvestments);
  const averageReturn = averagePortfolioReturn(allInvestments, allValuations);
  const assetTypeDistribution = groupByAssetType(allInvestments);
  const positionsByAssetName = groupByAssetName(allInvestments, allValuations);
  const returnHistory = portfolioReturnHistory(allInvestments, allValuations);

  function handleCreateInvestment(input: Omit<Investment, "id" | "user_id" | "created_at" | "updated_at">) {
    const created = investments.create(input);
    // Seed de la primera valuación: recién invertido, todavía sin rendimiento.
    investmentValuations.create({
      investment_id: created.id,
      date: created.date,
      value_usd: created.amount_usd,
      return_percentage: 0,
      notes: null,
    });
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

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Inversiones</h1>
      </header>

      <section
        className="flex gap-3.5 rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className="flex-1">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Total invertido
          </p>
          <p className="font-heading text-2xl font-semibold">{formatUsd(totalUsd)}</p>
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
            {allInvestments.length} {allInvestments.length === 1 ? "posición" : "posiciones"}
          </p>
        </div>
        <div className="w-px" style={{ background: "var(--color-border)" }} />
        <div className="flex-1">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Rendimiento
          </p>
          <p className="font-heading text-2xl font-semibold" style={{ color: "var(--color-good)" }}>
            {averageReturn > 0 ? "+" : ""}
            {averageReturn.toFixed(1)}%
          </p>
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
            promedio cartera
          </p>
        </div>
      </section>

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

      <InvestmentForm onSubmit={handleCreateInvestment} />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Posiciones</h2>
        {allInvestments.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Todavía no cargaste ninguna inversión.
          </p>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {allInvestments.map((investment, index) => (
              <div key={investment.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
                <InvestmentPositionRow
                  investment={investment}
                  latestReturnPercentage={latestValuation(allValuations, investment.id)?.return_percentage ?? null}
                  onUpdateReturn={(pct) => handleUpdateReturn(investment, pct)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {positionsByAssetName.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Totales por activo</h2>
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
                <span>{position.assetName}</span>
                <span className="font-semibold tabular-nums">{formatUsd(position.totalUsd)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
