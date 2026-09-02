import type { Category, CategoryBudget, Expense, FixedExpense, FixedIncome, Income, Investment, PaymentMethod } from "@/lib/types";
import { ASSET_TYPE_LABELS } from "@/lib/assetTypes";

/**
 * Convierte cada entidad a filas listas para `toCsv` — la clave de cada
 * campo YA es el nombre de columna en español (así el CSV se puede abrir
 * directo en Excel/Sheets sin traducir nada), y los ids se resuelven a
 * nombre legible (categoría) en vez de dejar el uuid crudo.
 */

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  otro: "Otro",
};

function categoryName(categoryId: string | null, categoriesById: Map<string, Category>): string {
  if (categoryId === null) return "Sin categoría";
  return categoriesById.get(categoryId)?.name ?? "Sin categoría";
}

export function buildExpenseRows(expenses: Expense[], categoriesById: Map<string, Category>): Record<string, string>[] {
  return expenses.map((expense) => ({
    Fecha: expense.date,
    Monto: String(expense.amount),
    Categoría: categoryName(expense.category_id, categoriesById),
    Descripción: expense.description ?? "",
    "Medio de pago": expense.payment_method !== null ? PAYMENT_METHOD_LABELS[expense.payment_method] : "",
    "Gasto fijo": expense.is_fixed ? "Sí" : "No",
    Cuota: expense.installment_number !== null ? `${expense.installment_number}/${expense.installment_count}` : "",
    Etiqueta: expense.tag ?? "",
    Vencimiento: expense.due_date ?? "",
    Pagado: expense.due_date !== null ? (expense.is_paid ? "Sí" : "No") : "",
  }));
}

export function buildIncomeRows(incomes: Income[], categoriesById: Map<string, Category>): Record<string, string>[] {
  return incomes.map((income) => ({
    Fecha: income.date,
    Monto: String(income.amount),
    Categoría: categoryName(income.category_id, categoriesById),
    Descripción: income.description ?? "",
    "Ingreso fijo": income.is_fixed ? "Sí" : "No",
  }));
}

export function buildInvestmentRows(investments: Investment[]): Record<string, string>[] {
  return investments.map((investment) => ({
    Fecha: investment.date,
    "Tipo de activo": ASSET_TYPE_LABELS[investment.asset_type],
    "Nombre/ticker": investment.asset_name,
    Operación: investment.kind === "venta" ? "Venta" : "Compra",
    "Monto original": String(investment.amount_original),
    Moneda: investment.currency_original,
    "Tipo de cambio": investment.exchange_rate !== null ? String(investment.exchange_rate) : "",
    "Monto USD": String(investment.amount_usd),
    "Costo de lo vendido (USD)": investment.cost_basis_usd !== null ? String(investment.cost_basis_usd) : "",
    Cantidad: investment.quantity !== null ? String(investment.quantity) : "",
    "Símbolo de mercado": investment.market_symbol ?? "",
  }));
}

export function buildFixedExpenseRows(templates: FixedExpense[]): Record<string, string>[] {
  return templates.map((template) => ({
    Nombre: template.name,
    "Monto estimado": String(template.amount_estimate),
    "Día del mes": template.day_of_month !== null ? String(template.day_of_month) : "",
    Activo: template.active ? "Sí" : "No",
  }));
}

export function buildFixedIncomeRows(templates: FixedIncome[]): Record<string, string>[] {
  return templates.map((template) => ({
    Nombre: template.name,
    "Monto estimado": String(template.amount_estimate),
    "Día del mes": template.day_of_month !== null ? String(template.day_of_month) : "",
    Activo: template.active ? "Sí" : "No",
  }));
}

export function buildCategoryRows(categories: Category[]): Record<string, string>[] {
  return categories.map((category) => ({
    Nombre: category.name,
    Tipo: category.kind === "gasto" ? "Gasto" : "Ingreso",
    Activa: category.active ? "Sí" : "No",
  }));
}

export function buildCategoryBudgetRows(budgets: CategoryBudget[], categoriesById: Map<string, Category>): Record<string, string>[] {
  return budgets.map((budget) => ({
    Categoría: budget.category_id === null ? "Total del mes" : categoryName(budget.category_id, categoriesById),
    "Monto mensual": String(budget.monthly_amount),
  }));
}
