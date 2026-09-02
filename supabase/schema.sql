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
--
-- "Borrar" una categoría nunca borra la fila (active = false, borrado suave):
-- así los gastos/ingresos/gastos fijos que ya la tenían siguen resolviendo su
-- nombre y color aunque ya no se pueda elegir para cargar algo nuevo. Ver
-- lib/repository/deleteCategory.ts.
-- =============================================================================
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('gasto', 'ingreso')),
  color      text, -- color hex para mostrar en gráficos (ej. "#1baf7a")
  active     boolean not null default true,
  sort_order int not null default 0, -- orden manual dentro de su tipo (gasto/ingreso); menor = más arriba
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table categories add column if not exists active boolean not null default true;
alter table categories add column if not exists sort_order int not null default 0;

-- Postgres no tiene "create trigger if not exists", así que hay que borrarlo
-- primero para que el script se pueda re-ejecutar sin error.
drop trigger if exists categories_set_updated_at on categories;
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
  day_of_month    int check (day_of_month between 1 and 31), -- opcional: null = "sin día fijo", se genera el día 1 (también se usa como vencimiento por defecto)
  active          boolean not null default true, -- false = desactivado, no se sigue generando (pero se conserva el histórico)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Si la tabla ya existía de una corrida anterior de este script con
-- day_of_month obligatorio, esto la deja opcional (no hace nada si ya lo era).
alter table fixed_expenses alter column day_of_month drop not null;

-- La plantilla de gasto fijo no categoriza (solo el nombre/descripción
-- alcanza) — la categoría se elige en el gasto ya generado, en Gastos.
-- OJO: esto borra cualquier categoría ya asignada a una plantilla existente.
alter table fixed_expenses drop column if exists category_id;

drop trigger if exists fixed_expenses_set_updated_at on fixed_expenses;
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
  due_date         date, -- opcional: fecha de vencimiento (ej. impuestos, tarjeta)
  is_paid          boolean not null default false, -- solo tiene sentido cuando hay due_date
  installment_number int, -- ej. 3 (de una compra en 6 cuotas) — null si no es una cuota
  installment_count  int, -- ej. 6 — null si no es una cuota
  installment_group_id uuid, -- compartido por todas las cuotas de la misma compra
  tag              text, -- etiqueta libre opcional (ej. "Viaje a Bariloche"), transversal a la categoría
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Agrega due_date/is_paid si la tabla ya existía de una corrida anterior sin estas columnas.
alter table expenses add column if not exists due_date date;
alter table expenses add column if not exists is_paid boolean not null default false;

-- Compra en cuotas de tarjeta: installment_number/installment_count identifican
-- "esta es la cuota 3 de 6", e installment_group_id es compartido por todas las
-- cuotas de la misma compra (para poder identificarlas juntas más adelante).
-- Las tres son opcionales — un gasto normal (o en un solo pago) las deja en null.
-- Ver lib/repository/planInstallments.ts.
alter table expenses add column if not exists installment_number int;
alter table expenses add column if not exists installment_count int;
alter table expenses add column if not exists installment_group_id uuid;

-- Etiqueta libre opcional, transversal a la categoría (ej. "Viaje a Bariloche"
-- puede cruzar comida/transporte/alojamiento). Ver componentes.gastos.TagInput.
alter table expenses add column if not exists tag text;

drop trigger if exists expenses_set_updated_at on expenses;
create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- índice pensado para el filtro más común: "gastos de este usuario en este mes"
create index if not exists expenses_user_id_date_idx on expenses (user_id, date);


-- =============================================================================
-- fixed_incomes
-- Plantillas de ingresos fijos (sueldo, alquiler que cobrás, etc.) — mismo
-- concepto que fixed_expenses, del lado de los ingresos: cada mes se usan
-- para generar automáticamente una fila en "incomes". Editar el monto de la
-- plantilla (ej. te aumentaron el sueldo) solo afecta lo que se genere de
-- ahí en adelante, no lo ya generado en meses anteriores.
-- =============================================================================
create table if not exists fixed_incomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  amount_estimate numeric(12, 2) not null,
  day_of_month    int check (day_of_month between 1 and 31), -- opcional: null = "sin día fijo", se genera el día 1
  active          boolean not null default true, -- false = desactivado, no se sigue generando (pero se conserva el histórico)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists fixed_incomes_set_updated_at on fixed_incomes;
create trigger fixed_incomes_set_updated_at
  before update on fixed_incomes
  for each row execute function set_updated_at();

create index if not exists fixed_incomes_user_id_idx on fixed_incomes (user_id);


-- =============================================================================
-- incomes
-- Ingresos del mes, cada uno categorizado (sueldo, extra/freelance, venta...).
-- Puede haber varios ingresos en el mismo mes, no solo un sueldo fijo. Un
-- ingreso generado automáticamente desde una plantilla fija queda marcado con
-- is_fixed = true y fixed_income_id apuntando a su plantilla de origen.
-- =============================================================================
create table if not exists incomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date            date not null,
  amount          numeric(12, 2) not null,
  category_id     uuid references categories(id) on delete set null,
  description     text,
  is_fixed        boolean not null default false,
  fixed_income_id uuid references fixed_incomes(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Agrega is_fixed/fixed_income_id si la tabla ya existía de una corrida
-- anterior sin estas columnas — toda fila existente pasa a ser "no fija" (su
-- significado no cambia, nada se generó automáticamente hasta ahora).
alter table incomes add column if not exists is_fixed boolean not null default false;
alter table incomes add column if not exists fixed_income_id uuid references fixed_incomes(id) on delete set null;

drop trigger if exists incomes_set_updated_at on incomes;
create trigger incomes_set_updated_at
  before update on incomes
  for each row execute function set_updated_at();

create index if not exists incomes_user_id_date_idx on incomes (user_id, date);


-- =============================================================================
-- investments
-- Una fila por posición de inversión cargada (no por activo): asset_type agrupa
-- para gráficos (cripto/etf/cedear/bono/moneda/otro) y asset_name guarda el nombre/ticker
-- específico (ej. "BTC", "USDT", "SPY500") para poder totalizar por activo real.
-- El monto se guarda en su moneda original y también convertido a USD (moneda
-- base) usando el tipo de cambio del día de la carga, para tener un total único.
--
-- kind = 'compra' (default) es un aporte que se suma a la posición; 'venta' se
-- resta (ver cost_basis_usd) — en una venta, amount_usd es lo RECIBIDO, no un
-- aporte. La ganancia/pérdida realizada (amount_usd - cost_basis_usd) no se
-- guarda, se calcula al leer (ver lib/aggregations/investmentSummary.ts).
--
-- quantity/market_symbol (opcionales) habilitan la cotización automática de
-- cripto: si una compra tiene las dos, su valor actual se recalcula solo
-- (cantidad × precio en vivo de CoinGecko) en vez de pedir el % a mano — ver
-- lib/crypto/, hooks/useAutoCryptoQuotes.ts.
-- =============================================================================
create table if not exists investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date              date not null,
  asset_type        text not null check (asset_type in ('cripto', 'etf', 'cedear', 'bono', 'moneda', 'otro')),
  asset_name        text not null, -- ej. "BTC", "USDT", "SPY500"
  kind              text not null default 'compra' check (kind in ('compra', 'venta')),
  amount_original   numeric(14, 2) not null,
  currency_original text not null check (currency_original in ('ARS', 'USD')),
  exchange_rate     numeric(12, 4), -- tipo de cambio ARS→USD usado ese día (null si ya se cargó en USD)
  amount_usd        numeric(14, 2) not null, -- monto convertido a la moneda base (USD) — o recibido, si es una venta
  cost_basis_usd    numeric(14, 2), -- solo en una venta: cuánto de lo invertido en ese activo libera
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Agrega kind/cost_basis_usd si la tabla ya existía de una corrida anterior
-- sin estas columnas — toda fila existente pasa a ser 'compra' (su
-- significado no cambia).
alter table investments add column if not exists kind text not null default 'compra' check (kind in ('compra', 'venta'));
alter table investments add column if not exists cost_basis_usd numeric(14, 2);

-- quantity: cantidad de unidades de esta compra/venta (ej. 0.05 BTC). market_symbol:
-- ticker para pedir la cotización en vivo (ej. "BTC"), separado de asset_name porque
-- ese es texto libre (ej. "SPY500") que puede no ser el ticker real que entiende la
-- API de precios. Las dos son opcionales y solo se usan hoy para cripto (ver
-- lib/crypto/coinGeckoIds.ts) — sin ellas, esa posición sigue con % manual como antes.
alter table investments add column if not exists quantity numeric(20, 8);
alter table investments add column if not exists market_symbol text;

-- Agrega 'cedear'/'bono' como asset_type válido si la tabla ya existía con el
-- check anterior (solo cripto/etf/moneda/otro) — no toca ninguna fila.
alter table investments drop constraint if exists investments_asset_type_check;
alter table investments add constraint investments_asset_type_check
  check (asset_type in ('cripto', 'etf', 'cedear', 'bono', 'moneda', 'otro'));

drop trigger if exists investments_set_updated_at on investments;
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

drop trigger if exists investment_valuations_set_updated_at on investment_valuations;
create trigger investment_valuations_set_updated_at
  before update on investment_valuations
  for each row execute function set_updated_at();

create index if not exists investment_valuations_investment_id_idx on investment_valuations (investment_id);


-- =============================================================================
-- category_budgets
-- Tope mensual opcional por categoría de gasto (ej. "Comida" hasta $150.000
-- por mes), o el tope total del mes si category_id es null (una fila especial,
-- no una categoría más). A lo sumo un presupuesto por categoría (o uno total)
-- — por eso el unique — y no tiene mes/año propio: es el mismo tope todos los
-- meses hasta que se edite.
-- =============================================================================
create table if not exists category_budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id    uuid references categories(id) on delete cascade, -- null = tope total del mes (no por categoría)
  monthly_amount numeric(12, 2) not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique nulls not distinct (user_id, category_id)
);

-- Si la tabla ya existía de una corrida anterior con category_id obligatorio,
-- esto la deja opcional y cambia el unique para que category_id = null
-- también cuente como duplicado (a lo sumo una fila "tope total" por usuario).
alter table category_budgets alter column category_id drop not null;
alter table category_budgets drop constraint if exists category_budgets_user_id_category_id_key;
alter table category_budgets add constraint category_budgets_user_id_category_id_key
  unique nulls not distinct (user_id, category_id);

drop trigger if exists category_budgets_set_updated_at on category_budgets;
create trigger category_budgets_set_updated_at
  before update on category_budgets
  for each row execute function set_updated_at();

create index if not exists category_budgets_user_id_idx on category_budgets (user_id);


-- =============================================================================
-- investment_goals
-- Una meta de inversión (a lo sumo una activa): cuánto querés llegar a tener
-- invertido para una fecha, y/o cuánto querés aportar por mes. Los dos campos
-- de monto son opcionales — se puede definir solo uno de los dos.
--
-- El aporte mensual se puede cargar en ARS o USD (igual que una inversión):
-- monthly_contribution_amount/currency guardan lo que escribió el usuario tal
-- cual, y monthly_contribution_usd es el equivalente ya convertido, que es lo
-- que se usa para comparar contra los aportes reales del mes.
-- =============================================================================
create table if not exists investment_goals (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_amount_usd           numeric(14, 2),
  target_date                 date,
  monthly_contribution_amount numeric(14, 2), -- monto tal cual lo escribió el usuario
  monthly_contribution_currency text check (monthly_contribution_currency in ('ARS', 'USD')),
  monthly_contribution_usd    numeric(14, 2), -- equivalente en USD, usado para comparar
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Si la tabla ya existía de una corrida anterior sin estas dos columnas.
alter table investment_goals add column if not exists monthly_contribution_amount numeric(14, 2);
alter table investment_goals add column if not exists monthly_contribution_currency text
  check (monthly_contribution_currency in ('ARS', 'USD'));

drop trigger if exists investment_goals_set_updated_at on investment_goals;
create trigger investment_goals_set_updated_at
  before update on investment_goals
  for each row execute function set_updated_at();

create index if not exists investment_goals_user_id_idx on investment_goals (user_id);


-- =============================================================================
-- push_subscriptions
-- Una fila por dispositivo/navegador suscripto a notificaciones push (ver
-- lib/notifications/, app/api/notifications/check). No se sincroniza al
-- resto de la app (no está en lib/types.ts ni en SYNCED_TABLES): es un dato
-- puramente por-dispositivo, no tiene sentido bajarlo a otro navegador. El
-- cliente escribe acá directo con su propia sesión (RLS normal, como el
-- resto de las tablas).
-- =============================================================================
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists push_subscriptions_set_updated_at on push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on push_subscriptions
  for each row execute function set_updated_at();

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);


-- =============================================================================
-- notification_log
-- Registro de "esto ya se avisó" para /api/notifications/check: antes de
-- mandar una notificación, intenta insertar una fila acá (con esta clave
-- única) — si ya existía, no se manda de nuevo. `period` es el due_date
-- ("YYYY-MM-DD") para gastos, o el mes ("YYYY-MM") para presupuestos, así un
-- gasto con vencimiento editado o un presupuesto que se repite el mes que
-- viene sí vuelven a avisar.
--
-- A propósito SIN políticas de RLS para select/authenticated: ni siquiera el
-- dueño de la fila puede leer/escribir esto con su propia sesión — solo el
-- service role (que bypassea RLS) desde el chequeo del servidor. No hace
-- falta que el usuario vea ni toque este registro.
-- =============================================================================
create table if not exists notification_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null,
  entity_id text not null,
  period    text not null,
  sent_at   timestamptz not null default now(),
  unique (user_id, kind, entity_id, period)
);

alter table notification_log enable row level security;

create index if not exists notification_log_user_id_idx on notification_log (user_id);


-- =============================================================================
-- Row Level Security — cada usuario solo ve y modifica sus propias filas.
-- Se repite el mismo patrón de 4 políticas (select/insert/update/delete) por
-- tabla porque Postgres no permite una política "para todos los comandos" con
-- distinto USING/WITH CHECK; mantenerlas separadas también las hace más fáciles
-- de leer una por una.
-- =============================================================================
-- Cada política se borra (si existía) antes de crearla, igual que los
-- triggers más arriba — Postgres tampoco tiene "create policy if not
-- exists". Sin este drop, la tabla que ya tenía sus políticas de una
-- corrida anterior frenaba con error TODO el loop, dejando sin políticas a
-- las tablas que venían después en el array (como pasó acá con las dos
-- tablas nuevas al re-ejecutar el script).
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'fixed_expenses', 'expenses', 'fixed_incomes', 'incomes', 'investments', 'investment_valuations', 'category_budgets', 'investment_goals', 'push_subscriptions']
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_select_own', t);
    execute format(
      'create policy %I on %I for select using (auth.uid() = user_id)',
      t || '_select_own', t
    );

    execute format('drop policy if exists %I on %I', t || '_insert_own', t);
    execute format(
      'create policy %I on %I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t
    );

    execute format('drop policy if exists %I on %I', t || '_update_own', t);
    execute format(
      'create policy %I on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t
    );

    execute format('drop policy if exists %I on %I', t || '_delete_own', t);
    execute format(
      'create policy %I on %I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t
    );
  end loop;
end $$;
