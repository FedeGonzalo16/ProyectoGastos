import * as XLSX from "xlsx";

export interface WorkbookSheet {
  /** Nombre de la pestaña — Excel no admite más de 31 caracteres, se recorta si hace falta. */
  name: string;
  rows: Record<string, string>[];
}

/**
 * Arma un libro de Excel (.xlsx) con una pestaña por entidad, reusando las
 * mismas filas que ya arma `buildExportRows.ts` (clave = columna en
 * español). Una pestaña sin filas queda con una única fila "Sin datos" —
 * SheetJS no admite una hoja completamente vacía (sin ningún header).
 *
 * OJO: la librería `xlsx` (SheetJS) tiene vulnerabilidades conocidas del
 * lado de LEER un archivo ajeno (prototype pollution / ReDoS al parsear un
 * .xlsx malicioso) — acá nunca se lee un archivo, solo se genera uno desde
 * datos propios, así que ese vector no aplica. Decisión consciente, no un
 * descuido (ver PROGRESO.md).
 */
export function buildWorkbook(sheets: WorkbookSheet[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ "": "Sin datos" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return workbook;
}

/** Dispara la descarga del libro en el navegador. */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}
