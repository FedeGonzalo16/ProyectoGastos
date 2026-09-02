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
  /** false = "borrada": ya no se puede elegir para cargar algo nuevo, pero la fila se conserva. */
  active: boolean;
  /** Orden manual dentro de su tipo (gasto/ingreso) — menor = más arriba. Ver lib/repository/categoryOrder.ts. */
  sort_order: number;
}

export interface FixedExpense extends BaseRecord {
  name: string;
  amount_estimate: number;
  /** Día del mes en que se genera (1-31), o `null` si no importa el día exacto. También se usa como vencimiento por defecto del gasto generado (ver `due_date` en `Expense`), editable después mes a mes si hace falta. */
  day_of_month: number | null;
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
  /** Fecha de vencimiento opcional, formato "YYYY-MM-DD". `null` = sin vencimiento (no se muestra ningún estado de pago). */
  due_date: string | null;
  /** Solo tiene sentido cuando hay `due_date`; se ignora en el resto de los gastos. */
  is_paid: boolean;
  /** Cuál cuota es (ej. 3 de una compra en 6) — `null` si no es una compra en cuotas. Ver `lib/repository/planInstallments.ts`. */
  installment_number: number | null;
  /** Cuántas cuotas tiene en total la compra — `null` si no es una compra en cuotas. */
  installment_count: number | null;
  /** Compartido por todas las cuotas generadas de la misma compra — `null` si no es una compra en cuotas. */
  installment_group_id: string | null;
  /** Etiqueta libre opcional, transversal a la categoría (ej. "Viaje a Bariloche") — `null` si no se cargó ninguna. */
  tag: string | null;
}

export interface FixedIncome extends BaseRecord {
  name: string;
  amount_estimate: number;
  /** Día del mes en que se genera (1-31), o `null` si no importa el día exacto. */
  day_of_month: number | null;
  active: boolean;
}

export interface Income extends BaseRecord {
  date: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  is_fixed: boolean;
  fixed_income_id: string | null;
}

export type AssetType = "cripto" | "etf" | "cedear" | "bono" | "moneda" | "otro";
export type Currency = "ARS" | "USD";
export type InvestmentKind = "compra" | "venta";

export interface Investment extends BaseRecord {
  date: string;
  asset_type: AssetType;
  asset_name: string; // ej. "BTC", "USDT", "SPY500"
  /** "compra" (default) = un aporte que se suma a la posición. "venta" = se resta (ver cost_basis_usd). */
  kind: InvestmentKind;
  amount_original: number;
  currency_original: Currency;
  exchange_rate: number | null;
  /** En una compra: el monto aportado. En una venta: el monto RECIBIDO por la venta. */
  amount_usd: number;
  /**
   * Solo en una venta: cuánto de lo ya invertido en ese activo se libera con
   * esta venta (en USD). La ganancia/pérdida realizada es `amount_usd -
   * cost_basis_usd`, no se guarda — se calcula. `null` en una compra.
   */
  cost_basis_usd: number | null;
  /** Cantidad de unidades de esta compra/venta (ej. 0.05 BTC). `null` si no se cargó (queda sin cotización automática, ver `market_symbol`). */
  quantity: number | null;
  /**
   * Ticker para pedir la cotización en vivo (ej. "BTC") — separado de
   * `asset_name` porque ese es texto libre (ej. "SPY500") que puede no ser
   * el ticker real que entiende la API de precios. Junto con `quantity`,
   * habilita la cotización automática de cripto (ver `lib/crypto/`); `null`
   * si no se cargó, esa posición sigue con % de rendimiento manual.
   */
  market_symbol: string | null;
}

export interface InvestmentValuation extends BaseRecord {
  investment_id: string;
  date: string;
  value_usd: number;
  return_percentage: number;
  notes: string | null;
}

/** Tope mensual para una categoría de gasto — a lo sumo uno por categoría. */
/** `category_id: null` es el tope total del mes (no por categoría). */
export interface CategoryBudget extends BaseRecord {
  category_id: string | null;
  monthly_amount: number;
}

/**
 * Meta de inversión: cuánto se quiere llegar a tener invertido para una
 * fecha, y/o cuánto se quiere aportar por mes. Se espera a lo sumo una fila
 * (la meta "activa"); todos los campos de contenido son opcionales.
 *
 * El aporte mensual admite ARS o USD, igual que una inversión:
 * `monthly_contribution_amount`/`_currency` guardan lo que escribió el
 * usuario tal cual, `monthly_contribution_usd` es el equivalente ya
 * convertido (lo que se usa para comparar contra los aportes reales).
 */
export interface InvestmentGoal extends BaseRecord {
  target_amount_usd: number | null;
  target_date: string | null;
  monthly_contribution_amount: number | null;
  monthly_contribution_currency: Currency | null;
  monthly_contribution_usd: number | null;
}
