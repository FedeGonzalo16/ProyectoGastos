# App de finanzas personales (Gastos + Inversiones) — reemplazo del Excel

## Contexto

Hoy el usuario controla gastos diarios, gastos mensuales (fijos + variables), ingresos e
inversiones (BTC, ETF, USD, pesos) en Excel. Quiere centralizarlo en una app con
dashboards, usable principalmente desde su iPhone y también desde una PC. Se descartó
React Native/Expo: la solución será una **web app** (con soporte PWA para "agregar a
pantalla de inicio" en iOS, sin necesidad de App Store).

Decisiones ya confirmadas con el usuario:
- **Backend/DB**: Supabase (Postgres + Auth), plan free permanente. Se descartó MongoDB
  porque los datos son relacionales (gasto → categoría → mes, inversión → activo) y
  Supabase da login y RLS listos para usar, sin backend propio.
- **Monedas**: las inversiones se guardan en su moneda original (ARS o USD) *y* se
  convierten a una moneda base (USD) usando el tipo de cambio del día de la carga, para
  tener un total consolidado.
- **Gastos fijos**: se definen una vez como plantilla y se auto-generan cada mes nuevo
  (el usuario solo ajusta el monto si cambió).
- **Datos previos**: se arranca de cero, sin importar el Excel.
- **Ingresos categorizados**: no solo "sueldo" — puede haber ingresos extra (freelance,
  venta, etc.) y también los gastos deben poder diferenciarse por tipo (transporte,
  monotributo, comida, etc.). Ingresos y gastos comparten el mismo sistema de
  categorías, cada uno con su lista de categorías propia.
- **Comparativa y filtros**: se necesita un panel de comparación ingresos vs gastos vs
  inversión, con filtro por período (mes o rango), no solo el total del mes actual.
- **Diseño visual antes de programar**: antes de escribir código, se hace una primera
  pasada de diseño (mockups de las pantallas clave) para validar look & feel y layout.
- **Estilo visual**: diseño intuitivo y llamativo pero sin colores neón (paleta sobria,
  con acentos de color con buen contraste, nada saturado/fluorescente); debe soportar
  **modo claro y modo oscuro**, con toggle o siguiendo la preferencia del sistema.
- **Diseño aprobado**: mockups revisados y aceptados (ver `design/` — canvas con
  Dashboard claro/oscuro, Gastos, Mensual e Inversiones).
- **Activos con nombre propio**: no alcanza con un tipo genérico "ETF" o "cripto" — hay
  que poder guardar el activo específico (ej. "SPY500", "BTC", "USDT", "QQQ") para
  distinguir posiciones dentro del mismo tipo.
- **Gastos fijos totalmente editables**: además de auto-generarse cada mes, el usuario
  tiene que poder agregar nuevas plantillas de gasto fijo en cualquier momento, y
  editar/actualizar el monto (o categoría, día) de una plantilla existente cuando
  cambia — sin perder el histórico de lo ya generado en meses anteriores.
- **Funciona sin conexión**: si no hay internet, la app tiene que seguir funcionando
  contra una copia local (localStorage) y sincronizar con Supabase apenas vuelve la
  conexión, en ambos sentidos (subir lo cargado offline, bajar lo que cambió en otro
  dispositivo).

Proyecto está vacío (carpeta nueva, sin git). Se crea todo desde cero.

## Stack

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS** — un solo proyecto web,
  responsive, funciona bien en Safari iOS.
- **Supabase**: Postgres, Auth (email/password), RLS por usuario.
- **Recharts** para los gráficos.
- **PWA**: `manifest.json` + iconos + meta tags de Apple para poder "agregar a inicio"
  en iOS y que se vea como una app.
- **Deploy**: Vercel (free) para el front, Supabase (free) para la base. El usuario debe
  crear la cuenta de Supabase manualmente (paso externo que no puedo hacer yo); yo dejo
  el schema SQL listo para pegar en el SQL editor de Supabase.

## Modelo de datos (Postgres, todas las tablas con `user_id` + RLS `auth.uid() = user_id`)

- `categories`: id, user_id, name, kind (`gasto`|`ingreso`), color — ej. gastos:
  "Transporte", "Monotributo", "Comida"; ingresos: "Sueldo", "Extra/Freelance", "Venta"
- `expenses` (gastos diarios — fuente única de verdad): id, user_id, date, amount (ARS),
  category_id, description, payment_method, is_fixed (bool), fixed_expense_id (FK nullable)
- `fixed_expenses` (plantillas de gastos fijos): id, user_id, name, amount_estimate,
  day_of_month, category_id, active
- `incomes` (ingresos, uno o varios por mes, cada uno categorizado): id, user_id, date,
  amount, category_id (kind ingreso), description — permite distinguir sueldo de
  ingresos extra/puntuales, igual que los gastos
- `investments`: id, user_id, date, asset_type (`cripto`|`etf`|`moneda`|`otro` — categoría
  amplia para agrupar y colorear gráficos), asset_name (texto libre: "BTC", "USDT",
  "SPY500", "QQQ", etc. — el nombre/ticker específico que se muestra en listas y
  totales por activo), amount_original, currency_original (`ARS`|`USD`), exchange_rate,
  amount_usd
- `investment_valuations` (historial de valor/rendimiento): id, investment_id, date,
  value_usd, return_percentage, notes

**Gastos mensuales = vista calculada**, no una tabla duplicada: se filtran `expenses`
por rango de fechas del mes + se listan `incomes` de ese mismo rango. Así el gasto
diario "sincroniza" automáticamente con el mensual (es la misma tabla).

**Auto-generación de gastos fijos**: al entrar por primera vez a un mes sin gastos fijos
generados, se insertan en `expenses` una fila por cada `fixed_expenses.active`, con
`is_fixed=true` y el monto estimado (editable después, ese registro puntual no afecta
la plantilla).

**Gastos fijos, CRUD completo**: desde `/configuracion` se pueden crear nuevas
plantillas en cualquier momento, editar el monto/categoría/día de una existente, y
desactivarla (soft delete, para no perder el histórico de `expenses` ya generado). Un
cambio de monto en la plantilla solo afecta los meses futuros que se generen a partir
de ahí — los meses ya generados quedan con el monto que tenían (se pueden editar
manualmente ese mes puntual desde `/gastos` si hace falta corregir algo retroactivo).

## Modo offline / sincronización

La app tiene que poder cargarse y leerse sin conexión, y ponerse al día sola cuando
vuelve el internet. Se implementa como una capa propia entre los componentes y
Supabase (nunca los componentes hablan directo con Supabase ni con localStorage — así
se puede cambiar la estrategia de guardado sin tocar las pantallas):

- `lib/offline/localStore.ts` — wrapper tipado sobre `localStorage`: guarda una copia
  local de cada tabla (gastos, ingresos, inversiones, plantillas fijas, categorías).
  Es la fuente de verdad para pintar la UI al instante, haya o no conexión.
- `lib/offline/syncQueue.ts` — cola de operaciones pendientes (crear/editar/borrar),
  también persistida en localStorage para que sobreviva un refresh de la página.
- `lib/offline/syncEngine.ts` — al detectar conexión (evento `online` del browser +
  reintento periódico): 1) sube en orden lo que esté en la cola pendiente, 2) baja de
  Supabase lo que haya cambiado y actualiza la copia local. Al perder conexión,
  simplemente deja de intentar y la app sigue funcionando contra la copia local.
- `lib/repository/*.ts` — un repositorio por entidad (ej. `expensesRepository.ts`) que
  expone funciones simples (`list`, `create`, `update`, `remove`) y por dentro decide
  si lee/escribe local, remoto, o ambos vía la cola — es la única puerta de entrada que
  usan los componentes/hooks de cada pantalla.
- **Resolución de conflictos simplificada**: al ser una app de un solo usuario, se
  resuelve "el último cambio guardado gana" usando `updated_at`; no se implementa
  fusión de conflictos más sofisticada (no hace falta para este caso de uso).

## Páginas (Next.js App Router)

- `/login` — Supabase auth
- `/` — Dashboard: selector de período (mes actual, últimos 6/12 meses, rango custom) que
  filtra todos los gráficos de la página; **comparativa Ingresos vs Gastos vs
  Inversión** (barras agrupadas o líneas, una serie por concepto, por mes) como gráfico
  principal; torta de gastos del mes por categoría; torta de ingresos por categoría
- `/gastos` — alta rápida de gasto diario (monto, categoría, fecha, descripción) + listado
  filtrable por rango de fechas/categoría
- `/mensual?mes=YYYY-MM` — selector de mes, ingresos del mes (categorizados) vs gastos
  fijos + variables (de `expenses`), balance (ingresos − gastos), torta de gastos por
  categoría, torta de ingresos por categoría, y barra comparativa contra meses anteriores
- `/inversiones` — alta de inversión (fecha, tipo de activo, **nombre/ticker propio**,
  monto, moneda, tipo de cambio), tabla de totales por activo (agrupado por
  asset_name) + total general en USD, torta por tipo de activo, línea de evolución de
  rendimiento %, filtrable por período
- `/configuracion` — categorías (de gasto e ingreso) y **CRUD de plantillas de gastos
  fijos** (alta, edición de monto/categoría/día, desactivar)

## Pasos de implementación

0. ✅ **Diseño visual (mockups)** — hecho y aprobado (`design/gastos-app-mockups.html`).
1. ✅ Scaffold: `create-next-app` (TS + Tailwind + App Router), init git.
2. ✅ Archivo `supabase/schema.sql` con el modelo de datos completo + políticas RLS,
   listo para pegar en el SQL Editor de Supabase.
3. ✅ Cliente Supabase (`lib/supabase/client.ts` + `server.ts`) + `app/login` + `proxy.ts`
   (renovación de sesión).
4. ✅ Capa offline (`lib/offline/*`, `lib/repository/*`): localStorage + cola de
   sincronización + motor de sync, y un repositorio genérico por entidad.
5. ✅ Módulo Gastos diarios: formulario + listado (`app/(protected)/gastos`), usando el
   repositorio de gastos. Categorías por defecto se siembran solas en el primer login.
6. ✅ Módulo Mensual (`app/(protected)/mensual`): auto-generación de gastos fijos al
   entrar al mes, alta de ingresos categorizados, desglose fijos/variables, balance,
   tortas de gastos/ingresos por categoría, comparativa contra meses anteriores.
   Incluye `app/(protected)/configuracion` (CRUD de plantillas de gastos fijos: alta,
   editar monto/categoría/día, activar/desactivar).
7. Módulo Inversiones: formulario con conversión de moneda, tabla de totales, historial
   de valuación y gráficos. *(pendiente — página placeholder ya creada)*
8. Dashboard home con los gráficos combinados. *(pendiente — página placeholder ya creada,
   ya existen los componentes de gráficos reutilizables — `components/charts/*` — que
   se usaron en Mensual)*
9. ✅ PWA: `manifest.json` + ícono + meta tags iOS (`app/layout.tsx`).
10. Instrucciones de deploy: variables de entorno en Vercel
    (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y conexión del repo.
    *(pendiente — requiere que el usuario cree su proyecto de Supabase primero)*

**Para que la app funcione de verdad** (más allá de compilar) todavía falta que el
usuario cree su proyecto en Supabase, pegue `supabase/schema.sql` en el SQL Editor, y
copie `.env.local.example` a `.env.local` con la URL y la anon key de ese proyecto.

## Verificación

- `npm run dev` local, probar flujo completo: crear categoría → cargar gasto diario →
  verificar que aparece en `/mensual` del mes correspondiente → cargar ingreso → cargar
  inversión en ARS y ver el equivalente en USD → revisar que los 3 dashboards de
  gráficos renderizan con datos reales.
- Probar en Safari de iPhone (mismo Wi-Fi, IP local o preview de Vercel) y confirmar que
  "Agregar a pantalla de inicio" funciona y se ve bien en mobile.
