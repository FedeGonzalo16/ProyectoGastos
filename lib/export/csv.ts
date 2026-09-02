/**
 * Arma un archivo CSV (formato RFC 4180) a partir de filas ya armadas con
 * sus columnas en español como clave (ver `buildExportRows.ts`) — el orden
 * de las claves del primer objeto define el orden de las columnas.
 */

const BOM = "﻿";

function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * El BOM al principio evita que Excel en Windows interprete el archivo como
 * Latin-1 (las tildes/ñ quedarían rotas al abrirlo) — con Google Sheets o un
 * editor de texto no hace falta, pero no molesta tenerlo. `\r\n` como
 * separador de línea, el que espera Excel.
 */
export function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return BOM;

  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCsvValue).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","));
  return BOM + [header, ...lines].join("\r\n");
}
