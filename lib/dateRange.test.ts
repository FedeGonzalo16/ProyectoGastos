import { describe, expect, it } from "vitest";
import { daysBetween } from "@/lib/dateRange";

describe("daysBetween", () => {
  it("cuenta los días entre dos fechas dentro del mismo mes", () => {
    expect(daysBetween("2026-08-01", "2026-08-05")).toBe(4);
  });

  it("da negativo si 'to' es anterior a 'from'", () => {
    expect(daysBetween("2026-08-05", "2026-08-01")).toBe(-4);
  });

  it("da 0 si son la misma fecha", () => {
    expect(daysBetween("2026-08-21", "2026-08-21")).toBe(0);
  });

  it("cruza el fin de mes correctamente", () => {
    expect(daysBetween("2026-08-30", "2026-09-02")).toBe(3);
  });

  it("cruza el fin de año correctamente", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
});
