import { describe, expect, it } from "vitest";
import type { Investment, InvestmentValuation } from "@/lib/types";
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
  requiredMonthlySavingsUsd,
  returnPercentageFromLivePrice,
  totalInvestedUsd,
  totalRealizedGainUsd,
} from "@/lib/aggregations/investmentSummary";

function makeInvestment(overrides: Partial<Investment> & Pick<Investment, "id">): Investment {
  return {
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    date: "2026-01-01",
    asset_type: "cripto",
    asset_name: "BTC",
    kind: "compra",
    amount_original: 100,
    currency_original: "USD",
    exchange_rate: null,
    amount_usd: 100,
    cost_basis_usd: null,
    quantity: null,
    market_symbol: null,
    ...overrides,
  };
}

/** Una venta necesita amount_usd (lo recibido) y cost_basis_usd (lo que libera) — este helper arma las dos. */
function makeSale(overrides: Partial<Investment> & Pick<Investment, "id">): Investment {
  return makeInvestment({ kind: "venta", ...overrides });
}

function makeValuation(overrides: Partial<InvestmentValuation> & Pick<InvestmentValuation, "id" | "investment_id" | "date">): InvestmentValuation {
  return {
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    value_usd: 0,
    return_percentage: 0,
    notes: null,
    ...overrides,
  };
}

describe("totalInvestedUsd", () => {
  it("suma amount_usd de todas las compras", () => {
    const investments = [makeInvestment({ id: "i1", amount_usd: 100 }), makeInvestment({ id: "i2", amount_usd: 250 })];

    expect(totalInvestedUsd(investments)).toBe(350);
  });

  it("una venta resta lo que libera (cost_basis_usd), no lo que recibió", () => {
    const investments = [
      makeInvestment({ id: "i1", amount_usd: 1000 }),
      makeSale({ id: "i2", amount_usd: 1500, cost_basis_usd: 600 }), // recibió 1500, pero libera 600
    ];

    expect(totalInvestedUsd(investments)).toBe(400);
  });

  it("una venta huérfana (de un activo sin ninguna compra) no resta del resto de la cartera", () => {
    // Dato corrupto/viejo: una venta de SPY500 sin compra que la respalde no
    // debería poder dejar el total por debajo de lo que sí es real (BTC).
    // Antes de este fix, el total daba 30 - 5 = 25 aunque "Posiciones" solo
    // mostrara BTC en $30 — el $25 no coincidía con nada visible en pantalla.
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 30 }),
      makeSale({ id: "i2", asset_name: "SPY500", amount_usd: 10, cost_basis_usd: 5 }),
    ];

    expect(totalInvestedUsd(investments)).toBe(30);
  });

  it("siempre coincide exactamente con la suma de lo que muestra groupByAssetName (Posiciones)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 30 }),
      makeInvestment({ id: "i2", asset_name: "SPY500", amount_usd: 1000 }),
      makeSale({ id: "i3", asset_name: "SPY500", amount_usd: 1500, cost_basis_usd: 1000 }), // vendida entera
      makeSale({ id: "i4", asset_name: "ETH", amount_usd: 10, cost_basis_usd: 5 }), // huérfana
    ];

    const sumOfPositions = groupByAssetName(investments, []).reduce((sum, position) => sum + position.totalUsd, 0);

    expect(totalInvestedUsd(investments)).toBe(sumOfPositions);
    expect(totalInvestedUsd(investments)).toBe(30);
  });
});

describe("groupByAssetType", () => {
  it("agrupa por tipo de activo en el orden fijo cripto/etf/moneda/otro", () => {
    // Nombres distintos por tipo — un mismo activo (mismo asset_name) siempre
    // es del mismo tipo en uso real, groupByAssetType asume eso.
    const investments = [
      makeInvestment({ id: "i1", asset_name: "SPY500", asset_type: "etf", amount_usd: 100 }),
      makeInvestment({ id: "i2", asset_name: "BTC", asset_type: "cripto", amount_usd: 50 }),
      makeInvestment({ id: "i3", asset_name: "ETH", asset_type: "cripto", amount_usd: 50 }),
    ];

    const result = groupByAssetType(investments);

    expect(result).toEqual([
      { label: "Cripto", value: 100, colorIndex: 0 },
      { label: "ETF", value: 100, colorIndex: 1 },
    ]);
  });

  it("deja afuera un tipo cuyo neto quedó en 0 o negativo (posición cerrada)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_type: "cripto", amount_usd: 500 }),
      makeSale({ id: "i2", asset_type: "cripto", amount_usd: 700, cost_basis_usd: 500 }),
    ];

    expect(groupByAssetType(investments)).toEqual([]);
  });
});

describe("latestValuation", () => {
  it("devuelve la valuación más reciente de esa inversión puntual", () => {
    const valuations = [
      makeValuation({ id: "v1", investment_id: "i1", date: "2026-06-01", return_percentage: 10 }),
      makeValuation({ id: "v2", investment_id: "i1", date: "2026-08-01", return_percentage: 25 }),
      makeValuation({ id: "v3", investment_id: "i2", date: "2026-09-01", return_percentage: 90 }),
    ];

    expect(latestValuation(valuations, "i1")?.return_percentage).toBe(25);
  });

  it("devuelve undefined si esa inversión nunca tuvo una valuación", () => {
    expect(latestValuation([], "i1")).toBeUndefined();
  });
});

describe("averagePortfolioReturn", () => {
  it("pondera el rendimiento por el monto invertido de cada posición", () => {
    // i1: US$100 al 10% ; i2: US$900 al 50% → promedio ponderado, no (10+50)/2
    const investments = [makeInvestment({ id: "i1", amount_usd: 100 }), makeInvestment({ id: "i2", amount_usd: 900 })];
    const valuations = [
      makeValuation({ id: "v1", investment_id: "i1", date: "2026-08-01", return_percentage: 10 }),
      makeValuation({ id: "v2", investment_id: "i2", date: "2026-08-01", return_percentage: 50 }),
    ];

    expect(averagePortfolioReturn(investments, valuations)).toBe(46);
  });

  it("devuelve 0 si ninguna posición tiene valuación todavía", () => {
    const investments = [makeInvestment({ id: "i1" })];

    expect(averagePortfolioReturn(investments, [])).toBe(0);
  });

  it("un activo totalmente vendido no pesa en el promedio (ya no es parte de la cartera actual)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 100 }), // se mantiene, al 10%
      makeInvestment({ id: "i2", asset_name: "SPY500", amount_usd: 900 }), // vendida entera más abajo, al 50%
      makeSale({ id: "i3", asset_name: "SPY500", amount_usd: 1200, cost_basis_usd: 900 }),
    ];
    const valuations = [
      makeValuation({ id: "v1", investment_id: "i1", date: "2026-08-01", return_percentage: 10 }),
      makeValuation({ id: "v2", investment_id: "i2", date: "2026-08-01", return_percentage: 50 }),
    ];

    // Si SPY500 (vendida) siguiera pesando, daría 46 (igual que el test de
    // arriba) — al quedar afuera, el promedio es 100% BTC: 10%.
    expect(averagePortfolioReturn(investments, valuations)).toBe(10);
  });
});

describe("groupByAssetName", () => {
  it("junta todas las cargas de un mismo nombre de activo (ej. varias compras de BTC)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 100 }),
      makeInvestment({ id: "i2", asset_name: "BTC", amount_usd: 200 }),
      makeInvestment({ id: "i3", asset_name: "SPY500", amount_usd: 50 }),
    ];

    const result = groupByAssetName(investments, []);

    expect(result).toEqual([
      { assetName: "BTC", assetType: "cripto", totalUsd: 300, percentageOfTotal: (300 / 350) * 100, latestReturnPercentage: null },
      { assetName: "SPY500", assetType: "cripto", totalUsd: 50, percentageOfTotal: (50 / 350) * 100, latestReturnPercentage: null },
    ]);
  });

  it("el % de cada posición es sobre el total invertido, y todas suman ~100", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 50 }),
      makeInvestment({ id: "i2", asset_name: "USDT", amount_usd: 50 }),
    ];

    const result = groupByAssetName(investments, []);

    expect(result.find((p) => p.assetName === "BTC")?.percentageOfTotal).toBe(50);
    expect(result.find((p) => p.assetName === "USDT")?.percentageOfTotal).toBe(50);
  });

  it("da 0% para todas si no hay nada invertido (evita dividir por cero)", () => {
    const investments = [makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 1000 }), makeSale({ id: "i2", asset_name: "BTC", amount_usd: 1500, cost_basis_usd: 1000 })];

    // El activo queda afuera por completo (neto 0), así que no hay ninguna
    // posición cuyo % verificar acá — pero confirma que groupByAssetName no
    // explota (NaN/Infinity) cuando totalInvestedUsd da 0.
    expect(groupByAssetName(investments, [])).toEqual([]);
  });

  it("ordena de mayor a menor monto total invertido", () => {
    const investments = [makeInvestment({ id: "i1", asset_name: "SPY500", amount_usd: 50 }), makeInvestment({ id: "i2", asset_name: "BTC", amount_usd: 300 })];

    expect(groupByAssetName(investments, []).map((position) => position.assetName)).toEqual(["BTC", "SPY500"]);
  });

  it("una venta parcial reduce el neto del activo sin sacarlo de la lista", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 1000 }),
      makeSale({ id: "i2", asset_name: "BTC", amount_usd: 500, cost_basis_usd: 400 }),
    ];

    const [position] = groupByAssetName(investments, []);

    expect(position).toMatchObject({ assetName: "BTC", totalUsd: 600 });
  });

  it("un activo totalmente vendido no aparece (nada vigente que mostrar)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 1000 }),
      makeSale({ id: "i2", asset_name: "BTC", amount_usd: 1500, cost_basis_usd: 1000 }),
    ];

    expect(groupByAssetName(investments, [])).toEqual([]);
  });

  it("el % de rendimiento promedio de un activo solo cuenta las compras (una venta nunca tiene valuación)", () => {
    const investments = [
      makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 1000 }),
      makeSale({ id: "i2", asset_name: "BTC", amount_usd: 200, cost_basis_usd: 100 }),
    ];
    const valuations = [makeValuation({ id: "v1", investment_id: "i1", date: "2026-08-01", return_percentage: 20 })];

    const [position] = groupByAssetName(investments, valuations);

    expect(position.latestReturnPercentage).toBe(20);
  });
});

describe("totalRealizedGainUsd", () => {
  it("suma la ganancia (recibido - costo) de cada venta", () => {
    const investments = [
      makeSale({ id: "i1", amount_usd: 1500, cost_basis_usd: 1000 }), // +500
      makeSale({ id: "i2", amount_usd: 300, cost_basis_usd: 400 }), // -100
    ];

    expect(totalRealizedGainUsd(investments)).toBe(400);
  });

  it("ignora las compras", () => {
    expect(totalRealizedGainUsd([makeInvestment({ id: "i1", amount_usd: 1000 })])).toBe(0);
  });

  it("da negativo si en conjunto las ventas fueron con pérdida", () => {
    expect(totalRealizedGainUsd([makeSale({ id: "i1", amount_usd: 100, cost_basis_usd: 300 })])).toBe(-200);
  });
});

describe("investmentContributionAmounts", () => {
  it("solo incluye compras — una venta no es un aporte nuevo", () => {
    const investments = [
      makeInvestment({ id: "i1", date: "2026-08-01", amount_usd: 500 }),
      makeSale({ id: "i2", date: "2026-08-02", amount_usd: 1500, cost_basis_usd: 1000 }),
    ];

    expect(investmentContributionAmounts(investments)).toEqual([{ date: "2026-08-01", amount: 500 }]);
  });
});

describe("portfolioReturnHistory / portfolioValueHistory", () => {
  const investments = [makeInvestment({ id: "i1", amount_usd: 100 })];
  const valuations = [
    makeValuation({ id: "v1", investment_id: "i1", date: "2026-07-01", return_percentage: 10, value_usd: 110 }),
    makeValuation({ id: "v2", investment_id: "i1", date: "2026-08-01", return_percentage: 20, value_usd: 120 }),
  ];

  it("arma un punto por cada fecha en la que se cargó alguna valuación", () => {
    expect(portfolioReturnHistory(investments, valuations)).toEqual([
      { date: "2026-07-01", averageReturn: 10 },
      { date: "2026-08-01", averageReturn: 20 },
    ]);
  });

  it("suma el valor de la valuación más reciente de cada inversión hasta esa fecha", () => {
    expect(portfolioValueHistory(investments, valuations)).toEqual([
      { date: "2026-07-01", totalValueUsd: 110 },
      { date: "2026-08-01", totalValueUsd: 120 },
    ]);
  });
});

describe("assetReturnHistory", () => {
  it("deja null en las fechas anteriores a que el activo tuviera alguna posición cargada", () => {
    const investments = [makeInvestment({ id: "i1", asset_name: "BTC", amount_usd: 100 })];
    const valuations = [
      makeValuation({ id: "v1", investment_id: "otro-activo-no-relacionado", date: "2026-06-01", return_percentage: 5 }),
      makeValuation({ id: "v2", investment_id: "i1", date: "2026-08-01", return_percentage: 15 }),
    ];

    const { dates, series } = assetReturnHistory(investments, valuations);

    expect(dates).toEqual(["2026-06-01", "2026-08-01"]);
    expect(series).toEqual([{ assetName: "BTC", values: [null, 15] }]);
  });
});

describe("requiredMonthlySavingsUsd", () => {
  it("devuelve null si falta el monto objetivo o la fecha objetivo", () => {
    expect(requiredMonthlySavingsUsd(null, "2027-01-01", 0, { year: 2026, month: 8 })).toBeNull();
    expect(requiredMonthlySavingsUsd(1000, null, 0, { year: 2026, month: 8 })).toBeNull();
  });

  it("devuelve 0 si la meta ya se alcanzó", () => {
    expect(requiredMonthlySavingsUsd(1000, "2027-01-01", 1500, { year: 2026, month: 8 })).toBe(0);
  });

  it("reparte lo que falta entre los meses restantes, incluyendo el actual", () => {
    // Faltan US$600, de agosto a diciembre 2026 inclusive = 5 meses.
    expect(requiredMonthlySavingsUsd(1000, "2026-12-31", 400, { year: 2026, month: 8 })).toBe(120);
  });

  it("si la fecha objetivo ya pasó, exige todo lo que falta en el mes actual", () => {
    expect(requiredMonthlySavingsUsd(1000, "2026-01-01", 400, { year: 2026, month: 8 })).toBe(600);
  });
});

describe("autoQuoteCandidates", () => {
  it("incluye una compra de cripto con cantidad y símbolo reconocido", () => {
    const investment = makeInvestment({ id: "i1", quantity: 0.5, market_symbol: "BTC" });

    expect(autoQuoteCandidates([investment])).toEqual([{ investment, coinGeckoId: "bitcoin" }]);
  });

  it("excluye una venta aunque tenga cantidad y símbolo", () => {
    const investment = makeSale({ id: "i1", quantity: 0.5, market_symbol: "BTC", cost_basis_usd: 50 });

    expect(autoQuoteCandidates([investment])).toEqual([]);
  });

  it("excluye asset_type que no sea cripto", () => {
    const investment = makeInvestment({ id: "i1", asset_type: "etf", quantity: 1, market_symbol: "BTC" });

    expect(autoQuoteCandidates([investment])).toEqual([]);
  });

  it("excluye si falta cantidad o símbolo", () => {
    const sinCantidad = makeInvestment({ id: "i1", quantity: null, market_symbol: "BTC" });
    const sinSimbolo = makeInvestment({ id: "i2", quantity: 0.5, market_symbol: null });

    expect(autoQuoteCandidates([sinCantidad, sinSimbolo])).toEqual([]);
  });

  it("excluye un símbolo que no está en la lista de CoinGecko", () => {
    const investment = makeInvestment({ id: "i1", quantity: 10, market_symbol: "NOEXISTE" });

    expect(autoQuoteCandidates([investment])).toEqual([]);
  });

  it("excluye una compra sin costo cargado (Monto en 0, ahora opcional para cripto) — no hay nada contra qué comparar", () => {
    const investment = makeInvestment({ id: "i1", quantity: 0.5, market_symbol: "BTC", amount_usd: 0 });

    expect(autoQuoteCandidates([investment])).toEqual([]);
  });
});

describe("returnPercentageFromLivePrice", () => {
  it("calcula el % a partir de cantidad × precio en vivo", () => {
    // Se aportaron US$100 comprando 0.01 BTC; hoy 0.01 BTC vale US$120 → +20%.
    const investment = makeInvestment({ id: "i1", amount_usd: 100, quantity: 0.01 });

    expect(returnPercentageFromLivePrice(investment, 12000)).toBe(20);
  });

  it("da negativo si el valor actual es menor a lo aportado", () => {
    const investment = makeInvestment({ id: "i1", amount_usd: 100, quantity: 0.01 });

    expect(returnPercentageFromLivePrice(investment, 8000)).toBe(-20);
  });

  it("devuelve 0 si amount_usd es 0 (no hay contra qué comparar)", () => {
    const investment = makeInvestment({ id: "i1", amount_usd: 0, quantity: 0.01 });

    expect(returnPercentageFromLivePrice(investment, 12000)).toBe(0);
  });
});
