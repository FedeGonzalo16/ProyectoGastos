"use client";

import { useRepositories } from "@/hooks/useRepositories";
import { toCsv } from "@/lib/export/csv";
import { downloadTextFile } from "@/lib/export/downloadFile";
import { buildWorkbook, downloadWorkbook } from "@/lib/export/workbook";
import {
  buildCategoryBudgetRows,
  buildCategoryRows,
  buildExpenseRows,
  buildFixedExpenseRows,
  buildFixedIncomeRows,
  buildIncomeRows,
  buildInvestmentRows,
} from "@/lib/export/buildExportRows";
import { todayAsDateInput } from "@/lib/format";
import { useToast } from "@/hooks/useToast";
import { DownloadIcon } from "@/components/shared/icons";

interface ExportOption {
  label: string;
  /** Nombre de archivo para la descarga individual (.csv) — "Descargar todo" arma el suyo propio (.xlsx). */
  filename: string;
  rows: Record<string, string>[];
}

/**
 * Exporta los datos para respaldo o análisis externo — cada botón individual
 * baja un `.csv` de esa entidad sola; "Descargar todo" arma un único `.xlsx`
 * con una pestaña por entidad (ver `lib/export/workbook.ts`). Todo pasa en
 * el navegador, no hace falta conexión ni backend propio más allá de leer lo
 * que ya está en la copia local. No incluye el historial de valuaciones ni
 * la meta de inversión (son datos más internos/derivados, no algo que
 * alguien busque analizar afuera).
 */
export function DataExport() {
  const { expenses, incomes, investments, fixedExpenses, fixedIncomes, categories, categoryBudgets } = useRepositories();
  const { showToast, toast } = useToast();

  function buildOptions(): ExportOption[] {
    const today = todayAsDateInput();
    const allCategories = categories.list();
    const categoriesById = new Map(allCategories.map((category) => [category.id, category]));

    return [
      { label: "Gastos", filename: `gastosapp-gastos-${today}.csv`, rows: buildExpenseRows(expenses.list(), categoriesById) },
      { label: "Ingresos", filename: `gastosapp-ingresos-${today}.csv`, rows: buildIncomeRows(incomes.list(), categoriesById) },
      { label: "Inversiones", filename: `gastosapp-inversiones-${today}.csv`, rows: buildInvestmentRows(investments.list()) },
      {
        label: "Gastos fijos",
        filename: `gastosapp-gastos-fijos-${today}.csv`,
        rows: buildFixedExpenseRows(fixedExpenses.list()),
      },
      {
        label: "Ingresos fijos",
        filename: `gastosapp-ingresos-fijos-${today}.csv`,
        rows: buildFixedIncomeRows(fixedIncomes.list()),
      },
      { label: "Categorías", filename: `gastosapp-categorias-${today}.csv`, rows: buildCategoryRows(allCategories) },
      {
        label: "Presupuestos",
        filename: `gastosapp-presupuestos-${today}.csv`,
        rows: buildCategoryBudgetRows(categoryBudgets.list(), categoriesById),
      },
    ];
  }

  function handleDownloadOne(option: ExportOption) {
    if (option.rows.length === 0) {
      showToast(`No hay ${option.label.toLowerCase()} para exportar`);
      return;
    }
    downloadTextFile(option.filename, toCsv(option.rows));
  }

  function handleDownloadAll() {
    const options = buildOptions();
    if (options.every((option) => option.rows.length === 0)) {
      showToast("Todavía no hay datos cargados para exportar");
      return;
    }

    const workbook = buildWorkbook(options.map((option) => ({ name: option.label, rows: option.rows })));
    downloadWorkbook(workbook, `gastosapp-${todayAsDateInput()}.xlsx`);
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <DownloadIcon />
        Exportar datos
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Un CSV por tipo de dato, o todo junto en un Excel con una pestaña por cada uno.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {buildOptions().map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleDownloadOne(option)}
            className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleDownloadAll}
        className="mt-2.5 w-full rounded-xl py-2.5 text-xs font-semibold"
        style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
      >
        Descargar todo (.xlsx)
      </button>

      {toast}
    </section>
  );
}
