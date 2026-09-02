import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("arma el header desde las claves de la primera fila", () => {
    expect(toCsv([{ Nombre: "Café", Monto: "100" }])).toBe(`${BOM}Nombre,Monto\r\nCafé,100`);
  });

  it("separa varias filas con CRLF", () => {
    expect(toCsv([{ A: "1" }, { A: "2" }])).toBe(`${BOM}A\r\n1\r\n2`);
  });

  it("escapa un valor con coma envolviéndolo en comillas", () => {
    expect(toCsv([{ Descripción: "Compra, con coma" }])).toContain('"Compra, con coma"');
  });

  it("duplica las comillas internas de un valor y lo envuelve en comillas", () => {
    expect(toCsv([{ Descripción: 'Dijo "hola"' }])).toContain('"Dijo ""hola"""');
  });

  it("escapa un valor con salto de línea", () => {
    expect(toCsv([{ Nota: "línea 1\nlínea 2" }])).toContain('"línea 1\nlínea 2"');
  });

  it("da solo el BOM si no hay filas (no hace falta un header sin datos)", () => {
    expect(toCsv([])).toBe(BOM);
  });
});
