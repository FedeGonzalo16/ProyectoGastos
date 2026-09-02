import { describe, expect, it } from "vitest";
import type { Category, CategoryBudget, Expense, FixedExpense, FixedIncome, Income, Investment } from "@/lib/types";
import {
  buildCategoryBudgetRows,
  buildCategoryRows,
  buildExpenseRows,
  buildFixedExpenseRows,
  buildFixedIncomeRows,
  buildIncomeRows,
  buildInvestmentRows,
} from "@/lib/export/buildExportRows";

function makeCategory(overrides: Partial<Category> & Pick<Category, "id" | "name" | "kind">): Category {
  return {
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    color: null,
    active: true,
    sort_order: 0,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
    user_id: "user-1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    date: "2026-08-01",
    amount: 1000,
    category_id: null,
    description: null,
    payment_method: null,
    is_fixed: false,
    fixed_expense_id: null,
    due_date: null,
    is_paid: false,
    installment_number: null,
    installment_count: null,
    installment_group_id: null,
    tag: null,
    ...overrides,
  };
}

function makeIncome(overrides: Partial<Income> & Pick<Income, "id">): Income {
  return {
    user_id: "user-1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    date: "2026-08-01",
    amount: 500000,
    category_id: null,
    description: null,
    is_fixed: false,
    fixed_income_id: null,
    ...overrides,
  };
}

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

describe("buildExpenseRows", () => {
  it("resuelve la categoría a nombre y arma 'cuota' como N/total", () => {
    const categoriesById = new Map([["c1", makeCategory({ id: "c1", name: "Comida", kind: "gasto" })]]);
    const rows = buildExpenseRows(
      [makeExpense({ id: "e1", category_id: "c1", installment_number: 2, installment_count: 6, payment_method: "credito" })],
      categoriesById
    );

    expect(rows[0]["Categoría"]).toBe("Comida");
    expect(rows[0]["Cuota"]).toBe("2/6");
    expect(rows[0]["Medio de pago"]).toBe("Crédito");
  });

  it("un gasto sin categoría/vencimiento queda con los campos vacíos, no null ni undefined", () => {
    const rows = buildExpenseRows([makeExpense({ id: "e1" })], new Map());

    expect(rows[0]["Categoría"]).toBe("Sin categoría");
    expect(rows[0]["Cuota"]).toBe("");
    expect(rows[0]["Pagado"]).toBe("");
  });
});

describe("buildIncomeRows", () => {
  it("marca un ingreso fijo", () => {
    const rows = buildIncomeRows([makeIncome({ id: "i1", is_fixed: true })], new Map());
    expect(rows[0]["Ingreso fijo"]).toBe("Sí");
  });
});

describe("buildInvestmentRows", () => {
  it("traduce el tipo de operación y el tipo de activo", () => {
    const rows = buildInvestmentRows([makeInvestment({ id: "inv1", kind: "venta", asset_type: "etf" })]);
    expect(rows[0]["Operación"]).toBe("Venta");
    expect(rows[0]["Tipo de activo"]).toBe("ETF");
  });
});

describe("buildCategoryBudgetRows", () => {
  it("category_id null es 'Total del mes'", () => {
    const budget: CategoryBudget = {
      id: "b1",
      user_id: "user-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      category_id: null,
      monthly_amount: 200000,
    };

    expect(buildCategoryBudgetRows([budget], new Map())[0]["Categoría"]).toBe("Total del mes");
  });
});

describe("builders simples (mapeo directo, sin lógica de resolución)", () => {
  it("buildCategoryRows traduce el tipo", () => {
    const rows = buildCategoryRows([makeCategory({ id: "c1", name: "Sueldo", kind: "ingreso" })]);
    expect(rows[0]["Tipo"]).toBe("Ingreso");
  });

  it("buildFixedExpenseRows/buildFixedIncomeRows marcan activo/inactivo", () => {
    const template: FixedExpense = {
      id: "t1",
      user_id: "user-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      name: "Alquiler",
      amount_estimate: 100000,
      day_of_month: 5,
      active: false,
    };
    const incomeTemplate: FixedIncome = { ...template, id: "t2", name: "Sueldo" };

    expect(buildFixedExpenseRows([template])[0]["Activo"]).toBe("No");
    expect(buildFixedIncomeRows([incomeTemplate])[0]["Activo"]).toBe("No");
  });
});
