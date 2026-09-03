# GastosApp — estado del proyecto

Resumen de todo lo que se implementó hasta ahora y hasta dónde llegamos. El plan
original (con las decisiones de arquitectura) sigue en [PLAN.md](PLAN.md); este
archivo es la foto del estado actual + ideas para seguir mejorando la app.

## Qué es

Web app personal para centralizar gastos diarios, resumen mensual e inversiones —
reemplazo del Excel que usaba antes el usuario. Pensada mobile-first (uso principal
desde iPhone vía Safari, instalable como PWA), pero funciona igual en desktop.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**
- **Supabase** (Postgres + Auth), plan free
- **Modo offline-first**: copia local en `localStorage` + cola de sincronización +
  motor de sync que sube/baja cambios cuando hay conexión (`lib/offline/`)
- **PWA básica**: `manifest.json` + ícono + meta tags de iOS — pasos de instalación
  (iPhone/Android/compu) en [`INSTALACION.md`](INSTALACION.md)
- Paleta de colores y mockups aprobados en `design/` (validados con la skill de
  dataviz para que las categorías de los gráficos se distingan bien, sin neón)

## Arquitectura de datos

- `lib/types.ts` — tipos de dominio (Category, Expense, Income, Investment, etc.)
- `lib/offline/` — `localStore` (lectura/escritura local), `syncQueue` (cola
  persistida, avisa por evento cuando cambia), `syncEngine` (push/pull contra
  Supabase, "el más reciente gana"), `connectivity` (online/offline)
- `lib/repository/` — una fábrica genérica (`createRepository`) + un repositorio
  por entidad; las pantallas nunca hablan con Supabase ni con `localStorage`
  directo, solo con estos repositorios (vía `useRepositories()`)
- `lib/aggregations/` — funciones puras para los cálculos (totales por mes,
  presupuestos, resumen de inversiones)
- `components/charts/` — gráficos reutilizables (torta, barras, línea), con color
  fijo por entidad (nunca por posición/ranking)

## Módulos implementados

### Autenticación (`/login`, `/reset-password`)
Iniciar sesión, crear cuenta, "olvidé mi contraseña" (manda un mail y cae en
`/reset-password` para elegir una nueva).

### Gastos diarios (`/gastos`)
Alta rápida, **edición y borrado**, categorías con creación inline ("+ Nueva" sin
salir del formulario), filtro de "Gastos recientes" por período (7 días / 30 días /
todo), por categoría, por **etiqueta** y por **búsqueda de texto libre** (busca en
la descripción).

**Compra en cuotas de tarjeta**: al cargar un gasto en Crédito, un campo opcional
"Cantidad de cuotas" — el monto que se tipea es el de UNA cuota (igual a como se
anuncia, ej. "6 cuotas de $20.000"), y al guardar se generan esa cantidad de gastos,
uno por mes, cada uno ya fechado en el mes que corresponde (así el resumen mensual
los cuenta cada uno en su mes, no todos juntos en el de la compra) — mismo día del
mes, ajustado si ese mes es más corto (`lib/repository/planInstallments.ts`). Si
además se cargó un vencimiento, también se avanza mes a mes conservando su propio
día. Cada cuota queda marcada "CUOTA n/N" en el listado y comparte un
`installment_group_id` con el resto de la misma compra (hoy no se usa desde la UI,
pero deja la puerta abierta a un futuro "borrar las cuotas restantes"). Editar una
cuota ya generada no permite cambiar la cantidad — es una compra ya cerrada, se
edita cada fila individualmente como cualquier otro gasto. En el Dashboard,
**"Próximos vencimientos de tarjeta"** suma lo ya cargado en Crédito (cuotas futuras
incluidas) para este mes y los dos siguientes — solo aparece si hay al menos un
gasto en Crédito.

**Etiqueta libre**: un campo de texto opcional más en el gasto (con autocompletado
de etiquetas ya usadas, para evitar duplicados por typo), pensado para algo
transversal a la categoría (ej. "Viaje a Bariloche", que cruza comida/transporte/
alojamiento) — una sola etiqueta por gasto, no varias. Se puede filtrar el listado
por etiqueta, y al elegir una se muestra el total de esa etiqueta (no solo la lista
recortada a 50).

### Mensual (`/mensual`)
Selector de mes, auto-generación de gastos **e ingresos** fijos activos al entrar a
un mes nuevo, ingresos individuales categorizados (con **edición, borrado y
búsqueda de texto** sobre la descripción, y badge "FIJO" en los generados desde una
plantilla), desglose de gastos fijos vs. variables, balance, tortas de
gastos/ingresos por categoría, comparativa contra los últimos 6 meses, y progreso de
presupuestos (total del mes + por categoría, con barra que se pone roja si te pasás).

### Gastos fijos (`/gastos-fijos`, linkeado desde Mensual)
CRUD de plantillas: nombre, monto estimado, día del mes (**opcional** — si no se
pone, se genera el día 1), categoría, activar/desactivar. Un cambio de monto en la
plantilla solo afecta lo que se genere de ahí en adelante.

### Ingresos fijos (`/ingresos-fijos`, linkeado desde Mensual)
Mismo concepto que Gastos fijos, del lado de los ingresos (ej. el sueldo): CRUD de
plantillas (nombre, monto estimado, día del mes opcional, activar/desactivar), sin
categoría en la plantilla (se elige en el ingreso ya generado, en Mensual) y
**editable en cualquier momento** — si el sueldo cambia, se edita el monto de la
plantilla y solo afecta lo que se genere de ahí en adelante, lo ya generado en
meses anteriores queda con el monto que tenía.

### Inversiones (`/inversiones`, alta/edición en `/inversiones/nueva`)
`/inversiones` es solo para VER los datos: totales, distribución por tipo de activo,
evolución del rendimiento (ponderado por monto invertido, no promedio simple),
**evolución del valor total de la cartera** (capital + rendimiento, con toggle
USD/ARS), **rendimiento por activo individual en el tiempo** (agrupando todas las
cargas de un mismo `asset_name`, ej. todo el BTC junto, en un gráfico de varias
líneas), y dos listas separadas: **Posiciones** (el neto actual por activo — cuánto
tenés invertido ahora y en qué, con el **% que representa del total invertido** al
lado del monto, ej. "50%" si la mitad de la cartera está en ese activo — mismo
total que ya se muestra en "Total invertido" arriba, `AssetPosition.percentageOfTotal`
en `lib/aggregations/investmentSummary.ts`) e **Historial** (cada compra/venta individual, en
orden cronológico, para consultar — con editar/borrar y carga de % de rendimiento).
Cargar o editar una transacción (fecha, tipo de activo, nombre/ticker libre como
"BTC" o "SPY500", monto, moneda ARS/USD con conversión) es otra pantalla (botón
"+ Nueva inversión" arriba de todo, o "Editar" en cada fila del Historial), para
que esa acción no compita visualmente con toda la información — mismo criterio que
"Gestionar categorías". También hay una **meta de inversión**: monto objetivo +
fecha, con cálculo automático de cuánto conviene ahorrar por mes para llegar a
tiempo.

Cada transacción es una **compra** o una **venta** (trade) — el tipo se fija al
crear y **no se puede cambiar editando** (evita convertir sin querer una compra
existente en una venta, perdiendo el registro original). Una venta no resta el
monto recibido — pide además "costo de lo vendido" (cuánto de lo ya invertido en
ese activo libera, con un botón "Usar todo" y tope en el neto disponible) y con
eso se calcula la ganancia/pérdida realizada (`recibido - costo`), mostrada por
transacción y como total acumulado. Una venta no genera valuación (no tiene "%
rendimiento" en el tiempo, es una operación cerrada) y no cuenta como "aportado
este mes" para la meta de inversión — vender no es aportar capital nuevo. Un
activo totalmente vendido deja de aparecer en Posiciones y en la torta de
distribución, ni pesa en el "Rendimiento" promedio de la cartera (una posición
que ya no tenés no debería influir en el promedio de hoy).

**Cotización automática de cripto**: una compra de tipo cripto puede cargar,
además, la **cantidad** de unidades (ej. 0.05) y un **símbolo de mercado**
(ej. "BTC") — si el símbolo está en la lista reconocida
(`lib/crypto/coinGeckoIds.ts`), esa posición pasa a calcular sola su % de
rendimiento (`cantidad × precio en vivo de CoinGecko`, sin cuenta ni clave,
igual que el dólar) cada vez que se abre Inversiones (o con el botón
"Actualizar" que aparece si hay al menos una posición así), en vez de
cargarlo a mano — se ve con la etiqueta "auto" y ya no se puede editar el %
de esa fila. Es un agregado sobre el mismo sistema de valuaciones que ya
existía (se guarda una valuación más, con el % ya calculado), así que el
resto de los gráficos de rendimiento no tuvieron que cambiar. Ambos campos
son opcionales y solo aplican a cripto — el resto de los tipos (ETF, moneda,
otro) sigue con % manual, igual que cualquier cripto sin cantidad/símbolo
cargado o con un símbolo no reconocido (la lista es curada a mano, no
exhaustiva, se puede ampliar en ese archivo).

En una **compra de cripto, el Monto ahora es opcional** (antes era obligatorio):
si no sabés/no te importa cuánto pagaste, cargás solo la cantidad y listo — esa
posición no calcula % de rendimiento (no hay costo contra qué compararla), en vez
de forzar a inventar un monto. Debajo de "Cantidad" se muestra el precio implícito
por unidad (Monto ÷ Cantidad) como chequeo rápido, para notar ANTES de guardar un
monto que no tiene nada que ver con la cantidad (ej. tipear el monto de otra
compra por error) — así se evita terminar con un % de rendimiento absurdo
(pasó una vez: 0.005 ETH cargado con un Monto de $200 ARS sin relación real con
esa cantidad dio +9495%, matemáticamente "correcto" para esos dos números pero sin
sentido real). **Si tenés cargada una posición así de una prueba anterior, hay
que editarla o borrarla a mano — esto no corrige datos ya guardados, solo evita
cargar uno nuevo así.**

**Tipos de activo Cedear y Bono**, además de Cripto/ETF/Moneda/Otro (sin
cotización automática, igual que ETF/Moneda/Otro). **Tipo de cambio del día**
autocompletado con el dólar blue de hoy (editable, para no tener que
tipearlo en cada carga) salvo al editar una carga vieja, que respeta el que
tenía. **Cargar una venta** ya no tipea el nombre del activo a mano: elige de
un picker con las posiciones que tenés (nombre, tipo y neto invertido), que
completa activo y tipo solo. **Historial** tiene búsqueda por nombre de
activo y filtros por período (3/12 meses/todo), tipo de operación
(compra/venta) y tipo de activo, combinables entre sí — mismo criterio que
los filtros de Gastos, sin afectar los totales/gráficos de arriba en la
pantalla, solo qué se ve en esa lista.

**Limitación aceptada, no resuelta**: `totalInvestedUsd`/Posiciones/la torta
nunca pueden dar un número negativo por activo (recortan a 0 si pasa) — pero si
editás o borrás una compra después de haber cargado una venta parcial de ese
activo, esa venta puede quedar "sin respaldo completo" (mostrando un costo
liberado mayor al que en verdad queda disponible) y no hay ningún aviso en
pantalla que lo señale. Fue una decisión consciente no agregar esa protección
(banner de alerta, o confirmar al editar/borrar una compra con ventas
dependientes) — necesita una secuencia bastante deliberada de acciones para
darse, y el total general ya queda protegido por el recorte a 0. Los gráficos
de evolución en el tiempo (rendimiento y valor de la cartera) tienen la misma
limitación de fondo por el mismo motivo estructural: no hay tracking por lote
(FIFO) de qué compra puntual cierra cada venta — corregirlo bien es un cambio
de modelo más grande, no algo para parchar sin arriesgar romper el historial
para el otro lado (fechas pasadas mostrando menos de lo que en verdad hubo).

### Presupuestos (`/presupuestos`, linkeado desde Mensual)
Tope de gastos del mes (total, no por categoría), mínimo a invertir por mes (en ARS
o USD — es el mismo dato que la meta de inversión), y tope opcional por categoría de
gasto.

### Categorías (`/categorias`, linkeado desde Mensual)
Crear, renombrar, **reordenar a mano** (flechas ↑/↓, por tipo gasto/ingreso — el
orden elegido acá es el que después se usa en los pickers de categoría y en el
listado de presupuestos por categoría) y **borrado suave**: al borrar, se pregunta
si los gastos/ingresos que ya la tenían la mantienen o quedan sin categoría — en
los dos casos, la categoría deja de poder elegirse para algo nuevo, pero nunca se
borra la fila (así lo ya cargado sigue resolviendo bien su nombre y color).

### Dashboard (`/`)
Tarjetas de balance del mes / total invertido / rendimiento, **insights automáticos**
(1-2 datos destacados del mes: presupuesto pasado o cerca del tope, mínimo de
inversión no cumplido, categoría que más subió vs. el mes pasado, balance vs. mes
pasado, o la categoría con más gasto — se prioriza lo más accionable),
**"Próximos vencimientos de tarjeta"** (este mes + los próximos 2, sumando lo
cargado en Crédito, cuotas futuras incluidas — solo si hay algo cargado ahí),
comparativa Ingresos vs. Gastos vs. Inversión con selector de período (3/6/12
meses o un **rango de fechas personalizado**, eligiendo mes "desde" y "hasta"),
tortas de gastos e ingresos del mes por categoría.

### Configuración (`/configuracion`)
Apariencia (claro/oscuro), **bloqueo de la app con PIN** (+ Face ID/Touch ID
opcional), **cambiar contraseña** estando ya logueado, **cerrar sesión** (solo este
dispositivo) y **cerrar sesión en todos los dispositivos** — solo ajustes generales
de la app; todo lo que es de un módulo específico (gastos fijos, presupuestos,
categorías) vive en su propia pantalla, no acá.

**Bug corregido**: elegir "claro" a mano en un sistema operativo que está en modo
oscuro dejaba los controles nativos (flechitas de `<input type="number">`, date
picker) en oscuro igual — faltaba fijar `color-scheme: light` para
`data-theme="light"` en `app/globals.css` (la de `data-theme="dark"` sí estaba).

### Bloqueo de la app (PIN / Face ID / Touch ID)
Pantalla de bloqueo (`components/applock/`) que tapa toda la app si hay un PIN de
4 dígitos configurado en este dispositivo — al abrir la app, y también si estuvo
5+ minutos en 2° plano (pantalla apagada o app minimizada). El PIN se hashea
(SHA-256, `lib/appLock/pinHash.ts`) y se guarda solo en este dispositivo
(localStorage, nunca viaja a Supabase — igual que las notificaciones push,
activarlo en el celular no lo activa en la compu). Face ID/Touch ID es un atajo
opcional encima del PIN (vía WebAuthn, `lib/appLock/webauthn.ts`) — necesita que el
dispositivo tenga lector biométrico; el PIN siempre queda como respaldo
("¿Olvidaste el PIN?" cierra la sesión de Supabase, no hay otra forma de
recuperarlo, es un bloqueo local).

**Importante, para que quede claro qué protege esto de verdad**: no es una segunda
autenticación verificada contra un servidor — no hay backend propio validando la
firma que devuelve el lector biométrico (eso haría falta para un login real). Es
un bloqueo LOCAL para que alguien con el teléfono desbloqueado no vea los datos de
un vistazo; el login de Supabase (server-side) sigue siendo lo que protege los
datos de verdad. Tampoco pude probar el flujo de Face ID/Touch ID de punta a
punta (hace falta un dispositivo real con lector biométrico) — el PIN solo sí está
probado completo.

### Exportar datos (en Configuración)
Cada botón individual baja un **CSV** de esa entidad sola (Gastos, Ingresos,
Inversiones, Gastos fijos, Ingresos fijos, Categorías, Presupuestos); **"Descargar
todo"** arma un único **.xlsx** con una pestaña por entidad (`lib/export/workbook.ts`,
librería `xlsx`/SheetJS) — para respaldo o análisis externo. Todo pasa en el
navegador (`lib/export/`), no hace falta backend. Los ids de categoría se resuelven
a nombre legible en vez de dejar el uuid crudo, y el CSV lleva BOM para que Excel en
Windows no rompa las tildes/ñ al abrirlo. No incluye el historial de valuaciones de
inversión ni la meta de inversión (son datos más internos/derivados, no algo
pensado para analizar afuera).

**Nota de seguridad, a propósito**: `xlsx` (SheetJS) tiene 2 CVE altas sin parche
en npm (prototype pollution + ReDoS) — pero son del lado de LEER un archivo ajeno;
acá solo se GENERA un .xlsx desde datos propios, ese vector no aplica. Se evaluó
`exceljs` como alternativa (más pesada, con sus propias vulnerabilidades moderadas
vía una dependencia de `uuid` vieja) y se descartó. Decisión consciente, no un
descuido — si en algún momento molesta en un audit de CI, revisar si SheetJS ya
tiene una versión parcheada en su CDN propio (`cdn.sheetjs.com`, fuera de npm).

### Indicador de sincronización
Chip chico (arriba a la derecha, en todas las pantallas) que aparece solo cuando
hace falta: "Sin conexión" o "Sincronizando…". No se ve nada cuando todo está al día.

### Notificaciones push (activar/desactivar en Configuración)
Avisa aunque la app esté cerrada: gastos por vencer (2 días antes) o vencidos (una
sola vez), presupuestos pasados o al 85%+ (total o por categoría) — mismo criterio
que ya usan los badges de vencimiento y el insight de presupuesto del dashboard — y
un aviso positivo cuando se cumple el mínimo mensual de inversión (a diferencia del
insight del dashboard, que avisa mientras todavía falta, este solo avisa una vez que
ya se llegó). Es por-dispositivo (activarlo en el celular no lo activa en la compu).
En iPhone solo funciona con la PWA instalada (Agregar a inicio) e iOS 16.4+.

Si nadie tiene un dispositivo suscripto todavía, un aviso NO se marca como "ya
enviado" — se reintenta al día siguiente hasta que haya alguien escuchando (si no,
quien activa notificaciones tarde se perdería para siempre avisos que ya habían
"pasado" sin destinatario).

Corre un chequeo diario (`app/api/notifications/check`, disparado por `vercel.json`
→ Vercel Cron, ver `SUPABASE_SERVICE_ROLE_KEY`/`VAPID_*`/`CRON_SECRET` en
`.env.local.example`) que también genera los gastos fijos del mes de las cuentas
que no abrieron la app — si no, nunca verían el recordatorio. Lleva un registro
(`notification_log`, solo accesible con la service-role key) para no avisar dos
veces lo mismo. **El cron recién funciona una vez deployada la app** — hasta
entonces se puede probar a mano pegándole al endpoint en `localhost`.

## Calidad / CI

Tests con Vitest sobre las funciones puras de `lib/aggregations/` (resumen mensual,
progreso de presupuesto, insights del dashboard, resumen de inversiones) y
`lib/dueStatus.ts` — correr con `npm run test`. GitHub Actions (`.github/workflows/ci.yml`)
corre `lint` + `test` + `build` en cada push a `master` y en cada PR.

## Base de datos

10 tablas en Supabase (`supabase/schema.sql`), todas con Row Level Security salvo
`notification_log` (a propósito sin políticas — ver esa tabla en el schema):
`categories`, `fixed_expenses`, `expenses`, `incomes`, `investments`,
`investment_valuations`, `category_budgets`, `investment_goals`,
`push_subscriptions`, `notification_log`. El script está pensado para poder
re-pegarse y re-correrse sin romper nada si se agregan columnas/tablas nuevas más
adelante — **ya corrido en la base real** (2026-08-24).

## Qué falta para tenerla "en producción" de verdad

**Actualización 2026-09-01 — se probó de punta a punta en un navegador real, no
solo con tests unitarios.** Se levantó `npm run dev`, se instaló Playwright
temporalmente (`npm install --no-save`, desinstalado al terminar — no quedó en
`package.json`), se creó un usuario de prueba real (confirmado a mano con la
service-role key, porque el proyecto de Supabase exige confirmar el mail) y se
recorrió: login, Gastos con una compra en 3 cuotas (badges "CUOTA 1/3, 2/3, 3/3"
en sept/oct/nov, confirmado), Mensual + Ingresos fijos (plantilla creada y
generándose), Inversiones (compra de ETH con cantidad + símbolo, cotización
automática, y el **% del total en Posiciones que se pidió hoy** — se ve
"ETH · US$ 50 · 100%"), y Configuración (bloqueo PIN, exportar datos, ya en el
orden pedido). El usuario de prueba y todos sus datos se borraron al terminar
(`supabase.auth.admin.deleteUser`, cascade).

**Se encontró y corrigió un bug real** (no relacionado a lo pedido hoy, lo
encontró la prueba): al loguearse en un dispositivo nuevo (storage local
vacío) con una cuenta que YA tenía categorías en otro dispositivo, la app
duplicaba las 12 categorías default — `EnsureDefaultCategories` decidía si
sembrar mirando el storage local ANTES de que terminara de bajar lo que ya
existía en Supabase. Esto iba a pasar seguro mañana al loguearse por primera
vez en el iPhone. Se arregló en dos pasos (`app/providers/EnsureDefaultCategories.tsx`,
`lib/repository/seedDefaults.ts`) — probado con dos "dispositivos" (contextos
de navegador separados) logueados con la misma cuenta, confirmado contra la
base real: 12 categorías, no 24. De paso se corrigió un problema relacionado:
tres lugares usaban el NOMBRE de la categoría como key de React
(`app/(protected)/mensual/page.tsx`, `DonutChart.tsx`, `DonutLegend.tsx`) —
inseguro porque dos categorías distintas pueden compartir nombre (ej. una
borrada y otra creada de nuevo igual), ahora usan el id.

Todo esto (más lo de cripto/cuotas/etiquetas/ingresos fijos/PIN/export de las
sesiones anteriores) está implementado, **verificado en el navegador real
contra Supabase**, y pasa `lint` (130 tests) y `build`. Nada se subió a GitHub
todavía.

**Ojo con `npm ci` en Windows**: en esta sesión, correrlo con el servidor de `npm
run dev` abierto rompió `node_modules` a la mitad (falló por un archivo `.node`
bloqueado por el proceso corriendo, tipo `lightningcss`/`next-swc`, mitad del
`rm -rf` ya se había hecho). Se arregló con `npm install` normal (no borra todo de
entrada). Si vuelve a pasar: cerrar el servidor de dev primero, o usar `npm
install` en vez de `npm ci` para chequear el lockfile.

Mañana, en orden:
1. Re-correr `supabase/schema.sql` (punto 1 de abajo) — sin esto varias cosas de
   hoy no van a sincronizar.
2. Probar en `localhost` cada feature de hoy. Para **Face ID/Touch ID en el iPhone
   real** hace falta HTTPS (no alcanza con la IP local por `http://` que veníamos
   usando) — o `npm run dev -- --experimental-https` + `https://<IP-local>:3000`
   desde el iPhone (misma WiFi, certificado autofirmado, Safari va a avisar y hay
   que aceptar "Continuar"), o directo probarlo ya en Vercel una vez deployado (la
   credencial de Face ID queda atada al origen/dominio donde se registra, así que
   si se prueba primero en local hay que volver a activarla en producción).
3. Recién ahí, commit + push (punto 3 de abajo).

**Pendiente de decidir, no resuelto todavía:** si el ícono de Configuración (⚙,
hoy solo en el header de Inicio) debería aparecer también en Gastos/Mensual/
Inversiones, o quedarse solo en Inicio como está. Quedó la pregunta en el aire,
sin definir — retomarla si hace falta.

Pendiente, en orden:

1. **Volver a correr `supabase/schema.sql` en Supabase** — se agregaron `kind` y
   `cost_basis_usd` a `investments` (compra/venta) después de la última corrida
   confirmada, y ahora también `quantity`/`market_symbol` (cotización automática
   de cripto) ahí, más `installment_number`/`installment_count`/
   `installment_group_id`/`tag` en `expenses` (cuotas de tarjeta + etiquetas), y la
   tabla nueva `fixed_incomes` + `is_fixed`/`fixed_income_id` en `incomes`
   (ingresos fijos); hoy nada de esto existe en la base real (confirmado con la
   service-role key), así que ni las inversiones, ni estos gastos, ni los ingresos
   fijos van a sincronizar. El bloqueo con PIN/Face ID **no** necesita esto — es
   puramente local (localStorage), no toca Supabase.
2. **Borrar la fila de prueba "BNB venta"** en Inversiones → Historial (quedó de
   probar la función de venta).
3. **Commit + push** de todo lo acumulado sin subir (vencimientos/pagado, gastos
   fijos sin categoría, tests + CI, notificaciones push, compra/venta en
   inversiones, toda la vuelta de estética/colores, MÁS lo de la sesión de hoy:
   cotización cripto automática, Cedear/Bono, tipo de cambio automático, venta
   como picker, filtros del Historial de Inversiones, cuotas de tarjeta +
   etiquetas en Gastos, ingresos fijos, el bloqueo con PIN/Face ID, y exportar
   datos a CSV) — nada de esto llegó a GitHub todavía, y Vercel deploya desde
   ahí. Conviene armar el mensaje de commit recién cuando se dé el OK para
   subir, el diff es grande y sigue creciendo sesión a sesión.
4. **Deploy a Vercel** — hoy solo corre en `localhost`. Crear el proyecto,
   conectarlo al repo (`FedeGonzalo16/ProyectoGastos`) y cargar ahí las env vars de
   `.env.local` (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `CRON_SECRET`, más las dos de siempre) — Vercel no las lee
   del archivo local.
5. Una vez deployado: agregar la URL de producción a Supabase → Authentication →
   Redirect URLs (para que "olvidé mi contraseña" funcione fuera de localhost), y
   confirmar que el cron aparece en Vercel → el proyecto → Cron Jobs.

✅ **Ícono de PWA**: ya generado (`public/apple-touch-icon.png` a sangre para que iOS
recorte las esquinas él mismo, `icon-192.png`/`icon-512.png` para el manifest, y
`icon-512-maskable.png` con más margen para el recorte circular de Android) a partir
del diseño de `icon.svg` (que ya era propio, no el genérico de Next.js).

✅ **Cotización USD/ARS automática**: ya no se edita a mano — `lib/exchangeRateApi.ts`
la trae de DolarAPI (dólar blue, compra y venta) al entrar a Inversiones, con un
botón para refrescarla a pedido. Se usa "venta" para los cálculos.

(Para ideas que no bloquean nada de esto, ver "Ideas para seguir mejorando la app" más abajo.)

---

## Ideas para seguir mejorando la app

### Con impacto directo en el uso diario

- Notificación de la **meta de inversión mensual** no cumplida (hoy solo se ve como
  insight en el dashboard) — mismo patrón que las notificaciones de vencimiento y
  presupuesto, fácil de sumar como un tercer `collect*` en `lib/notifications/`.

### Inversiones

- **Cotizaciones automáticas de acciones/ETF** (vía API) — la de cripto ya está
  (ver arriba, CoinGecko); esta necesita otra fuente con cuenta/clave y pasar
  por un endpoint propio, no se puede llamar directo desde el navegador.

### Analítica / vista de conjunto

- Comparar un mes contra el mismo mes del año anterior.
- Resumen/reporte anual (no solo mensual).

### Datos y respaldo

- Importar historial viejo del Excel (se descartó al arrancar el proyecto, se podría
  reconsiderar si hace falta cargar datos históricos).

### Si algún día se vuelve multi-usuario

- Hoy la arquitectura (RLS por `user_id`) es deliberadamente de un solo usuario por
  cuenta. Si en algún momento se quisiera compartir con otra persona (ej. pareja,
  familia), sería un cambio de arquitectura más grande (compartir filas entre
  usuarios, permisos, etc.) — no es algo menor, pero queda anotado como posibilidad.
