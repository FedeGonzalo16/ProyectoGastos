import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/types";
import type { BudgetProgress } from "@/lib/aggregations/budgetProgress";
import type { CategoryAmount } from "@/lib/aggregations/monthlySummary";
import { buildInsights, type BuildInsightsInput } from "@/lib/aggregations/insights";

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

/** Todo en "no hay nada que avisar" por defecto — cada test solo pisa lo que necesita. */
function baseInput(overrides: Partial<BuildInsightsInput> = {}): BuildInsightsInput {
  return {
    budgetProgress: [],
    totalBudgetProgress: null,
    investmentMonthlyTargetUsd: null,
    investmentContributedUsd: 0,
    expensesByCategoryThisMonth: [],
    expensesByCategoryLastMonth: [],
    balanceThisMonth: 0,
    balanceLastMonth: 0,
    totalExpensesThisMonth: 0,
    ...overrides,
  };
}

describe("buildInsights", () => {
  it("no devuelve nada cuando no hay ningún dato destacado", () => {
    expect(buildInsights(baseInput())).toEqual([]);
  });

  it("avisa cuando ya se pasó un presupuesto", () => {
    const comida = makeCategory({ id: "cat-comida", name: "Comida" });
    const budgetProgress: BudgetProgress[] = [
      { category: comida, colorIndex: 0, spent: 1500, budget: 1000, percentage: 100, isOverBudget: true },
    ];

    const [insight] = buildInsights(baseInput({ budgetProgress }));

    expect(insight).toMatchObject({ id: "budget", tone: "warning" });
    expect(insight.message).toContain("Comida");
  });

  it("avisa cuando falta el mínimo de inversión del mes", () => {
    const [insight] = buildInsights(baseInput({ investmentMonthlyTargetUsd: 200, investmentContributedUsd: 50 }));

    expect(insight).toMatchObject({ id: "investment-goal", tone: "warning" });
  });

  it("no avisa de inversión si ya se cumplió el mínimo", () => {
    const result = buildInsights(baseInput({ investmentMonthlyTargetUsd: 200, investmentContributedUsd: 200 }));

    expect(result.find((insight) => insight.id === "investment-goal")).toBeUndefined();
  });

  it("avisa si una categoría subió lo suficiente respecto al mes pasado", () => {
    const thisMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 2000, colorIndex: 0 }];
    const lastMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 1000, colorIndex: 0 }];

    const [insight] = buildInsights(baseInput({ expensesByCategoryThisMonth: thisMonth, expensesByCategoryLastMonth: lastMonth }));

    expect(insight.id).toBe("category-increase");
  });

  it("ignora un aumento de categoría si la base del mes pasado era demasiado chica", () => {
    const thisMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 500, colorIndex: 0 }];
    const lastMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 50, colorIndex: 0 }];

    const result = buildInsights(baseInput({ expensesByCategoryThisMonth: thisMonth, expensesByCategoryLastMonth: lastMonth }));

    expect(result.find((insight) => insight.id === "category-increase")).toBeUndefined();
  });

  it("avisa si el balance mejoró o empeoró lo suficiente respecto al mes pasado", () => {
    const [insight] = buildInsights(baseInput({ balanceThisMonth: 2000, balanceLastMonth: 1000 }));

    expect(insight).toMatchObject({ id: "balance", tone: "positive" });
  });

  it("muestra la categoría de mayor gasto cuando no hay nada más para destacar", () => {
    const thisMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 800, colorIndex: 0 }];

    const [insight] = buildInsights(baseInput({ expensesByCategoryThisMonth: thisMonth, totalExpensesThisMonth: 800 }));

    expect(insight.id).toBe("top-category");
  });

  it("prioriza presupuesto sobre el resto, y nunca devuelve más de 2", () => {
    const comida = makeCategory({ id: "cat-comida", name: "Comida" });
    const budgetProgress: BudgetProgress[] = [
      { category: comida, colorIndex: 0, spent: 1500, budget: 1000, percentage: 100, isOverBudget: true },
    ];
    const thisMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 2000, colorIndex: 0 }];
    const lastMonth: CategoryAmount[] = [{ categoryId: "cat-comida", label: "Comida", value: 1000, colorIndex: 0 }];

    const result = buildInsights(
      baseInput({
        budgetProgress,
        investmentMonthlyTargetUsd: 200,
        investmentContributedUsd: 0,
        expensesByCategoryThisMonth: thisMonth,
        expensesByCategoryLastMonth: lastMonth,
        balanceThisMonth: 2000,
        balanceLastMonth: 1000,
        totalExpensesThisMonth: 2000,
      })
    );

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("budget");
    expect(result[1].id).toBe("investment-goal");
  });
});
