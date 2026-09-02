import { describe, expect, it } from "vitest";
import type { Category, Expense } from "@/lib/types";
import { creditCardAmountsByMonth, filterByMonth, groupByCategory, sumAmounts, sumPerMonth } from "@/lib/aggregations/monthlySummary";

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

function makeCategory(overrides: Partial<Category> & Pick<Category, "id" | "name">): Category {
  return {
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    kind: "gasto",
    color: null,
    active: true,
    sort_order: 0,
    ...overrides,
  };
}

describe("filterByMonth", () => {
  it("solo deja los registros cuya fecha cae dentro del mes pedido", () => {
    const records = [{ date: "2026-07-31", amount: 1 }, { date: "2026-08-01", amount: 2 }, { date: "2026-08-31", amount: 3 }, { date: "2026-09-01", amount: 4 }];

    const result = filterByMonth(records, { year: 2026, month: 8 });

    expect(result).toEqual([{ date: "2026-08-01", amount: 2 }, { date: "2026-08-31", amount: 3 }]);
  });
});

describe("sumAmounts", () => {
  it("suma el campo amount de todos los registros", () => {
    const records = [{ date: "2026-08-01", amount: 100 }, { date: "2026-08-02", amount: 250 }, { date: "2026-08-03", amount: 50 }];

    expect(sumAmounts(records)).toBe(400);
  });

  it("devuelve 0 con una lista vacía", () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe("sumPerMonth", () => {
  it("devuelve un total por cada mes pedido, en el mismo orden", () => {
    const records = [{ date: "2026-06-15", amount: 10 }, { date: "2026-07-15", amount: 20 }, { date: "2026-07-20", amount: 5 }];
    const months = [{ year: 2026, month: 6 }, { year: 2026, month: 7 }, { year: 2026, month: 8 }];

    expect(sumPerMonth(records, months)).toEqual([10, 25, 0]);
  });
});

describe("groupByCategory", () => {
  const comida = makeCategory({ id: "cat-comida", name: "Comida" });
  const transporte = makeCategory({ id: "cat-transporte", name: "Transporte" });
  const categories = [comida, transporte];

  it("suma por categoría y ordena de mayor a menor", () => {
    const records = [
      { date: "2026-08-01", amount: 100, category_id: "cat-comida" },
      { date: "2026-08-02", amount: 50, category_id: "cat-transporte" },
      { date: "2026-08-03", amount: 200, category_id: "cat-comida" },
    ];

    const result = groupByCategory(records, categories);

    expect(result).toEqual([
      { categoryId: "cat-comida", label: "Comida", value: 300, colorIndex: 0 },
      { categoryId: "cat-transporte", label: "Transporte", value: 50, colorIndex: 1 },
    ]);
  });

  it("agrupa los registros sin categoría bajo 'Sin categoría', con colorIndex undefined", () => {
    const records = [{ date: "2026-08-01", amount: 40, category_id: null }];

    const result = groupByCategory(records, categories);

    expect(result).toEqual([{ categoryId: null, label: "Sin categoría", value: 40, colorIndex: undefined }]);
  });

  it("no incluye categorías sin ningún registro", () => {
    const records = [{ date: "2026-08-01", amount: 10, category_id: "cat-comida" }];

    const result = groupByCategory(records, categories);

    expect(result.map((item) => item.categoryId)).toEqual(["cat-comida"]);
  });
});

describe("creditCardAmountsByMonth", () => {
  it("suma solo los gastos con payment_method credito, por mes", () => {
    const expenses = [
      makeExpense({ id: "e1", date: "2026-08-01", amount: 20000, payment_method: "credito" }),
      makeExpense({ id: "e2", date: "2026-08-15", amount: 500, payment_method: "efectivo" }),
      makeExpense({ id: "e3", date: "2026-09-01", amount: 20000, payment_method: "credito" }),
    ];
    const months = [{ year: 2026, month: 8 }, { year: 2026, month: 9 }];

    expect(creditCardAmountsByMonth(expenses, months)).toEqual([20000, 20000]);
  });

  it("da 0 en un mes sin gastos de crédito", () => {
    const expenses = [makeExpense({ id: "e1", date: "2026-08-01", payment_method: "credito", amount: 1000 })];

    expect(creditCardAmountsByMonth(expenses, [{ year: 2026, month: 9 }])).toEqual([0]);
  });
});
