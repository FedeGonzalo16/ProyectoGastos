import { describe, expect, it } from "vitest";
import type { Expense, FixedExpense } from "@/lib/types";
import { planFixedExpenseGeneration } from "@/lib/repository/generateFixedExpenses";

const YEAR_MONTH = { year: 2026, month: 8 };

function makeTemplate(overrides: Partial<FixedExpense> & Pick<FixedExpense, "id" | "name">): FixedExpense {
  return {
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    amount_estimate: 1000,
    day_of_month: null,
    active: true,
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
    is_fixed: true,
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

describe("planFixedExpenseGeneration", () => {
  it("genera un gasto por cada plantilla activa sin uno ya generado ese mes", () => {
    const templates = [makeTemplate({ id: "t1", name: "Alquiler", day_of_month: 5, amount_estimate: 50000 })];

    const plans = planFixedExpenseGeneration(templates, [], YEAR_MONTH);

    expect(plans).toEqual([
      {
        date: "2026-08-05",
        amount: 50000,
        category_id: null,
        description: "Alquiler",
        payment_method: null,
        is_fixed: true,
        fixed_expense_id: "t1",
        due_date: "2026-08-05",
        is_paid: false,
        installment_number: null,
        installment_count: null,
        installment_group_id: null,
        tag: null,
      },
    ]);
  });

  it("usa el día 1 por defecto si la plantilla no tiene día, y no arma vencimiento", () => {
    const templates = [makeTemplate({ id: "t1", name: "Servicio", day_of_month: null })];

    const [plan] = planFixedExpenseGeneration(templates, [], YEAR_MONTH);

    expect(plan.date).toBe("2026-08-01");
    expect(plan.due_date).toBeNull();
  });

  it("no genera nada para una plantilla inactiva", () => {
    const templates = [makeTemplate({ id: "t1", name: "Cancelado", active: false })];

    expect(planFixedExpenseGeneration(templates, [], YEAR_MONTH)).toEqual([]);
  });

  it("es idempotente: no genera de nuevo si ya existe un gasto de esa plantilla este mes", () => {
    const templates = [makeTemplate({ id: "t1", name: "Alquiler" })];
    const existing = [makeExpense({ id: "e1", fixed_expense_id: "t1", date: "2026-08-01" })];

    expect(planFixedExpenseGeneration(templates, existing, YEAR_MONTH)).toEqual([]);
  });

  it("sí genera si el gasto existente de esa plantilla es de otro mes", () => {
    const templates = [makeTemplate({ id: "t1", name: "Alquiler" })];
    const existing = [makeExpense({ id: "e1", fixed_expense_id: "t1", date: "2026-07-01" })];

    expect(planFixedExpenseGeneration(templates, existing, YEAR_MONTH)).toHaveLength(1);
  });
});
