import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { collectDueReminders } from "@/lib/notifications/collectDueReminders";

const TODAY = "2026-08-21";

function makeExpense(overrides: Partial<Expense> & Pick<Expense, "id">): Expense {
  return {
    user_id: "user-1",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    date: "2026-08-01",
    amount: 1000,
    category_id: null,
    description: "Monotributo",
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

describe("collectDueReminders", () => {
  it("ignora los gastos sin vencimiento", () => {
    expect(collectDueReminders([makeExpense({ id: "e1", due_date: null })], TODAY)).toEqual([]);
  });

  it("ignora los gastos ya pagados, aunque estén vencidos", () => {
    expect(collectDueReminders([makeExpense({ id: "e1", due_date: "2026-08-01", is_paid: true })], TODAY)).toEqual([]);
  });

  it("avisa 'due_upcoming' si vence hoy, mañana o pasado", () => {
    const expenses = [
      makeExpense({ id: "e1", due_date: "2026-08-21" }), // hoy
      makeExpense({ id: "e2", due_date: "2026-08-22" }), // mañana
      makeExpense({ id: "e3", due_date: "2026-08-23" }), // pasado
    ];

    const result = collectDueReminders(expenses, TODAY);

    expect(result.map((candidate) => candidate.entityId)).toEqual(["e1", "e2", "e3"]);
    expect(result.every((candidate) => candidate.kind === "due_upcoming")).toBe(true);
  });

  it("no avisa todavía si falta más de la ventana de anticipación", () => {
    expect(collectDueReminders([makeExpense({ id: "e1", due_date: "2026-08-25" })], TODAY)).toEqual([]);
  });

  it("avisa 'due_overdue' si ya venció y sigue sin pagarse", () => {
    const [candidate] = collectDueReminders([makeExpense({ id: "e1", due_date: "2026-08-10" })], TODAY);

    expect(candidate).toMatchObject({ kind: "due_overdue", entityId: "e1", period: "2026-08-10" });
  });

  it("usa el user_id del gasto y el due_date como 'period' del candidato", () => {
    const [candidate] = collectDueReminders(
      [makeExpense({ id: "e1", user_id: "user-42", due_date: "2026-08-21" })],
      TODAY
    );

    expect(candidate).toMatchObject({ userId: "user-42", period: "2026-08-21" });
  });
});
