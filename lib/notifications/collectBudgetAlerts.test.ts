import { describe, expect, it } from "vitest";
import type { Category, CategoryBudget, Expense } from "@/lib/types";
import { collectBudgetAlerts } from "@/lib/notifications/collectBudgetAlerts";

const PERIOD = "2026-08";

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

function makeBudget(overrides: Partial<CategoryBudget> & Pick<CategoryBudget, "category_id" | "monthly_amount">): CategoryBudget {
  return {
    id: "budget-1",
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
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

describe("collectBudgetAlerts", () => {
  it("no avisa nada si todo está por debajo del umbral", () => {
    const budgets = [makeBudget({ id: "b1", category_id: null, monthly_amount: 1000 })];
    const expenses = [makeExpense({ id: "e1", amount: 100 })];

    expect(collectBudgetAlerts("user-1", budgets, expenses, [], PERIOD)).toEqual([]);
  });

  it("avisa el total del mes cuando se pasa del tope", () => {
    const budgets = [makeBudget({ id: "b1", category_id: null, monthly_amount: 1000 })];
    const expenses = [makeExpense({ id: "e1", amount: 1500 })];

    const [alert] = collectBudgetAlerts("user-1", budgets, expenses, [], PERIOD);

    expect(alert).toMatchObject({ userId: "user-1", kind: "budget_total", entityId: "total", period: PERIOD });
  });

  it("avisa una categoría cuando llega al 85% aunque no se haya pasado", () => {
    const comida = makeCategory({ id: "cat-comida", name: "Comida" });
    const budgets = [makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 1000 })];
    const expenses = [makeExpense({ id: "e1", category_id: "cat-comida", amount: 900 })];

    const [alert] = collectBudgetAlerts("user-1", budgets, expenses, [comida], PERIOD);

    expect(alert).toMatchObject({ kind: "budget_category", entityId: "cat-comida", period: PERIOD });
  });

  it("no avisa una categoría por debajo del 85%", () => {
    const comida = makeCategory({ id: "cat-comida", name: "Comida" });
    const budgets = [makeBudget({ id: "b1", category_id: "cat-comida", monthly_amount: 1000 })];
    const expenses = [makeExpense({ id: "e1", category_id: "cat-comida", amount: 500 })];

    expect(collectBudgetAlerts("user-1", budgets, expenses, [comida], PERIOD)).toEqual([]);
  });

  it("puede avisar el total Y una categoría al mismo tiempo", () => {
    const comida = makeCategory({ id: "cat-comida", name: "Comida" });
    const budgets = [
      makeBudget({ id: "b1", category_id: null, monthly_amount: 100 }),
      makeBudget({ id: "b2", category_id: "cat-comida", monthly_amount: 100 }),
    ];
    const expenses = [makeExpense({ id: "e1", category_id: "cat-comida", amount: 200 })];

    const result = collectBudgetAlerts("user-1", budgets, expenses, [comida], PERIOD);

    expect(result.map((alert) => alert.kind).sort()).toEqual(["budget_category", "budget_total"]);
  });
});
