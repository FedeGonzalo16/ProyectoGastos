import { describe, expect, it } from "vitest";
import type { Category, CategoryBudget, Expense } from "@/lib/types";
import { buildBudgetProgress, buildTotalBudgetProgress } from "@/lib/aggregations/budgetProgress";

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

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "exp-1",
    user_id: "user-1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    date: "2026-08-01",
    amount: 0,
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

function makeBudget(overrides: Partial<CategoryBudget> & Pick<CategoryBudget, "category_id" | "monthly_amount">): CategoryBudget {
  return {
    id: "budget-1",
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const comida = makeCategory({ id: "cat-comida", name: "Comida" });

describe("buildBudgetProgress", () => {
  it("calcula lo gastado, el porcentaje y si se pasó del tope", () => {
    const budgets = [makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 1000 })];
    const expenses = [makeExpense({ category_id: "cat-comida", amount: 300 }), makeExpense({ category_id: "cat-comida", amount: 200 })];

    const [progress] = buildBudgetProgress(budgets, expenses, [comida]);

    expect(progress).toMatchObject({ spent: 500, budget: 1000, percentage: 50, isOverBudget: false });
  });

  it("recorta el porcentaje a 100 cuando se pasó del tope, pero marca isOverBudget", () => {
    const budgets = [makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 100 })];
    const expenses = [makeExpense({ category_id: "cat-comida", amount: 250 })];

    const [progress] = buildBudgetProgress(budgets, expenses, [comida]);

    expect(progress.percentage).toBe(100);
    expect(progress.isOverBudget).toBe(true);
  });

  it("ignora el presupuesto total del mes (category_id null) — eso lo maneja buildTotalBudgetProgress", () => {
    const budgets = [makeBudget({ id: "b1", category_id: null, monthly_amount: 5000 })];

    expect(buildBudgetProgress(budgets, [], [comida])).toEqual([]);
  });

  it("ignora un presupuesto cuya categoría ya no existe en la lista dada", () => {
    const budgets = [makeBudget({ id: "b1", category_id: "cat-borrada", monthly_amount: 100 })];

    expect(buildBudgetProgress(budgets, [], [comida])).toEqual([]);
  });

  it("ordena de mayor a menor porcentaje usado", () => {
    const transporte = makeCategory({ id: "cat-transporte", name: "Transporte" });
    const budgets = [
      makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 1000 }),
      makeBudget({ id: "b2", category_id: "cat-transporte", monthly_amount: 1000 }),
    ];
    const expenses = [makeExpense({ category_id: "cat-comida", amount: 100 }), makeExpense({ category_id: "cat-transporte", amount: 900 })];

    const result = buildBudgetProgress(budgets, expenses, [comida, transporte]);

    expect(result.map((entry) => entry.category.id)).toEqual(["cat-transporte", "cat-comida"]);
  });
});

describe("buildTotalBudgetProgress", () => {
  it("devuelve null si no hay un presupuesto total definido (category_id: null)", () => {
    const budgets = [makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 1000 })];

    expect(buildTotalBudgetProgress(budgets, [])).toBeNull();
  });

  it("suma TODOS los gastos del mes sin importar su categoría", () => {
    const budgets = [makeBudget({ id: "b1", category_id: null, monthly_amount: 1000 })];
    const expenses = [makeExpense({ category_id: "cat-comida", amount: 300 }), makeExpense({ category_id: null, amount: 400 })];

    const result = buildTotalBudgetProgress(budgets, expenses);

    expect(result).toMatchObject({ spent: 700, budget: 1000, percentage: 70, isOverBudget: false });
  });
});
