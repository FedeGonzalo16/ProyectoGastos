-- =============================================================================
-- GastosApp — schema de base de datos (Supabase / Postgres)
-- =============================================================================
-- Cómo usarlo: pegar todo este archivo en el SQL Editor de tu proyecto de
-- Supabase (https://app.supabase.com → tu proyecto → SQL Editor → New query)
-- y ejecutarlo una sola vez. Es seguro volver a correrlo (usa "if not exists" /
-- "or replace" en todos lados), por si necesitás aplicar una versión nueva.
--
-- Todas las tablas tienen Row Level Security (RLS) activado: cada usuario solo
-- puede ver y modificar sus propias filas (auth.uid() = user_id). Esto es lo
-- que permite que la app llame a Supabase directo desde el navegador sin
-- necesidad de un backend propio que valide permisos.
-- =============================================================================

create extension if not exists pgcrypto; -- para gen_random_uuid()


-- -----------------------------------------------------------------------------
-- Función auxiliar: mantiene "updated_at" al día en cada UPDATE.
-- Se usa desde un trigger en cada tabla (ver más abajo) y es clave para el
-- modo offline: la app compara updated_at para decidir qué versión de un
-- registro es la más reciente cuando sincroniza.
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- =============================================================================
-- categories
-- Categorías de gasto o de ingreso (ej. "Comida", "Transporte", "Sueldo").
-- El mismo tipo de tabla sirve para las dos cosas; se distinguen por "kind".
-- =============================================================================
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('gasto', 'ingreso')),
  color      text, -- color hex para mostrar en gráficos (ej. "#1baf7a")
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

create index if not exists categories_user_id_idx on categories (user_id);


-- =============================================================================
-- fixed_expenses
-- Plantillas de gastos fijos (alquiler, monotributo, servicios, etc.).
-- No son gastos en sí: cada mes se usan para generar automáticamente una fila
-- en "expenses". Editar el monto de la plantilla solo afecta lo que se genere
-- de ahí en adelante, no lo ya generado en meses anteriores.
-- =============================================================================
create table if not exists fixed_expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  amount_estimate numeric(12, 2) not null,
  day_of_month    int not null check (day_of_month between 1 and 31),
  category_id     uuid references categories(id) on delete set null,
  active          boolean not null default true, -- false = desactivado, no se sigue generando (pero se conserva el histórico)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger fixed_expenses_set_updated_at
  before update on fixed_expenses
  for each row execute function set_updated_at();

create index if not exists fixed_expenses_user_id_idx on fixed_expenses (user_id);


-- =============================================================================
-- expenses
-- Gastos diarios — es la fuente única de verdad: el resumen mensual se calcula
-- filtrando esta misma tabla por rango de fechas, no se duplica en otro lado.
-- Un gasto generado automáticamente desde una plantilla fija queda marcado con
-- is_fixed = true y fixed_expense_id apuntando a su plantilla de origen.
-- =============================================================================
create table if not exists expenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date             date not null,
  amount           numeric(12, 2) not null,
  category_id      uuid references categories(id) on delete set null,
  description      text,
  payment_method   text check (payment_method in ('efectivo', 'debito', 'credito', 'transferencia', 'otro')),
  is_fixed         boolean not null default false,
  fixed_expense_id uuid references fixed_expenses(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- índice pensado para el filtro más común: "gastos de este usuario en este mes"
create index if not exists expenses_user_id_date_idx on expenses (user_id, date);


-- =============================================================================
-- incomes
-- Ingresos del mes, cada uno categorizado (sueldo, extra/freelance, venta...).
-- Puede haber varios ingresos en el mismo mes, no solo un sueldo fijo.
-- =============================================================================
create table if not exists incomes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  amount      numeric(12, 2) not null,
  category_id uuid references categories(id) on delete set null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger incomes_set_updated_at
  before update on incomes
  for each row execute function set_updated_at();

create index if not exists incomes_user_id_date_idx on incomes (user_id, date);


-- =============================================================================
-- investments
-- Una fila por posición de inversión cargada (no por activo): asset_type agrupa
-- para gráficos (cripto/etf/moneda/otro) y asset_name guarda el nombre/ticker
-- específico (ej. "BTC", "USDT", "SPY500") para poder totalizar por activo real.
-- El monto se guarda en su moneda original y también convertido a USD (moneda
-- base) usando el tipo de cambio del día de la carga, para tener un total único.
-- =============================================================================
create table if not exists investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date              date not null,
  asset_type        text not null check (asset_type in ('cripto', 'etf', 'moneda', 'otro')),
  asset_name        text not null, -- ej. "BTC", "USDT", "SPY500"
  amount_original   numeric(14, 2) not null,
  currency_original text not null check (currency_original in ('ARS', 'USD')),
  exchange_rate     numeric(12, 4), -- tipo de cambio ARS→USD usado ese día (null si ya se cargó en USD)
  amount_usd        numeric(14, 2) not null, -- monto convertido a la moneda base (USD)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger investments_set_updated_at
  before update on investments
  for each row execute function set_updated_at();

create index if not exists investments_user_id_idx on investments (user_id);


-- =============================================================================
-- investment_valuations
-- Historial de valor/rendimiento de cada inversión a lo largo del tiempo, para
-- poder graficar la evolución del % de rendimiento (no solo el valor actual).
-- =============================================================================
create table if not exists investment_valuations (
  id                uuid primary key default gen_random_uuid(),
  investment_id     uuid not null references investments(id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date              date not null,
  value_usd         numeric(14, 2) not null,
  return_percentage numeric(7, 3) not null, -- ej. 8.2 = +8.2%
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger investment_valuations_set_updated_at
  before update on investment_valuations
  for each row execute function set_updated_at();

create index if not exists investment_valuations_investment_id_idx on investment_valuations (investment_id);


-- =============================================================================
-- Row Level Security — cada usuario solo ve y modifica sus propias filas.
-- Se repite el mismo patrón de 4 políticas (select/insert/update/delete) por
-- tabla porque Postgres no permite una política "para todos los comandos" con
-- distinto USING/WITH CHECK; mantenerlas separadas también las hace más fáciles
-- de leer una por una.
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'fixed_expenses', 'expenses', 'incomes', 'investments', 'investment_valuations']
  loop
    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy %I on %I for select using (auth.uid() = user_id)',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t
    );
  end loop;
exception
  when duplicate_object then
    -- las políticas ya existían (re-ejecutando el script) — no hay nada más que hacer
    null;
end $$;
