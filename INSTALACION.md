# Cómo instalar GastosApp en un dispositivo nuevo

URL de producción: **https://proyecto-gastos-ten.vercel.app**

La app es una PWA (Progressive Web App) — no está en la App Store ni en Google
Play, se "instala" desde el navegador y queda como un ícono más en el
dispositivo, igual que cualquier otra app.

## iPhone (Safari)

Tiene que ser **Safari** — Chrome en iPhone no puede instalar la app en la
pantalla de inicio (es una limitación de iOS, no de la app).

1. Abrí Safari y entrá a la URL de arriba.
2. Iniciá sesión con tu cuenta.
3. Tocá el ícono de **Compartir** (el cuadrado con la flecha hacia arriba,
   abajo en el medio de la barra de Safari).
4. Deslizá hacia abajo en el menú que se abre y tocá **"Agregar a inicio"**.
5. Confirmá el nombre y tocá **"Agregar"** (arriba a la derecha).

Va a aparecer un ícono en la pantalla de inicio. Abriéndolo desde ahí (no
desde una pestaña de Safari) entra a pantalla completa, sin la barra del
navegador.

## Android (Chrome)

1. Abrí Chrome y entrá a la URL de arriba.
2. Iniciá sesión con tu cuenta.
3. Tocá el menú de **⋮** (arriba a la derecha).
4. Tocá **"Instalar app"** (o "Agregar a pantalla de inicio", según la
   versión de Chrome).
5. Confirmá.

## Computadora (Chrome / Edge)

1. Entrá a la URL de arriba desde el navegador.
2. Iniciá sesión con tu cuenta.
3. En la barra de direcciones va a aparecer un ícono de instalar (un
   monitor con una flecha, o "+") — hacé click ahí.
   - Si no lo ves: menú del navegador (⋮) → **"Instalar GastosApp..."** (o
     "Crear acceso directo a la app").
4. Confirmá.

Queda como una ventana propia, separada de las pestañas normales del
navegador (y un ícono para abrirla directo, sin pasar por el navegador).

## Después de instalarla (en cualquier dispositivo)

Estos tres pasos son **por dispositivo** — activarlos en uno no los activa
en los demás.

### 1. Notificaciones

Adentro de la app ya instalada (no en una pestaña suelta del navegador) →
**Configuración** → sección "Notificaciones" → **"Activar notificaciones"**.
El navegador va a pedir el permiso nativo — aceptalo.

En iPhone, esto **solo funciona con la app instalada así** (no desde Safari
suelto) y necesita **iOS 16.4 o más nuevo** (Ajustes → General → Información
→ Versión de software, para confirmar la tuya).

### 2. Bloqueo con PIN / Face ID / Touch ID

**Configuración** → sección "Bloqueo de la app" → **"Activar PIN"** (elegís
un PIN de 4 dígitos, lo repetís para confirmar). Si el dispositivo tiene
lector biométrico (Face ID, Touch ID, Windows Hello), va a aparecer un botón
extra **"Activar Face ID / Touch ID"** debajo — dispara el pedido nativo del
sistema operativo para registrarlo como atajo.

Este PIN es un bloqueo local (evita que alguien con el dispositivo
desbloqueado vea los datos de un vistazo) — no reemplaza el login de la
cuenta, y hay que activarlo de nuevo en cada dispositivo nuevo.

### 3. Confirmar que las categorías bajaron bien

Al loguearte por primera vez en un dispositivo nuevo, la app baja todo lo
que ya tenías cargado en otro lado (gastos, categorías, inversiones, etc.).
Anda a **Categorías** (o mirá los chips al cargar un gasto) y confirmá que
ves las mismas de siempre, sin ninguna repetida — no debería pasar, pero es
la única verificación manual que vale la pena hacer la primera vez en un
dispositivo nuevo.
