import { describe, expect, it } from "vitest";
import type { BaseRecord, Expense } from "@/lib/types";
import { planInstallments } from "@/lib/repository/planInstallments";

type NewExpenseInput = Omit<Expense, keyof BaseRecord>;

function makeInput(overrides: Partial<NewExpenseInput> = {}): NewExpenseInput {
  return {
    date: "2026-01-31",
    amount: 20000,
    category_id: null,
    description: "Zapatillas",
    payment_method: "credito",
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

describe("planInstallments", () => {
  it("devuelve la fila tal cual (normalizando a null) si no es una compra en cuotas", () => {
    const result = planInstallments(makeInput({ installment_count: null }));

    expect(result).toEqual([makeInput({ installment_count: null })]);
  });

  it("una sola cuota (installment_count: 1) tampoco se explota", () => {
    const result = planInstallments(makeInput({ installment_count: 1 }));

    expect(result).toHaveLength(1);
    expect(result[0].installment_number).toBeNull();
  });

  it("genera una fila por cuota, todas con el mismo monto, avanzando un mes cada vez", () => {
    const result = planInstallments(makeInput({ date: "2026-01-15", installment_count: 3 }));

    expect(result.map((row) => row.date)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
    expect(result.every((row) => row.amount === 20000)).toBe(true);
    expect(result.map((row) => row.installment_number)).toEqual([1, 2, 3]);
    expect(result.every((row) => row.installment_count === 3)).toBe(true);
  });

  it("todas las cuotas comparten el mismo installment_group_id", () => {
    const result = planInstallments(makeInput({ installment_count: 4 }));

    const groupIds = new Set(result.map((row) => row.installment_group_id));
    expect(groupIds.size).toBe(1);
    expect(result[0].installment_group_id).not.toBeNull();
  });

  it("ajusta el día si el mes de destino es más corto (31 de enero → 28/29 de febrero)", () => {
    const result = planInstallments(makeInput({ date: "2026-01-31", installment_count: 2 }));

    expect(result.map((row) => row.date)).toEqual(["2026-01-31", "2026-02-28"]);
  });

  it("si hay vencimiento, lo avanza los mismos meses conservando su propio día", () => {
    const result = planInstallments(makeInput({ date: "2026-01-05", due_date: "2026-01-15", installment_count: 3 }));

    expect(result.map((row) => row.due_date)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("sin vencimiento cargado, ninguna cuota generada tiene uno", () => {
    const result = planInstallments(makeInput({ due_date: null, installment_count: 3 }));

    expect(result.every((row) => row.due_date === null)).toBe(true);
  });
});
