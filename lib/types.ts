/**
 * Tipos de dominio de la app — reflejan 1:1 las tablas de `supabase/schema.sql`.
 * Se usan tanto en los repositorios (lib/repository) como en los componentes,
 * para que TypeScript avise si un campo no coincide con lo que espera la base.
 */

/** Toda entidad guardada tiene estos campos en común. */
export interface BaseRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type CategoryKind = "gasto" | "ingreso";

export interface Category extends BaseRecord {
  name: string;
  kind: CategoryKind;
  color: string | null;
}

export interface FixedExpense extends BaseRecord {
  name: string;
  amount_estimate: number;
  day_of_month: number;
  category_id: string | null;
  active: boolean;
}

export type PaymentMethod = "efectivo" | "debito" | "credito" | "transferencia" | "otro";

export interface Expense extends BaseRecord {
  date: string; // formato "YYYY-MM-DD"
  amount: number;
  category_id: string | null;
  description: string | null;
  payment_method: PaymentMethod | null;
  is_fixed: boolean;
  fixed_expense_id: string | null;
}

export interface Income extends BaseRecord {
  date: string;
  amount: number;
  category_id: string | null;
  description: string | null;
}

export type AssetType = "cripto" | "etf" | "moneda" | "otro";
export type Currency = "ARS" | "USD";

export interface Investment extends BaseRecord {
  date: string;
  asset_type: AssetType;
  asset_name: string; // ej. "BTC", "USDT", "SPY500"
  amount_original: number;
  currency_original: Currency;
  exchange_rate: number | null;
  amount_usd: number;
}

export interface InvestmentValuation extends BaseRecord {
  investment_id: string;
  date: string;
  value_usd: number;
  return_percentage: number;
  notes: string | null;
}
