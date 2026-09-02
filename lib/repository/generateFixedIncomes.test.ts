import { describe, expect, it } from "vitest";
import type { FixedIncome, Income } from "@/lib/types";
import { planFixedIncomeGeneration } from "@/lib/repository/generateFixedIncomes";

const YEAR_MONTH = { year: 2026, month: 8 };

function makeTemplate(overrides: Partial<FixedIncome> & Pick<FixedIncome, "id" | "name">): FixedIncome {
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

function makeIncome(overrides: Partial<Income> & Pick<Income, "id">): Income {
  return {
    user_id: "user-1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    date: "2026-08-01",
    amount: 1000,
    category_id: null,
    description: null,
    is_fixed: true,
    fixed_income_id: null,
    ...overrides,
  };
}

describe("planFixedIncomeGeneration", () => {
  it("genera un ingreso por cada plantilla activa sin uno ya generado ese mes", () => {
    const templates = [makeTemplate({ id: "t1", name: "Sueldo", day_of_month: 5, amount_estimate: 500000 })];

    const plans = planFixedIncomeGeneration(templates, [], YEAR_MONTH);

    expect(plans).toEqual([
      {
        date: "2026-08-05",
        amount: 500000,
        category_id: null,
        description: "Sueldo",
        is_fixed: true,
        fixed_income_id: "t1",
      },
    ]);
  });

  it("sin día elegido, genera el día 1", () => {
    const templates = [makeTemplate({ id: "t1", name: "Alquiler que cobro", day_of_month: null })];

    const plans = planFixedIncomeGeneration(templates, [], YEAR_MONTH);

    expect(plans[0].date).toBe("2026-08-01");
  });

  it("no genera de nuevo si ya existe uno de esa plantilla ese mes", () => {
    const templates = [makeTemplate({ id: "t1", name: "Sueldo", day_of_month: 5 })];
    const existing = [makeIncome({ id: "i1", date: "2026-08-05", fixed_income_id: "t1" })];

    expect(planFixedIncomeGeneration(templates, existing, YEAR_MONTH)).toEqual([]);
  });

  it("sí genera de nuevo en un mes distinto", () => {
    const templates = [makeTemplate({ id: "t1", name: "Sueldo", day_of_month: 5 })];
    const existing = [makeIncome({ id: "i1", date: "2026-07-05", fixed_income_id: "t1" })];

    expect(planFixedIncomeGeneration(templates, existing, YEAR_MONTH)).toHaveLength(1);
  });

  it("ignora las plantillas inactivas", () => {
    const templates = [makeTemplate({ id: "t1", name: "Freelance viejo", active: false })];

    expect(planFixedIncomeGeneration(templates, [], YEAR_MONTH)).toEqual([]);
  });

  it("un cambio de monto en la plantilla no reescribe lo ya generado (no está en el alcance de esta función, solo no vuelve a generar)", () => {
    const templates = [makeTemplate({ id: "t1", name: "Sueldo", amount_estimate: 600000, day_of_month: 5 })];
    const existing = [makeIncome({ id: "i1", date: "2026-08-05", amount: 500000, fixed_income_id: "t1" })];

    expect(planFixedIncomeGeneration(templates, existing, YEAR_MONTH)).toEqual([]);
  });
});
