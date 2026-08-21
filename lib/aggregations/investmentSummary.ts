import type { AssetType, Investment, InvestmentValuation } from "@/lib/types";
import type { DonutChartItem } from "@/components/charts/DonutChart";

/**
 * Cálculos sobre inversiones y su historial de valuaciones, siempre a partir
 * de listas ya cargadas en memoria (copia local) — funciones puras, sin
 * conocimiento de Supabase, para que la pantalla de Inversiones y (más
 * adelante) el Dashboard las puedan compartir.
 */

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cripto: "Cripto",
  etf: "ETF",
  moneda: "Moneda",
  otro: "Otro",
};

// Orden fijo: el color de "cripto" es siempre el mismo, tenga o no otras
// posiciones al lado — no depende de cuáles tipos estén presentes ni de su
// tamaño relativo (mismo criterio que las categorías de gasto/ingreso).
const ASSET_TYPE_ORDER: AssetType[] = ["cripto", "etf", "moneda", "otro"];

export function totalInvestedUsd(investments: Investment[]): number {
  return investments.reduce((total, investment) => total + investment.amount_usd, 0);
}

/** Distribución de la cartera por tipo de activo, para la torta. */
export function groupByAssetType(investments: Investment[]): DonutChartItem[] {
  const totalsByType = new Map<AssetType, number>();
  for (const investment of investments) {
    totalsByType.set(investment.asset_type, (totalsByType.get(investment.asset_type) ?? 0) + investment.amount_usd);
  }

  return ASSET_TYPE_ORDER.filter((type) => totalsByType.has(type)).map((type) => ({
    label: ASSET_TYPE_LABELS[type],
    value: totalsByType.get(type) ?? 0,
    colorIndex: ASSET_TYPE_ORDER.indexOf(type),
  }));
}

/** La valuación más reciente de una inversión puntual (o `undefined` si nunca se actualizó). */
export function latestValuation(
  valuations: InvestmentValuation[],
  investmentId: string
): InvestmentValuation | undefined {
  return valuations
    .filter((valuation) => valuation.investment_id === investmentId)
    .sort((a, b) => (a.date > b.date ? -1 : 1))[0];
}

/**
 * Rendimiento promedio de la cartera: el promedio simple del % más reciente
 * de cada inversión (no pesado por monto). Una simplificación deliberada —
 * ponderar por tamaño de posición es una mejora posible más adelante, pero
 * no imprescindible para ver la cartera de un vistazo.
 */
export function averagePortfolioReturn(investments: Investment[], valuations: InvestmentValuation[]): number {
  const latestReturns = investments
    .map((investment) => latestValuation(valuations, investment.id)?.return_percentage)
    .filter((value): value is number => value !== undefined);

  if (latestReturns.length === 0) return 0;
  return latestReturns.reduce((sum, value) => sum + value, 0) / latestReturns.length;
}

export interface AssetPosition {
  assetName: string;
  assetType: AssetType;
  totalUsd: number;
  /** Rendimiento promedio, si hay más de una carga bajo el mismo nombre de activo. */
  latestReturnPercentage: number | null;
}

/** Totales agrupados por nombre de activo real (ej. todas las cargas de "BTC" juntas). */
export function groupByAssetName(
  investments: Investment[],
  valuations: InvestmentValuation[]
): AssetPosition[] {
  const byAssetName = new Map<string, Investment[]>();
  for (const investment of investments) {
    const key = investment.asset_name;
    byAssetName.set(key, [...(byAssetName.get(key) ?? []), investment]);
  }

  return Array.from(byAssetName.entries())
    .map(([assetName, group]) => {
      const returns = group
        .map((investment) => latestValuation(valuations, investment.id)?.return_percentage)
        .filter((value): value is number => value !== undefined);

      return {
        assetName,
        assetType: group[0].asset_type,
        totalUsd: group.reduce((sum, investment) => sum + investment.amount_usd, 0),
        latestReturnPercentage: returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : null,
      };
    })
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

/**
 * Serie cronológica del rendimiento promedio de la cartera, un punto por
 * cada fecha en la que se actualizó alguna valuación. Para cada fecha, usa
 * la valuación más reciente de cada inversión hasta ese momento (las que
 * todavía no existían en esa fecha no entran en el promedio de ese punto).
 */
export function portfolioReturnHistory(
  investments: Investment[],
  valuations: InvestmentValuation[]
): { date: string; averageReturn: number }[] {
  const distinctDates = Array.from(new Set(valuations.map((v) => v.date))).sort();

  return distinctDates.map((date) => {
    const returnsAsOfDate = investments
      .map((investment) => {
        const upToDate = valuations
          .filter((v) => v.investment_id === investment.id && v.date <= date)
          .sort((a, b) => (a.date > b.date ? -1 : 1));
        return upToDate[0]?.return_percentage;
      })
      .filter((value): value is number => value !== undefined);

    const averageReturn =
      returnsAsOfDate.length > 0 ? returnsAsOfDate.reduce((sum, r) => sum + r, 0) / returnsAsOfDate.length : 0;

    return { date, averageReturn };
  });
}
