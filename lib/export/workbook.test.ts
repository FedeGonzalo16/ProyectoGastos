import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildWorkbook } from "@/lib/export/workbook";

describe("buildWorkbook", () => {
  it("arma una pestaña por hoja, en el mismo orden", () => {
    const workbook = buildWorkbook([
      { name: "Gastos", rows: [{ Fecha: "2026-08-01", Monto: "100" }] },
      { name: "Ingresos", rows: [{ Fecha: "2026-08-01", Monto: "500" }] },
    ]);

    expect(workbook.SheetNames).toEqual(["Gastos", "Ingresos"]);
  });

  it("una hoja sin filas queda con un placeholder 'Sin datos' en vez de vacía", () => {
    const workbook = buildWorkbook([{ name: "Presupuestos", rows: [] }]);

    const sheet = workbook.Sheets["Presupuestos"];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
    expect(rows.flat()).toContain("Sin datos");
  });

  it("recorta el nombre de la pestaña a 31 caracteres (límite de Excel)", () => {
    const longName = "Un nombre de pestaña larguísimo que no entra";
    const workbook = buildWorkbook([{ name: longName, rows: [{ A: "1" }] }]);

    expect(workbook.SheetNames[0].length).toBeLessThanOrEqual(31);
  });
});
