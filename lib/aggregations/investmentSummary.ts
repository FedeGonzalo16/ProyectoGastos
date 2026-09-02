import type { AssetType, Investment, InvestmentValuation } from "@/lib/types";
import type { DonutChartItem } from "@/components/charts/DonutChart";
import { monthsBetweenInclusive, yearMonthFromDate, type YearMonth } from "@/lib/dateRange";
import { resolveCoinGeckoId } from "@/lib/crypto/coinGeckoIds";
import { ASSET_TYPE_LABELS } from "@/lib/assetTypes";

/**
 * Cuánto aporta una fila al total invertido: una compra suma su monto, una
 * venta resta lo que libera (`cost_basis_usd`) — no lo que recibió (eso es
 * la ganancia/pérdida realizada, ver `totalRealizedGainUsd`).
 */
function netAmountUsd(investment: Investment): number {
  return investment.kind === "venta" ? -(investment.cost_basis_usd ?? 0) : investment.amount_usd;
}

/**
 * Neto (compras menos lo liberado por ventas) por nombre de activo — la
 * ÚNICA fuente de verdad de "cuánto hay invertido en cada cosa", que usan
 * `totalInvestedUsd`, `groupByAssetType` y `groupByAssetName` (Posiciones)
 * por igual, para que sea matemáticamente imposible que el total general y
 * la suma de lo que se ve en Posiciones queden desincronizados.
 *
 * El formulario ya valida que no se pueda vender más de lo invertido, pero
 * por las dudas (ej. un dato viejo de antes de esa validación) acá también
 * se recorta cada activo a un mínimo de 0 antes de sumarlo al total — un
 * activo "en rojo" no resta del resto de la cartera, en el peor de los
 * casos no aporta nada.
 */
function netByAssetName(investments: Investment[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const investment of investments) {
    const key = investment.asset_name;
    totals.set(key, (totals.get(key) ?? 0) + netAmountUsd(investment));
  }
  return totals;
}

/**
 * Cálculos sobre inversiones y su historial de valuaciones, siempre a partir
 * de listas ya cargadas en memoria (copia local) — funciones puras, sin
 * conocimiento de Supabase, para que la pantalla de Inversiones y (más
 * adelante) el Dashboard las puedan compartir.
 */

// Orden fijo: el color de "cripto" es siempre el mismo, tenga o no otras
// posiciones al lado — no depende de cuáles tipos estén presentes ni de su
// tamaño relativo (mismo criterio que las categorías de gasto/ingreso).
// Cedear/bono se agregaron al final a propósito, para no correr el color ya
// asignado a moneda/otro en carteras que ya los tenían cargados.
const ASSET_TYPE_ORDER: AssetType[] = ["cripto", "etf", "moneda", "otro", "cedear", "bono"];

/**
 * Capital neto todavía invertido: compras menos lo liberado por ventas, sumado
 * activo por activo (nunca la fila suelta) — exactamente lo mismo que suma
 * "Posiciones" en la pantalla, así los dos números nunca pueden discrepar.
 */
export function totalInvestedUsd(investments: Investment[]): number {
  return Array.from(netByAssetName(investments).values()).reduce((total, net) => total + Math.max(0, net), 0);
}

/**
 * Suma de `amount_usd - cost_basis_usd` de cada venta — la ganancia (o
 * pérdida, si da negativo) ya realizada, no la de posiciones que seguís
 * teniendo.
 */
export function totalRealizedGainUsd(investments: Investment[]): number {
  return investments
    .filter((investment) => investment.kind === "venta")
    .reduce((total, investment) => total + (investment.amount_usd - (investment.cost_basis_usd ?? 0)), 0);
}

/**
 * Solo las compras — a diferencia de `totalInvestedUsd` (capital neto), esto
 * es "cuánto metiste de nuevo": una venta no es un aporte, así que ni suma
 * ni resta acá. La usan la meta de inversión y el gráfico de comparación
 * mensual (dashboard, Inversiones, y la notificación de meta cumplida).
 */
export function investmentContributionAmounts(investments: Investment[]): { date: string; amount: number }[] {
  return investments
    .filter((investment) => investment.kind === "compra")
    .map((investment) => ({ date: investment.date, amount: investment.amount_usd }));
}

/**
 * Distribución de la cartera por tipo de activo, para la torta — se arma a
 * partir del neto por activo (`netByAssetName`), no de las filas sueltas, y
 * un activo que quedó en 0 o negativo no aporta nada (mismo criterio que
 * `totalInvestedUsd`/`groupByAssetName`).
 */
export function groupByAssetType(investments: Investment[]): DonutChartItem[] {
  const typeByAssetName = new Map<string, AssetType>();
  for (const investment of investments) {
    if (!typeByAssetName.has(investment.asset_name)) typeByAssetName.set(investment.asset_name, investment.asset_type);
  }

  const totalsByType = new Map<AssetType, number>();
  for (const [assetName, net] of netByAssetName(investments)) {
    if (net <= 0) continue;
    const type = typeByAssetName.get(assetName)!;
    totalsByType.set(type, (totalsByType.get(type) ?? 0) + net);
  }

  return ASSET_TYPE_ORDER.filter((type) => (totalsByType.get(type) ?? 0) > 0).map((type) => ({
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

/** Igual que `latestValuation`, pero solo mirando hacia atrás desde una fecha puntual — para reconstruir el historial. */
function valuationAsOfDate(
  valuations: InvestmentValuation[],
  investmentId: string,
  date: string
): InvestmentValuation | undefined {
  return valuations
    .filter((valuation) => valuation.investment_id === investmentId && valuation.date <= date)
    .sort((a, b) => (a.date > b.date ? -1 : 1))[0];
}

/**
 * Rendimiento promedio ponderado (por monto invertido) de un grupo de
 * inversiones a una fecha puntual — las que todavía no tenían ninguna
 * valuación en esa fecha quedan afuera del promedio. `null` si ninguna del
 * grupo existía todavía.
 */
function weightedReturnAsOfDate(investments: Investment[], valuations: InvestmentValuation[], date: string): number | null {
  const weighted = investments
    .map((investment) => {
      const valuation = valuationAsOfDate(valuations, investment.id, date);
      return valuation === undefined ? null : { returnPercentage: valuation.return_percentage, weight: investment.amount_usd };
    })
    .filter((entry): entry is { returnPercentage: number; weight: number } => entry !== null);

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return null;

  return weighted.reduce((sum, entry) => sum + entry.returnPercentage * entry.weight, 0) / totalWeight;
}

/** Todas las fechas en las que se cargó alguna valuación (de cualquier inversión), sin repetir y en orden cronológico. */
function distinctValuationDates(valuations: InvestmentValuation[]): string[] {
  return Array.from(new Set(valuations.map((valuation) => valuation.date))).sort();
}

/**
 * Rendimiento promedio de la cartera, ponderado por el monto invertido en
 * USD de cada posición — una posición de US$5.000 pesa 100 veces más que
 * una de US$50, no lo mismo (un promedio simple las trataría igual). Un
 * activo ya vendido del todo (neto en 0 o negativo) no pesa nada — sería
 * raro que su rendimiento "cuente" en el promedio de HOY si ya no lo tenés.
 *
 * Nota: si vendiste solo una PARTE de una posición con varias compras
 * separadas, cada compra sigue pesando por su monto ORIGINAL completo (no
 * se reparte la venta entre ellas) — ver el comentario en el plan sobre esta
 * limitación aceptada, no se resuelve acá.
 */
export function averagePortfolioReturn(investments: Investment[], valuations: InvestmentValuation[]): number {
  const netTotals = netByAssetName(investments);
  const weighted = investments
    .filter((investment) => (netTotals.get(investment.asset_name) ?? 0) > 0)
    .map((investment) => {
      const returnPercentage = latestValuation(valuations, investment.id)?.return_percentage;
      return returnPercentage === undefined ? null : { returnPercentage, weight: investment.amount_usd };
    })
    .filter((entry): entry is { returnPercentage: number; weight: number } => entry !== null);

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = weighted.reduce((sum, entry) => sum + entry.returnPercentage * entry.weight, 0);
  return weightedSum / totalWeight;
}

export interface AssetPosition {
  assetName: string;
  assetType: AssetType;
  totalUsd: number;
  /** Qué porción del total invertido (`totalInvestedUsd`) es este activo — ej. 50 = 50%. Las de todas las posiciones devueltas suman ~100. */
  percentageOfTotal: number;
  /** Rendimiento promedio, si hay más de una carga bajo el mismo nombre de activo. */
  latestReturnPercentage: number | null;
}

/**
 * Totales agrupados por nombre de activo real (ej. todas las cargas de "BTC"
 * juntas) — un activo totalmente vendido (neto en 0 o negativo) no aparece,
 * no hay nada vigente que mostrar de él.
 */
export function groupByAssetName(
  investments: Investment[],
  valuations: InvestmentValuation[]
): AssetPosition[] {
  const byAssetName = new Map<string, Investment[]>();
  for (const investment of investments) {
    const key = investment.asset_name;
    byAssetName.set(key, [...(byAssetName.get(key) ?? []), investment]);
  }
  const netTotals = netByAssetName(investments);
  // Mismo total que `totalInvestedUsd` (recortado a 0 por activo) — así el %
  // de cada posición es sobre la misma base que ya se muestra como "Total
  // invertido", nunca sobre una cuenta distinta.
  const totalUsd = totalInvestedUsd(investments);

  return Array.from(byAssetName.entries())
    .map(([assetName, group]) => {
      // Las valuaciones (y por lo tanto el % de rendimiento) solo existen
      // para compras — una venta nunca tiene una, así que `latestValuation`
      // da `undefined` y queda afuera del promedio sola, sin filtro extra.
      const returns = group
        .map((investment) => latestValuation(valuations, investment.id)?.return_percentage)
        .filter((value): value is number => value !== undefined);
      const assetTotalUsd = netTotals.get(assetName) ?? 0;

      return {
        assetName,
        assetType: group[0].asset_type,
        totalUsd: assetTotalUsd,
        percentageOfTotal: totalUsd > 0 ? (assetTotalUsd / totalUsd) * 100 : 0,
        latestReturnPercentage: returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : null,
      };
    })
    .filter((position) => position.totalUsd > 0)
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

/**
 * Serie cronológica del rendimiento promedio (ponderado por monto, igual
 * criterio que `averagePortfolioReturn`) de la cartera, un punto por cada
 * fecha en la que se actualizó alguna valuación. Para cada fecha, usa la
 * valuación más reciente de cada inversión hasta ese momento (las que
 * todavía no existían en esa fecha no entran en el promedio de ese punto).
 */
export function portfolioReturnHistory(
  investments: Investment[],
  valuations: InvestmentValuation[]
): { date: string; averageReturn: number }[] {
  return distinctValuationDates(valuations).map((date) => ({
    date,
    averageReturn: weightedReturnAsOfDate(investments, valuations, date) ?? 0,
  }));
}

export interface PortfolioValuePoint {
  date: string;
  totalValueUsd: number;
}

/**
 * Serie cronológica del valor total de la cartera en USD — a diferencia de
 * `portfolioReturnHistory` (que promedia el % de rendimiento), acá se suma
 * directamente el valor de la valuación más reciente de cada inversión hasta
 * esa fecha. Es "cuánto vale hoy lo invertido", no "cuánto se invirtió"
 * (`totalInvestedUsd`) — la diferencia entre ambos es el rendimiento.
 */
export function portfolioValueHistory(investments: Investment[], valuations: InvestmentValuation[]): PortfolioValuePoint[] {
  return distinctValuationDates(valuations).map((date) => ({
    date,
    totalValueUsd: investments.reduce(
      (sum, investment) => sum + (valuationAsOfDate(valuations, investment.id, date)?.value_usd ?? 0),
      0
    ),
  }));
}

export interface AssetReturnSeries {
  assetName: string;
  /** `null` en las fechas anteriores a que este activo tuviera alguna posición cargada — no se "inventa" un valor previo. */
  values: (number | null)[];
}

/**
 * Evolución del rendimiento (%) de cada activo por separado (agrupando todas
 * las posiciones que comparten `asset_name`, igual que `groupByAssetName`),
 * para compararlos en un mismo gráfico de varias líneas. Las series quedan
 * ordenadas de mayor a menor monto invertido — el mismo orden que "Totales
 * por activo" — así el color de cada línea coincide con el de esa lista.
 */
export function assetReturnHistory(
  investments: Investment[],
  valuations: InvestmentValuation[]
): { dates: string[]; series: AssetReturnSeries[] } {
  const dates = distinctValuationDates(valuations);

  const investmentsByAssetName = new Map<string, Investment[]>();
  for (const investment of investments) {
    investmentsByAssetName.set(investment.asset_name, [
      ...(investmentsByAssetName.get(investment.asset_name) ?? []),
      investment,
    ]);
  }

  const series = Array.from(investmentsByAssetName.entries())
    .sort(([, a], [, b]) => totalInvestedUsd(b) - totalInvestedUsd(a))
    .map(([assetName, group]) => ({
      assetName,
      values: dates.map((date) => weightedReturnAsOfDate(group, valuations, date)),
    }));

  return { dates, series };
}

export interface AutoQuoteCandidate {
  investment: Investment;
  /** Id de CoinGecko ya resuelto (ver `lib/crypto/coinGeckoIds.ts`) — nunca `market_symbol` tal cual, ese es el ticker que escribió el usuario. */
  coinGeckoId: string;
}

/**
 * Compras de cripto con cantidad y símbolo de mercado reconocido — las
 * únicas elegibles para cotización automática (ver `hooks/useAutoCryptoQuotes.ts`).
 * Una venta nunca lo es (ya es una operación cerrada, mismo criterio que las
 * valuaciones manuales); ETF/moneda/otro tampoco, todavía no hay una fuente
 * de precios para esos tipos.
 */
export function autoQuoteCandidates(investments: Investment[]): AutoQuoteCandidate[] {
  return investments
    .filter(
      (investment) =>
        investment.kind === "compra" &&
        investment.asset_type === "cripto" &&
        investment.quantity !== null &&
        investment.quantity > 0 &&
        investment.market_symbol !== null &&
        // Sin costo cargado (Monto quedó en 0, ahora es opcional para cripto)
        // no hay nada contra qué comparar el valor actual — no tiene sentido
        // calcular un % ahí, quedaría siempre en 0 sin aportar nada.
        investment.amount_usd > 0
    )
    .map((investment) => ({ investment, coinGeckoId: resolveCoinGeckoId(investment.market_symbol!) }))
    .filter((candidate): candidate is AutoQuoteCandidate => candidate.coinGeckoId !== null);
}

/**
 * % de rendimiento a partir de un precio de mercado en vivo — mismo cálculo
 * que si se hubiera cargado a mano (`(valorActual - aportado) / aportado`),
 * solo que el valor actual sale de `cantidad × precio` en vez de escribirse.
 */
export function returnPercentageFromLivePrice(investment: Investment, priceUsd: number): number {
  if (investment.amount_usd <= 0) return 0;
  const currentValueUsd = (investment.quantity ?? 0) * priceUsd;
  return ((currentValueUsd - investment.amount_usd) / investment.amount_usd) * 100;
}

/**
 * Cuánto habría que ahorrar por mes, de ahora en adelante, para llegar al
 * monto objetivo en la fecha objetivo — repartiendo lo que falta entre los
 * meses que quedan (incluyendo el actual). `null` si falta el monto o la
 * fecha (no hay nada que calcular), `0` si la meta ya se alcanzó.
 */
export function requiredMonthlySavingsUsd(
  targetAmountUsd: number | null,
  targetDate: string | null,
  totalInvestedUsd: number,
  currentMonth: YearMonth
): number | null {
  if (targetAmountUsd === null || targetDate === null) return null;

  const remaining = targetAmountUsd - totalInvestedUsd;
  if (remaining <= 0) return 0;

  // Si la fecha objetivo ya pasó (o es este mes), no hay margen: haría falta
  // poner todo lo que falta ahora mismo.
  const monthsLeft = Math.max(1, monthsBetweenInclusive(currentMonth, yearMonthFromDate(targetDate)));
  return remaining / monthsLeft;
}
