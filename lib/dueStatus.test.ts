import { describe, expect, it } from "vitest";
import { getDueStatus } from "@/lib/dueStatus";

/** Fecha relativa a hoy en formato "YYYY-MM-DD" — evita fechas fijas que se vuelven viejas con el tiempo. */
function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("getDueStatus", () => {
  it("es 'none' cuando no hay fecha de vencimiento", () => {
    expect(getDueStatus({ due_date: null, is_paid: false })).toBe("none");
  });

  it("es 'paid' si ya está marcado como pagado, sin importar la fecha", () => {
    expect(getDueStatus({ due_date: daysFromToday(-5), is_paid: true })).toBe("paid");
    expect(getDueStatus({ due_date: daysFromToday(5), is_paid: true })).toBe("paid");
  });

  it("es 'overdue' si la fecha ya pasó y no está pagado", () => {
    expect(getDueStatus({ due_date: daysFromToday(-1), is_paid: false })).toBe("overdue");
  });

  it("es 'upcoming' si la fecha todavía no llegó y no está pagado", () => {
    expect(getDueStatus({ due_date: daysFromToday(1), is_paid: false })).toBe("upcoming");
  });

  it("acepta un 'today' explícito en vez del de verdad (lo usa el chequeo de notificaciones)", () => {
    expect(getDueStatus({ due_date: "2026-08-20", is_paid: false }, "2026-08-21")).toBe("overdue");
    expect(getDueStatus({ due_date: "2026-08-20", is_paid: false }, "2026-08-19")).toBe("upcoming");
  });
});
