<div align="center">

# nexus-tours

**Tours guiados que no se rompen con modales.**
Sin dependencias · <!--tam:nexus-tours-->~12.6 KB<!--/tam--> gzip · TypeScript · accesible · wrappers para Vue y React

Hecho por [**DevMedina**](https://devmedina.is-a.dev/) (Angel Uriel Domínguez Medina) · rama de librerías de **Nexus** · Licencia MIT

</div>

---

La mayoría de las librerías de tours fallan cuando el elemento a explicar vive dentro de un modal: todavía no existe (animación, contenido asíncrono), el resaltado queda *debajo* del `<dialog>`, los botones del tour quedan `inert` o `Esc` cierra lo que no debe. **nexus-tours** está construida alrededor de esos casos, y además trae lo necesario para enseñar un producto de verdad: pasos que avanzan cuando el usuario hace la acción, **modo práctica** con datos de ejemplo, progreso guardado, checklist de primeros pasos y un **constructor visual** sin código.

## Índice

1. [Instalación](#1-instalación)
2. [Inicio rápido](#2-inicio-rápido)
3. [Conceptos básicos](#3-conceptos-básicos)
4. [Guías por tema](#4-guías-por-tema)
   - [Modales y contenido animado](#41-modales-y-contenido-animado)
   - [Apariencia: tu fuente, tu CSS, temas](#42-apariencia-tu-fuente-tu-css-temas)
   - [Diseño y detalles visuales](#43-diseño-y-detalles-visuales)
   - [Celulares](#44-celulares)
   - [Pasos que avanzan solos](#45-pasos-que-avanzan-solos-advanceon)
   - [Recordar el progreso](#46-recordar-el-progreso)
   - [Cambiar de página](#47-cambiar-de-página)
   - [Modo práctica](#48-modo-práctica)
   - [Datos de ejemplo (fixtures)](#49-datos-de-ejemplo-fixtures)
   - [Checklist de primeros pasos](#410-checklist-de-primeros-pasos)
   - [Constructor visual (sin código)](#411-constructor-visual-sin-código)
   - [Vue y React](#412-vue-y-react)
   - [Resaltar un elemento suelto y alinear el popover](#412b-resaltar-un-elemento-suelto-y-alinear-el-popover)
   - [Analítica y eventos](#413-analítica-y-eventos)
   - [Contenido enriquecido](#414-contenido-enriquecido)
   - [Renderizado en servidor (Nuxt, Next)](#415-renderizado-en-servidor-nuxt-next)
   - [Bootstrap, Tailwind y otros frameworks](#416-bootstrap-tailwind-y-otros-frameworks)
   - [SweetAlert2](#417-sweetalert2)
5. [Referencia de la API](#5-referencia-de-la-api)
6. [Accesibilidad](#6-accesibilidad)
7. [Tamaños y compatibilidad](#7-tamaños-y-compatibilidad)
8. [Demos](#8-demos)
9. [Desarrollo y pruebas](#9-desarrollo-y-pruebas)
10. [Hoja de ruta](#10-hoja-de-ruta)
11. [Autoría, licencia y derechos de autor](#11-autoría-licencia-y-derechos-de-autor)

---

## 1. Instalación

### Con npm (apps con bundler: Vite, Webpack, Next…)

```bash
npm i nexus-tours
```

### Con un `<script>` (WordPress, HTML estático, PHP…)

Un solo archivo trae **todo** (tours, checklist, temas, datos de ejemplo, modo práctica) en <!--tam:nexus-tours.all-->~21.2 KB<!--/tam--> gzip y expone un único global: `NexusTours`.

```html
<script src="https://cdn.jsdelivr.net/npm/nexus-tours@0.2/dist/nexus-tours.all.iife.js"></script>
<script>
  new NexusTours.Tour({
    theme: NexusTours.themes.mint,
    steps: [
      { element: '#nuevo', title: 'Crea un cliente', description: 'Empieza aquí.' },
      { element: '#tabla', title: 'Tu lista', description: 'Aquí aparecen.' },
    ],
  }).start()
</script>
```

También como módulo ES:

```html
<script type="module">
  import { Tour, Checklist, themes, createFixtures, fake } from 'https://cdn.jsdelivr.net/npm/nexus-tours@0.2/dist/nexus-tours.all.js'
</script>
```

- En producción fija la versión exacta (`@0.2.0`) y, si quieres que el navegador verifique el archivo, agrega [`integrity` (SRI)](https://www.srihash.org/).
- `unpkg.com/nexus-tours@0.2` también funciona.
- Los archivos por función siguen disponibles si solo quieres una parte: `nexus-tours.js` (<!--tam:nexus-tours-->~12.6 KB<!--/tam-->), `builder.js` (<!--tam:builder-->~7.3 KB<!--/tam-->), `checklist.js`, `themes.js`, `fixtures.js`, `supabase.js`.
- **Importante:** las CDN sirven lo que está en npm (o en un repositorio público de GitHub). Mientras el paquete no se publique en npm no existen esas URLs; `npm publish` es lo que las activa.

---

## 2. Inicio rápido

```ts
import { Tour } from 'nexus-tours'

const tour = new Tour({
  steps: [
    { element: '#nuevo-cliente', title: 'Crea un cliente', description: 'Todo empieza aquí.' },
    {
      before: () => abrirModal(),   // abre el modal; el tour espera a que aparezca el elemento
      element: '#nombre',
      title: 'Ponle nombre',
    },
    { element: '#guardar', title: 'Guarda', after: () => cerrarModal() },
    { element: '#tabla', title: 'Tu lista' },
  ],
})

tour.start()
```

Eso es todo: el tour espera a que `#nombre` exista y sea visible, se monta dentro del modal para seguir siendo clicable, resalta el elemento y se limpia solo al terminar.

---

## 3. Conceptos básicos

- **Tour**: una lista de **pasos** (`steps`) que se recorren con *Siguiente / Atrás*, el teclado (←/→/Enter) o deslizando en el celular.
- **Paso** (`Step`): normalmente apunta a un `element` (selector, nodo o función) y muestra un título y una descripción. Un paso **sin** `element` es una **tarjeta centrada** (ideal para bienvenida y cierre).
- **Ganchos**: `before` corre antes de buscar el elemento (abre el modal), `after` al salir del paso (ciérralo). Existen equivalentes serializables: `beforeClick` / `afterClick` (selectores a los que se hace clic).
- **Eventos**: `tour.on('start' | 'step' | 'missing' | 'end' | 'stop', fn)`; devuelve una función para cancelar la suscripción.
- **Aislamiento**: el tour vive en un *shadow root*; tu CSS no lo rompe y el suyo no se filtra a tu página.

---

## 4. Guías por tema

### 4.1 Modales y contenido animado

| Problema | Qué hace nexus-tours |
|---|---|
| El elemento aún no existe (modal animado o asíncrono) | Espera a que exista **y sea visible** (MutationObserver + revisión por frame), con tiempo límite |
| `<dialog>.showModal()` deja el resto de la página `inert` | Se monta dentro del modal abierto para seguir clicable; usa la Popover API para quedar encima |
| Modales `aria-modal` / `role="dialog"` con trampa de foco | Se monta dentro del modal para que la trampa de foco no pelee con el tour |
| Ancestros con `transform` (modales animados) | Corrige las coordenadas respecto al bloque contenedor |
| El elemento desaparece y vuelve (modal cerrado y reabierto) | Lo detecta, espera de nuevo y se vuelve a enganchar |
| El elemento nunca aparece | Salta el paso (o se detiene con `onMissing: 'stop'`) y emite `missing` |
| `Esc` | Cierra el tour, **no** el modal de abajo |
| Contenedores con scroll anidados, redimensionar | Hace scroll solo si hace falta; el resaltado sigue al elemento |

### 4.2 Apariencia: tu fuente, tu CSS, temas

```ts
new Tour({
  steps,
  font: 'inherit',                       // usa la fuente del body (o cualquier font-family)
  fonts: [{ family: 'Inter', src: '/fonts/inter.woff2', weight: 600 }],   // carga @font-face una vez
  theme: { accent: '#10b981', accentContrast: '#000', background: '#111', text: '#eee', radius: '4px' },
  css: '.gm-title { text-transform: uppercase }',   // CSS extra aplicado dentro del tour
  className: 'mi-tour',
})
```

Desde tu hoja de estilos:

```css
:root { --gm-accent: #e11d48; --gm-radius: 6px; --gm-font: "Inter", sans-serif; }  /* las variables cruzan el shadow root */
.mi-tour::part(title) { letter-spacing: .02em; }
.mi-tour::part(button-primary) { border-radius: 999px; }
```

- **Variables:** `--gm-accent --gm-accent-fg --gm-bg --gm-fg --gm-muted --gm-border --gm-dim --gm-radius --gm-font --gm-z`.
- **Partes (`::part()`):** `backdrop ring popover title description footer progress button button-primary button-secondary close dots icon image skip hint never banner`.

**Temas listos** (`nexus-tours/themes`, <!--tam:themes-->~1.4 KB<!--/tam-->): `light`, `dark`, `ocean`, `sunset`, `mint`, `rose`, `mono`, y los que toman los colores de tu framework: `bootstrap`, `tailwind`, `shadcn`, `daisyui`, `vuetify`, `mui` (ver [4.16](#416-bootstrap-tailwind-y-otros-frameworks)).

```ts
import { themes, autoTheme } from 'nexus-tours/themes'

new Tour({ steps, theme: themes.dark })
new Tour({ steps, theme: autoTheme() })                                   // sigue prefers-color-scheme
new Tour({ steps, theme: { ...themes.ocean, accent: '#f43f5e', radius: '20px' } })   // extiende cualquiera
```

Más opciones visuales: `arrow` (flechita hacia el elemento, activa por defecto), `dir: 'rtl' | 'ltr' | 'auto'`, `theme.fontSize`, `theme.width`. Las animaciones se desactivan con `prefers-reduced-motion`.

### 4.3 Diseño y detalles visuales

De fábrica: **puntos de progreso** (barra fina a partir de 10 pasos), un **Omitir** discreto en lugar de la ×, y una **tarjeta de bienvenida** para pasos sin elemento (centrada, más ancha, título grande). Los pasos interactivos hacen **pulsar** el resaltado.

```ts
new Tour({
  steps: [
    { title: 'Bienvenido a Acme', description: 'Un recorrido de un minuto.', icon: '👋' },       // sin element → bienvenida
    { element: '#nuevo', title: 'Crea un cliente', advanceOn: 'click', hint: 'Haz clic en el botón' },
    { title: 'Listo', icon: '🎉', image: '/img/listo.png' },                                       // image: https://, /ruta o data:image/
  ],
  celebrate: true,            // confeti ligero al final (se omite con prefers-reduced-motion)
  progress: 'dots',           // 'dots' | 'text' ("2 / 5") | 'both'
  skip: true,                 // botón "Omitir" (labels.skip)
  closeButton: undefined,     // la × solo aparece si no hay Omitir; true / false para forzarla
})
```

`icon` es texto (un emoji o palabra corta). Para íconos de librería, usa `image` o personaliza con `css`.

### 4.4 Celulares

En pantallas angostas (≤ 600 px, cámbialo con `mobileBreakpoint`) el globo se vuelve una **hoja inferior**: ancho completo, botones táctiles de 44 px, sin flecha, respeta el notch y la barra de inicio (`env(safe-area-inset-*)`) y se coloca sobre el teclado en pantalla. **Desliza hacia los lados** para avanzar o retroceder (invertido en RTL). El elemento resaltado se desplaza para quedar sobre la hoja; si está al final de la página, se agrega espacio temporal debajo y se retira después.

```ts
new Tour({ steps })                        // 'auto': hoja en celular, globo flotante en el resto
new Tour({ steps, mobile: 'never' })       // siempre flotante  ·  'always' → siempre hoja
```

Para darle estilo: `::part(popover)`; en este diseño el globo tiene `data-mode="sheet"`.

### 4.5 Pasos que avanzan solos (`advanceOn`)

Se aprende haciendo. `advanceOn` completa el paso cuando el usuario realiza la acción (el elemento resaltado se vuelve clicable y el clic sigue llegando a tu página):

```ts
const steps = [
  { element: '#nuevo', title: 'Crea un cliente', hint: 'Haz clic para continuar',
    advanceOn: 'click', hideNext: true },                       // sin "Siguiente": el clic es el camino
  { element: '#nombre', title: 'Escribe un nombre',
    advanceOn: { event: 'input', when: (e) => e.target.value.length >= 3, delay: 400 } },
  { element: '#guardar', title: 'Guárdalo', advanceOn: 'click' },   // "Siguiente" sigue funcionando como atajo
  { title: 'Esperando…', advanceOn: { until: () => document.querySelector('.toast-exito') } },  // se evalúa en cada frame
]
```

- `advanceOn: 'click' | 'input' | 'change' | 'submit' | 'focus' | …` (cualquier evento del DOM) escucha en el elemento del paso; `target` escucha en otro lugar; `when(e)` agrega una condición; `until()` avanza cuando devuelve `true`; `delay` deja que el usuario vea el resultado antes de continuar.
- La acción del usuario cuenta aunque cierre el modal que contenía el elemento (el avance pendiente no se pierde). Pulsar *Siguiente/Atrás* o detener el tour durante el `delay` tiene prioridad.
- Funciona de maravilla con el **modo práctica**: el usuario realmente crea el cliente, pero sin riesgo.
- `hideNext` quita *Siguiente* (y el atajo de teclado / deslizar) en ese paso. `Esc` y × siempre cierran el tour.

### 4.6 Recordar el progreso

```ts
const tour = new Tour({
  steps,
  persist: { id: 'bienvenida', dontShowAgain: true, version: 1 },   // storage: localStorage por defecto
})

await tour.startIfNeeded()   // primera visita: empieza · cerrado a medias: retoma · terminado o descartado: no hace nada
await tour.status()          // 'new' | 'in-progress' | 'completed' | 'dismissed'
await tour.reset()           // olvidar
tour.start()                 // siempre empieza: úsalo en un botón "Repetir recorrido" (no des-completa el estado guardado)
```

- `dontShowAgain` agrega un enlace "No volver a mostrar". Cambia `version` cuando reescribas el tour para que todos lo vean otra vez.
- Para guardarlo **por cuenta** (no por navegador), pasa tu propio `storage: { get, set, remove? }` asíncrono: tu API, Supabase, lo que uses.

### 4.7 Cambiar de página

Dale `route` a los pasos y un `router` al tour: navega, espera la página y busca el elemento.

```ts
new Tour({
  router: 'history',          // apps de una sola página: pushState + popstate
  steps: [
    { element: '#menu-clientes', title: 'Clientes', route: '/' },
    { element: '#nuevo-cliente', title: 'Agrega uno', route: '/clientes' },   // navega a /clientes primero
  ],
})
```

```ts
// Vue Router
router: { current: () => router.currentRoute.value.fullPath, go: (p) => router.push(p) }
// React Router (const navigate = useNavigate(); const location = useLocation())
router: { current: () => location.pathname + location.search, go: (p) => navigate(p) }
```

**Sitios de varias páginas** (WordPress, PHP, estáticos): usa `router: 'location'` junto con `persist`. Antes de salir de la página el tour guarda el paso; llama `tour.startIfNeeded()` en cada carga y continúa donde iba.

### 4.8 Modo práctica

Deja que los usuarios nuevos hagan clic sobre datos de ejemplo. Mientras corre el tour, las peticiones se responden desde memoria y las escrituras reales **nunca salen del navegador**.

```ts
import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'

new Tour({
  steps,
  practice: {
    data: createFixtures({ clientes: { count: 6, fields: { id: fake.id(), nombre: fake.name(), estado: fake.pick(['Activo', 'Pendiente']) } } }, { seed: 1 }),
    rest: { clientes: '/api/clientes' },   // GET/POST lista, GET/PATCH/PUT/DELETE /api/clientes/:id, filtros ?campo=valor
    routes: [{ method: 'GET', url: '/api/clientes/:id/resumen', respond: ({ params, db }) => ({ id: params.id, total: db.clientes.length }) }],
    onStart: () => recargarClientes(),     // refresca tu UI para que pida los datos de ejemplo
    onEnd: () => recargarClientes(),       // …y los reales cuando termina el tour
    onBlocked: ({ method, url }) => console.warn('bloqueado', method, url),
  },
}).start()
```

- **Seguro por defecto:** los POST/PUT/PATCH/DELETE que ninguna ruta atiende reciben `403 { error: "practice-mode" }` y no tocan la red (`blockWrites: false` para desactivarlo). Los GET sin ruta pasan al servidor real. Con `allow(req)` dejas pasar peticiones concretas (login, refresco de token).
- **Aislamiento estricto (`strict: true`):** además de las escrituras, bloquea **cualquier** `fetch`/XHR que ninguna ruta atienda, lecturas incluidas (`403`, cabecera `x-practice-mode: 1`, y avisa con `onBlocked`). Solo llega al servidor lo que `allow` autorice. Úsalo cuando el tour no deba leer datos reales de nadie.
- **Tus datos no se mutan:** el tour trabaja con una copia y la descarta al terminar; `fetch` y `XMLHttpRequest` se restauran.
- **Visible:** una píldora "Modo práctica" (`::part(banner)`, texto en `labels.practice`, se oculta con `banner: false`). Mientras dura, `<html>` lleva el atributo `data-nexus-practice` (`="strict"` en modo estricto) para que lo estiles: por ejemplo, un borde o una franja de «entorno de demostración» en tu propia app.
- **Una sola sesión a la vez:** si otro tour ya tiene el modo práctica activo, `start()` rechaza con un error claro en lugar de apilar dos interceptores que se contestarían entre sí.
- **Siempre se restaura:** si `onStart` lanza una excepción, o si otra librería envolvió `fetch` encima del nuestro, `fetch` y `XMLHttpRequest` vuelven a su estado original (el interceptor que quede apilado se vuelve transparente). Las peticiones lanzadas antes de empezar siguen su camino real; las posteriores a `stop()` también.
- `latency` simula retraso de red (por defecto 120 ms). `tour.practiceData` expone las tablas vivas en memoria.
- `routes` se evalúan antes que `rest`; una ruta puede devolver `PASS` (`import { PASS } from 'nexus-tours'`; en CDN, `NexusTours.PASS`) para decir "no es mía" y que la petición siga a la siguiente ruta o al servidor real.

#### `fetch`, axios y XMLHttpRequest

El modo práctica intercepta `fetch` **y** `XMLHttpRequest`, así que axios, jQuery y similares ven los datos de ejemplo y tienen las escrituras bloqueadas igual que `fetch`. No hay nada que configurar; desactívalo con `practice: { xhr: false }`. El XHR síncrono nunca se intercepta. Se respetan `abort()`, `responseType` (`json`, `blob`, `arraybuffer`), las cabeceras de respuesta y los eventos `readystatechange` / `load` / `loadend`. No cubre WebSocket.

#### Con Supabase

Si tu app usa Supabase (`supabase-js` o cualquier cliente PostgREST), `supabasePractice()` responde `from()`, `rpc()` y `functions.invoke()` con datos de ejemplo mientras corre el tour (<!--tam:supabase-->~3.4 KB<!--/tam-->, entrada aparte). Tu base real no se toca.

```ts
import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { supabasePractice } from 'nexus-tours/supabase'

new Tour({
  steps,
  practice: supabasePractice({
    url: 'https://xxxx.supabase.co',                          // opcional: solo se intercepta este proyecto
    data: createFixtures({
      clientes: { count: 8, fields: { id: fake.id(), nombre: fake.name(), correo: fake.email(), estado: fake.pick(['activo', 'nuevo']) } },
      pedidos:  { count: 20, fields: { id: fake.id(), cliente_id: fake.int(1, 8), total: fake.int(20, 500) } },
    }, { seed: 7 }),
    relations: {                                              // solo si usas joins
      pedidos:  { clientes: { table: 'clientes', from: 'cliente_id' } },
      clientes: { pedidos: { table: 'pedidos', from: 'id', to: 'cliente_id', many: true } },
    },
    rpc: { total_pedidos: ({ db }) => db.pedidos.reduce((s, o) => s + o.total, 0) },
    functions: { 'enviar-factura': () => ({ ok: true }) },    // edge function simulada
    defaults: {                                               // valores por defecto de columnas al insertar
      pedidos: { estado: 'pendiente', creado_en: 'now()', folio: ({ db }) => 'P-' + (db.pedidos.length + 1) },
    },
    onStart: () => app.recargar(), onEnd: () => app.recargar(),
  }),
})
```

**Qué entiende** (probado contra el `supabase-js` real): `eq neq gt gte lt lte like ilike is in not or and`, `order` (los nulos como Postgres), `limit` / `range`, `select('a, b')` y alias, `single()` / `maybeSingle()`, `count` y `head`, `insert` (uno o varios, id automático), `update`, `delete`, `upsert` (`onConflict`), errores de clave única (`23505`), `.select()` tras escribir, joins declarados en `relations` (también `!inner`), `rpc()` y edge functions.

**Valores por defecto (`defaults`)**: igual que en Postgres, se aplican solo cuando la columna se **omite** al insertar (un `null` explícito se respeta) y no pisan una fila existente en un `upsert`. Cada valor puede ser una constante, una función `({ row, db, table }) => valor` o los textos `'now()'`, `'gen_random_uuid()'` y `'uuid()'`. El id sigue siendo automático.

**Reglas de seguridad**
- Las escrituras solo cambian la copia en memoria; **un tour nuevo parte otra vez de los datos originales**.
- Una tabla que no sembraste **no** se responde: las lecturas llegan a tu backend real y las escrituras reciben `403`.
- Un `rpc()` sin manejador se bloquea (podría escribir). Si es de solo lectura y seguro, agrégalo a `allowRpc: ['nombre']`.
- `/auth/v1/*` pasa para que la sesión del usuario siga funcionando. Las subidas a Storage se bloquean.
- No soportado (responde `400` en vez de adivinar): búsqueda de texto completo, operadores de arreglo/JSON, agregados, filtros anidados dentro de joins, realtime.
- Si pasas un `fetch` propio a `createClient`, usa `global: { fetch: liveFetch }` (se exporta del mismo módulo) para que siga el parche.

### 4.9 Datos de ejemplo (fixtures)

`nexus-tours/fixtures` (<!--tam:fixtures-->~1.5 KB<!--/tam-->, entrada aparte, sin dependencias): datos falsos reproducibles, en español o inglés.

```ts
import { createFixtures, fake } from 'nexus-tours/fixtures'

const data = createFixtures(
  {
    clientes: {
      count: 8,
      fields: {
        id: fake.id(),
        nombre: fake.name(),
        correo: fake.email({ from: 'nombre', domain: 'demo.mx' }),   // derivado de la misma fila
        empresa: fake.company(),
        estado: fake.pick(['Activo', 'Pendiente']),
        monto: fake.int(100, 9000),
        desde: fake.date({ past: 90 }),
        origen: 'practica',                                         // las constantes se copian tal cual
      },
    },
  },
  { seed: 42, locale: 'es' },   // misma semilla → mismos datos
)
```

Generadores: `id uuid firstName lastName name company email phone int float bool pick words date`.

### 4.10 Checklist de primeros pasos

Un widget flotante "Primeros pasos" que recuerda **qué ha visto ya cada usuario** (<!--tam:checklist-->~3.9 KB<!--/tam-->, entrada aparte). Terminar el tour de un elemento lo marca como hecho.

```ts
import { Checklist } from 'nexus-tours/checklist'

const checklist = new Checklist({
  id: 'onboarding',                                    // un id nuevo = mostrarlo otra vez a todos
  items: [
    { id: 'cliente', title: 'Crea tu primer cliente', description: 'Recorrido de 4 pasos', tour: pasosCliente },
    { id: 'factura', title: 'Envía una factura', tour: pasosFactura },
    { id: 'docs', title: 'Lee la documentación', onSelect: () => open('/docs') },   // acción sin tour: se marca al elegirla
  ],
  tourOptions: { theme, practice },                    // compartido por el tour de cada elemento
  theme, font, dir: 'auto', position: 'bottom-end',    // mismo tema que los tours (aislado en un shadow root)
  autoOpen: true,                                      // abre el panel la primera vez
  onComplete: () => celebrar(),
}).mount()

checklist.progress()      // { done: 1, total: 3, complete: false }
checklist.isDone('cliente'); checklist.markDone('docs'); checklist.reset(); checklist.hide(); checklist.show()
checklist.on('change', render); checklist.on('complete', celebrar)
```

- **Un tour cerrado a medias no cuenta**; solo llegar al final. El widget se oculta mientras corre un tour.
- **Almacenamiento:** `localStorage` por defecto (cae a memoria si está bloqueado). Pasa `storage: { get, set }` (síncrono o asíncrono) para guardar el progreso por cuenta, p. ej. en tu base de datos, y que siga al usuario entre dispositivos. `await checklist.ready` se resuelve cuando cargó el progreso guardado.
- **Accesible:** botones reales con nombres "completado / pendiente", `aria-expanded`, barra de progreso, `Esc` cierra y devuelve el foco.
- Vue / React: `useChecklist(options)` devuelve `{ items, done, total, complete, start, markDone, reset, open, close, show, hide }` reactivos y monta el widget con el componente.

### 4.11 Constructor visual (sin código)

Deja que cualquiera arme un tour **haciendo clic en tu página**. Impórtalo solo donde se necesite (<!--tam:builder-->~7.3 KB<!--/tam--> gzip).

```ts
import { TourBuilder } from 'nexus-tours/builder'

new TourBuilder({
  id: 'bienvenida',                    // nombre del borrador guardado (localStorage por defecto)
  lang: 'es',                          // 'es' | 'en' (por defecto, el del navegador)
  steps: pasosGuardados,               // parte de un tour ya guardado
  onSave: (json) => api.guardarTour(json),   // agrega un botón "Guardar": tu API, Supabase…
}).open()
```

Aparece un panel en tu página:

1. **Elegir elemento** (por defecto): pasa el cursor por la página; el elemento bajo el cursor se contornea con su selector; haz clic para agregar un paso. `↑` elige el contenedor. La página *no* reacciona a esos clics.
2. **Interactuar**: usa tu página normal (abrir un modal, cambiar de pestaña). Tus clics se graban y se repiten (`beforeClick`) antes del siguiente paso, así un paso *dentro de un modal* lo abre solo.
3. Escribe título y descripción, marca opcionalmente "Avanzar al hacer clic", cambia el lado o agrega una `route`. La etiqueta del selector indica si encuentra 1 elemento ✓, ninguno o varios ✗.
4. **Probar** (o ▶ en cualquier paso para empezar desde ahí), luego **Copiar JSON** / **Copiar código** / **Guardar**.

El JSON es exactamente lo que recibe un tour:

```ts
new Tour({ steps: json.steps })     // { version: 1, steps: [...] } → usa json.steps tal cual
```

- Los selectores se eligen para **sobrevivir a los despliegues**: `data-tour` / `data-testid`, ids reales, `name`, `aria-label`, clases estables y, solo al final, una ruta con `:nth-child`. Se ignoran ids y clases generados (`css-1x2y3z`, `r:3a9f`, hashes). `bestSelector(elemento)` se exporta por si lo quieres en otro lado.
- Funciona con modales `<dialog>` nativos (el panel se mueve dentro del modal abierto) y `Esc` no cierra el modal de abajo.
- Por cuenta o por empresa: guarda el JSON en tu base de datos con `onSave` y cárgalo con `steps` (o `builder.load(json)`).
- Por CDN: carga `nexus-tours.all.iife.js` y luego `builder.iife.js`; usa `new NexusToursBuilder.TourBuilder().open()`.
- Muéstralo solo a administradores (`if (usuario.esAdmin) new TourBuilder(...).open()`): es una herramienta de autoría, no para tus usuarios finales.

### 4.12 Vue y React

```vue
<script setup>
import { ref } from 'vue'
import { NexusTour, useTour } from 'nexus-tours/vue'
const abierto = ref(false)
</script>
<template>
  <button @click="abierto = true">Ayuda</button>
  <NexusTour v-model="abierto" :steps="steps" :options="{ theme }" @end="marcarHecho" />
</template>
```

```tsx
import { NexusTour, useTour } from 'nexus-tours/react'

const [abierto, setAbierto] = useState(false)
<NexusTour open={abierto} onOpenChange={setAbierto} steps={steps} theme={theme} onEnd={marcarHecho} />

// o imperativo
const { start, stop, active, index } = useTour({ steps })
```

Ambos pesan menos de 1 KB, importan el núcleo como dependencia par (`nexus-tours`) y limpian al desmontar. El de React es seguro con StrictMode. Eventos: `onStart / onStep / onTargetMissing / onEnd / onStop` (React) o `@start @step @missing @end @stop` (Vue).

### 4.12b Resaltar un elemento suelto y alinear el popover

`highlight()` resalta un elemento sin armar un tour, por ejemplo para señalar algo nuevo o un error en un formulario:

```ts
import { highlight } from 'nexus-tours'

highlight('#exportar', { title: 'Nuevo: exporta a Excel', side: 'left' })
const h = highlight('#total')        // sin textos: solo oscurece alrededor, sin tarjeta
h.stop()                             // devuelve el Tour; Esc o un clic en el fondo también lo cierran
```

`align` alinea el popover con el inicio, el centro (por defecto) o el final del elemento. Sirve para menús y columnas largas. En RTL, inicio y final se reflejan:

```ts
{ element: '#menu-usuario', title: 'Tu cuenta', side: 'bottom', align: 'end' }   // pegado al borde derecho del menú
new Tour({ align: 'start', steps })                                               // para todos los pasos
```

### 4.13 Analítica y eventos

Dale un `id` a cada paso y al tour. `onEvent` recibe un objeto plano por cada evento, listo para mandarlo a tu herramienta de analítica (Google Analytics, PostHog, Mixpanel, tu API…):

```ts
const tour = new Tour({
  id: 'bienvenida',
  onEvent: (e) => posthog.capture(`tour_${e.type}`, e),
  steps: [
    { id: 'hola', title: 'Bienvenido' },
    { id: 'crear', element: '#nuevo', title: 'Crea tu primer cliente' },
  ],
})
// e = { type: 'next', tourId: 'bienvenida', index: 0, total: 2, stepId: 'hola', title: 'Bienvenido',
//       elapsed: 5230 /* ms desde el inicio */, stepElapsed: 4100 /* ms en este paso */ }
```

| Evento | Cuándo |
|---|---|
| `start` | Empieza el tour |
| `step` | Se muestra un paso |
| `next` / `previous` | El usuario (o tu código) avanza o retrocede; se dispara antes de moverse |
| `missing` | El elemento de un paso nunca apareció |
| `end` | Terminó el último paso |
| `stop` | Se cerró antes del final; `reason` dice cómo: `skip` (Omitir), `close` (×), `esc`, `backdrop` (clic en el fondo), `dismiss` ("No volver a mostrar"), `missing` o `api` (tu código llamó `stop()`) |

Con eso puedes medir en qué paso abandona la gente y cuánto tarda en cada uno. Los mismos eventos están en `tour.on('stop', (ctx) => ctx.reason)` y en los wrappers (`@next`, `@stop` en Vue; `onNext`, `onStop` en React). Los ids también sirven para navegar: `tour.goTo('crear')` y `tour.start('crear')`.

### 4.14 Contenido enriquecido

`title`, `description` y `hint` siempre son texto: nunca se interpretan como HTML, así que no hay riesgo de inyección aunque vengan de tu base de datos. Para listas, enlaces o videos usa `content` y crea los nodos tú mismo:

```ts
{
  title: 'Atajos',
  content: () => {
    const ul = document.createElement('ul')
    for (const t of ['Ctrl + K: buscar', 'Ctrl + N: nuevo']) ul.append(Object.assign(document.createElement('li'), { textContent: t }))
    return ul
  },
}
```

Si `content` devuelve un string, se muestra como texto. El contenido forma parte de la descripción accesible del paso y vive dentro del shadow root: dale estilo en línea o con la opción `css` (`.gm-content ul { … }`).

### 4.15 Renderizado en servidor (Nuxt, Next)

Puedes importar la librería y crear tours en el servidor sin errores: `start()` y `startIfNeeded()` no hacen nada cuando no hay `document`. Arranca el tour en el cliente (`onMounted` en Vue, `useEffect` en React).

### 4.16 Bootstrap, Tailwind y otros frameworks

El tour vive en un shadow root, así que el CSS de tu framework (el reboot de Bootstrap, el preflight de Tailwind, Bulma, Foundation…) no lo desarma, y el suyo no toca tu página.

**Usa los colores de tu framework.** Estos temas leen sus variables CSS, así que siguen tu marca y su modo oscuro sin configurar nada:

```ts
import { themes } from 'nexus-tours/themes'

new Tour({ steps, theme: themes.bootstrap })                         // --bs-primary, data-bs-theme="dark"
new Tour({ steps, theme: { ...themes.tailwind, accent: 'var(--color-emerald-600)' } })   // tu color de Tailwind
```

| Tema | Lee | Notas |
|---|---|---|
| `bootstrap` | `--bs-primary`, `--bs-body-bg`, `--bs-body-color`, `--bs-body-font-family`… | Bootstrap 5.3; sigue `data-bs-theme="dark"` y tu `--bs-primary` |
| `tailwind` | `--color-indigo-600`, `--color-gray-*`, `--font-sans` | Tailwind v4; cambia `accent` por tu color |
| `shadcn` | `--primary`, `--popover`, `--muted-foreground`, `--border`, `--radius` | shadcn/ui con Tailwind v4. Con las variables HSL antiguas: `accent: 'hsl(var(--primary))'` |
| `daisyui` | `--color-primary`, `--color-base-100`, `--radius-box`… | daisyUI 5; sigue el `data-theme` activo |
| `vuetify` | `--v-theme-primary`, `--v-theme-surface`… | Vuetify 3, claro y oscuro |
| `mui` | `--mui-palette-primary-main`… | Material UI con variables CSS (`cssVariables: true`) |
| `sweetalert2` | `--swal2-confirm-button-background-color`, `--swal2-background`… | SweetAlert2 11, incluido su tema oscuro ([4.17](#417-sweetalert2)) |

Si una variable no existe se usa el color por defecto de ese framework.

**Modales, menús y paneles.** El tour se monta dentro del modal donde está el elemento, así que la trampa de foco del framework no lo bloquea. Si el framework mueve el foco a su contenedor al terminar la animación, el tour lo recupera; y al cerrar el tour con Esc, el foco vuelve dentro del modal, que sigue abierto. Se prueba con Bootstrap 5 real (modal con animación, offcanvas, dropdown, pestañas y acordeón) y funciona con cualquier librería que marque sus diálogos con `role="dialog"` o `aria-modal` (Headless UI, Radix, MUI, Element Plus, Ant Design, Quasar, PrimeVue…). Si la tuya no lo hace, indícale el contenedor:

```ts
new Tour({ steps, modalSelector: '.mi-libreria-modal' })
```

Con Bootstrap, abre y cierra sus componentes desde los pasos con `beforeClick` / `afterClick` sobre los mismos botones que usa el usuario (`data-bs-toggle`), y el tour espera a que terminen sus animaciones:

```ts
{ element: '#nombre', title: 'Nombre del cliente', beforeClick: '#btn-nuevo', afterClick: '#modal .btn-close' }
```

### 4.17 SweetAlert2

El tour puede guiar al usuario **dentro** de una alerta de SweetAlert2 (confirmaciones, alertas con campos, toasts) y seguir en la página cuando se cierra:

```ts
import { themes } from 'nexus-tours/themes'

new Tour({
  theme: themes.sweetalert2,                // mismo morado, fondo y bordes que tus alertas
  steps: [
    { element: '#eliminar', title: 'Eliminar un cliente' },
    { element: '.swal2-title', title: 'Te pedimos confirmar', beforeClick: '#eliminar' },   // abre la alerta y espera su animación
    { element: '.swal2-confirm', title: 'Confirma aquí', advanceOn: 'click', hideNext: true },
    { element: '#lista', title: 'Listo, ya no aparece' },
  ],
})
```

- **Usa `advanceOn: 'click'`** en el paso del botón que cierra la alerta (confirmar, cancelar): el tour avanza en cuanto el usuario lo pulsa, también si confirma con Enter. Sin `advanceOn`, el tour espera a que el botón vuelva a aparecer (`waitTimeout`) antes de saltarse el paso.
- **Abre la alerta con `beforeClick`** sobre el botón que la dispara. Si la abres desde `before`, no esperes la promesa: `before: () => { Swal.fire({…}) }`, sin `await`, porque `Swal.fire()` se resuelve hasta que la alerta se cierra.
- **Teclado.** Mientras el foco está en el tour, Tab y las flechas son del tour, aunque SweetAlert2 también las escuche. Esc cierra solo el tour; la alerta sigue abierta y con el foco, y un segundo Esc la cierra. Enter dentro del campo de la alerta lo sigue manejando SweetAlert2.
- **Lectores de pantalla.** SweetAlert2 pone `aria-hidden="true"` en todo lo que no es la alerta. El tour se lo quita a sí mismo (también `inert`, que usan otras librerías), así que nunca queda oculto.

---

## 5. Referencia de la API

```ts
new Tour({
  steps: Step[],
  id?: string,                   // nombre del tour para la analítica (por defecto persist.id)
  onEvent?: (e: TourAnalyticsEvent) => void,
  waitTimeout?: number,          // por defecto 5000 ms
  onMissing?: 'skip' | 'stop',   // por defecto 'skip'
  closeOnBackdrop?: boolean,     // por defecto false
  closeOnEsc?: boolean,          // por defecto true
  keyboard?: boolean,            // ←/→/Enter, por defecto true
  showProgress?: boolean,        // "2 / 5", por defecto true
  padding?: number,              // por defecto 6
  labels?: { next, previous, done, close, progress, practice, never, skip },
  progress?: 'dots' | 'text' | 'both', skip?: boolean, closeButton?: boolean, celebrate?: boolean,
  mobile?: 'auto' | 'always' | 'never', mobileBreakpoint?: number,   // hoja inferior en celulares
  router?: 'history' | 'location' | { current(), go(path), reloads? },
  persist?: { id, storage?, version?, dontShowAgain? },
  practice?: PracticeOptions,    // ver "Modo práctica"
  theme?, font?, fonts?, css?, className?, arrow?, dir?,
  container?: HTMLElement,       // dónde montar cuando no hay modal
  modalSelector?: string,        // contenedores modales de tu librería sin role="dialog"
  nonce?: string,                // nonce CSP para el <style> inyectado
})

interface Step {
  id?: string                          // para analítica y goTo('id')
  element?: string | Element | (() => Element | null)   // omítelo para un paso centrado
  title?: string
  description?: string                 // texto plano
  content?(ctx): Node | string         // contenido enriquecido (nodos que tú creas)
  side?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'   // alineación con el elemento (también como opción del tour)
  popover?: boolean                    // false: solo el resaltado, sin tarjeta
  before?(ctx): void | Promise<void>   // corre antes de buscar el elemento
  after?(ctx): void | Promise<void>    // corre al salir del paso
  waitTimeout?: number
  onMissing?: 'skip' | 'stop'
  allowTargetClick?: boolean           // deja que el usuario haga clic en el elemento resaltado
  beforeClick?: string | string[]      // hace clic primero si el elemento no es visible (abrir el modal)
  afterClick?: string | string[]       // hace clic al salir del paso (cerrar el modal)
  padding?: number
  advanceOn?: 'click' | 'input' | … | { event?, target?, when?, until?, delay? }   // avanza cuando el usuario actúa
  hint?: string                        // llamada a la acción bajo la descripción
  icon?: string, image?: string        // emoji / imagen sobre el título
  hideNext?: boolean                   // con advanceOn: sin botón "Siguiente"
  route?: string                       // requiere el router del tour
}

highlight(elemento, paso?, opciones?)   // resalta un elemento suelto; devuelve el Tour
tour.start(índice | id?)  tour.startIfNeeded()  tour.status()  tour.reset()
tour.next()  tour.previous()  tour.goTo(índice | id)  tour.stop()  tour.destroy()
tour.on('start' | 'step' | 'next' | 'previous' | 'missing' | 'end' | 'stop', ctx => …)   // devuelve una función para cancelar
// ctx = { index, total, step, element, tour, reason? }   (reason solo en 'stop')
```

Puntos de entrada: `nexus-tours`, `nexus-tours/all` (todo junto), `/fixtures`, `/themes`, `/checklist`, `/builder`, `/supabase`, `/vue`, `/react`.

La referencia completa, generada de los tipos, se construye con `npm run docs:api`, y [`api/nexus-tours.api.md`](api/nexus-tours.api.md) resume toda la API pública en un solo archivo.

**Estabilidad.** Mientras la versión sea 0.x, una versión menor (0.2.0) puede traer cambios incompatibles, siempre anotados en el [CHANGELOG](CHANGELOG.md), y un parche (0.1.1) nunca los trae. Desde la 1.0 se sigue SemVer estricto. El CI compara la API pública en cada cambio, así que nada cambia por accidente.

**Funciona con** TypeScript en cualquier modo de resolución (`bundler`, `node16` ESM y CJS, `node`), `import` y `require` en Node, Vite, webpack, Nuxt y Next. El CI lo comprueba en cada cambio instalando el paquete empaquetado en un proyecto limpio.

---

#### Garantías y límites del modo práctica

| Garantiza | No garantiza |
|---|---|
| Ninguna escritura sin ruta sale del navegador (salvo lo que tú permitas con `allow`). | Que las lecturas sean ficticias **si no usas `strict`**: un GET sin ruta llega al servidor real. |
| Con `strict`, nada sale sin ruta ni `allow`. | Interceptar WebSocket, `EventSource`, `navigator.sendBeacon`, formularios HTML nativos ni imágenes/scripts (no son `fetch`/XHR). |
| `fetch` y XHR se restauran al terminar, aunque algo falle al empezar. | Aislar peticiones de **otras pestañas**, de un Service Worker o de un `fetch` guardado antes de iniciar (`const f = window.fetch`). |
| Una sola sesión activa. | Que una petición de tu app **durante** el tour (por ejemplo, una actualización automática en segundo plano) no reciba datos de ejemplo: durante el tour, todo `fetch`/XHR de la página se trata igual. |

---

## 6. Accesibilidad

`role="dialog"` con etiqueta, foco que entra y se restaura al salir, Tab atrapado dentro del tour, anuncios con `aria-live`, navegación completa con teclado (←/→/Enter/Esc), soporte RTL y `prefers-reduced-motion` (sin animaciones ni confeti).

Cada cambio pasa una auditoría automática con [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.2 A/AA) del popover en escritorio y celular, la tarjeta de bienvenida, el aviso de modo práctica, los 7 temas (contraste), el checklist y el constructor visual (`test/e2e/accesibilidad.spec.mjs`). La auditoría automática no sustituye una prueba con lector de pantalla (NVDA, VoiceOver), así que **no es una certificación de cumplimiento de WCAG 2.2 AA**: pasar axe detecta solo una parte de los problemas posibles. Falta la validación manual con lectores de pantalla y teclado en distintos navegadores; hasta entonces, trátalo como un buen punto de partida, no como una garantía.

**Límites del Shadow DOM.** El tour vive en un shadow root para aislar su diseño de tus estilos. Eso no garantiza compatibilidad con cualquier sistema de estilos o modal: tus CSS globales no lo alcanzan (usa `::part()` y las variables `--gm-*`), y un modal que atrape el foco (`inert`, trampas de foco de otras librerías) puede competir con el del tour. Los casos probados están en `test/e2e`; fuera de ellos, valida en tu aplicación.

## 7. Tamaños y compatibilidad

Tamaños aproximados (minificado + gzip, lo que descarga el usuario); `npm run size` los verifica en cada PR:

| Pieza | Tamaño |
|---|---|
| Núcleo (`nexus-tours`) | <!--tam:nexus-tours-->~12.6 KB<!--/tam--> |
| Todo junto (`nexus-tours.all`, CDN) | <!--tam:nexus-tours.all-->~21.2 KB<!--/tam--> |
| Constructor visual | <!--tam:builder-->~7.3 KB<!--/tam--> |
| Checklist | <!--tam:checklist-->~3.9 KB<!--/tam--> |
| Adaptador Supabase | <!--tam:supabase-->~3.4 KB<!--/tam--> |
| Datos de ejemplo / Temas / Vue / React | <!--tam:fixtures-->~1.5 KB<!--/tam--> / <!--tam:themes-->~1.4 KB<!--/tam--> / <!--tam:vue-->~1.0 KB<!--/tam--> / <!--tam:react-->~0.8 KB<!--/tam--> |

Cero dependencias en tiempo de ejecución; `vue` y `react` son dependencias par **opcionales**.

**Navegadores.** Las pruebas corren en cada cambio en las versiones actuales de los tres motores: Chromium (Chrome, Edge), Firefox y WebKit (Safari). Objetivo de soporte: Chrome / Edge 92+, Firefox 90+ y Safari 15.4+ (iOS 15.4+), con alternativas para lo más reciente:

| Si el navegador no tiene… | nexus-tours usa… |
|---|---|
| Popover API (Chrome 114, Firefox 125, Safari 17) | `z-index` alto y, si hay un `<dialog>` modal abierto, se monta dentro de él |
| Hojas de estilo construibles (`adoptedStyleSheets`) | un `<style>` dentro del shadow root (respeta la opción `nonce` de tu CSP) |
| `color-mix()` | colores rgba equivalentes |
| `crypto.randomUUID` (también falta en HTTP sin TLS) | un generador de UUID v4 propio (adaptador Supabase) |

Las alternativas también se prueban (`test/e2e/compatibilidad.spec.mjs` quita esas APIs antes de cargar la página). Las versiones anteriores al objetivo no se prueban.

## 8. Demos

- **Sitio de documentación** (`site/`): portada con un tour real sobre la propia página, esta guía, la **Demo** (modal, modo práctica, temas, fuentes, flecha, RTL, checklist y constructor, en español e inglés) y la referencia de la API generada con TypeDoc. Se publica en GitHub Pages con `.github/workflows/docs.yml`: <https://urieldomingezm.github.io/nexus-tours/>.
  ```bash
  npm run dev          # luego abre http://localhost:5173/site/demo.html (la portada y la guía necesitan build:site)
  npm run build        # los tamaños del sitio se miden sobre dist/
  npm run build:site   # → site-dist/
  npm run docs:api     # agrega la referencia de la API en site-dist/api
  ```
- **Demo para portafolio** (`demo/`): una mini app "Nexus Personal" que muestra la librería en uso (bienvenida, pasos interactivos, modal que carga después, modo práctica, confeti, hoja inferior en móvil y constructor visual).
  ```bash
  npm run build:demo   # → demo-dist/ (HTML + JS estáticos, rutas relativas)
  ```
  Sube la carpeta a cualquier hosting estático (o a `public/nexus-tours-demo/` de tu portafolio) y enlázala, o incrústala:
  ```html
  <iframe src="/nexus-tours-demo/?embed=1" title="Demo de nexus-tours"
          style="width:100%;height:640px;border:0;border-radius:14px" loading="lazy"></iframe>
  ```
  `?embed=1` oculta la barra lateral. El CI publica la carpeta como artefacto (`demo-portafolio`) en cada push.

  **En vivo:** <https://devmedina.is-a.dev/demos/nexus-tours/>. Para actualizarla en el portafolio (compila con la base `/demos/nexus-tours/` y copia a su carpeta pública):
  ```bash
  npm run demo:publicar -- ../portafolio-social/public/demos/nexus-tours
  ```
  Luego haz commit y PR en `portafolio-social`. Usa `DEMO_BASE=/otra/ruta/` (o el segundo argumento del script) si la alojas en otra ruta.

## 9. Desarrollo y pruebas

```bash
npm i
npm run dev            # abre las páginas de prueba (test/paginas/) con un <dialog> animado
npm run build          # núcleo, todo, fixtures, temas, checklist, supabase, builder, vue, react + tipos
npx playwright install chromium firefox webkit
npm test               # unitarias + punta a punta (requiere npm run build y npm run build:demo)
```

| Comando | Qué hace |
|---|---|
| `npm run test:unit` | Pruebas unitarias (Vitest + happy-dom) de la lógica pura: datos de ejemplo, rutas, almacenamiento, temas, espera de elementos, posición del popover, progreso guardado, modo práctica y adaptador Supabase |
| `npm run test:coverage` | Lo mismo con cobertura (`coverage/`); el CI falla si baja del piso definido en `vitest.config.mjs` |
| `npm run test:e2e` | Pruebas de punta a punta (Playwright Test) en Chromium, Firefox y WebKit |
| `npm run test:e2e:chromium` | Solo Chromium (más rápido mientras desarrollas); también `npx playwright test ux --project=webkit`, etc. |
| `npm run lint` · `npm run format` | ESLint y Prettier (`format:check` solo verifica) |
| `npm run typecheck` · `npm run size` | Tipos de TypeScript y límites de tamaño gzip de cada archivo (`scripts/tamano.mjs`) |
| `npm run api` · `npm run api:check` | Regenera / verifica el reporte de la API pública (`api/nexus-tours.api.md`) |
| `npm run check:paquete` | Are The Types Wrong + el paquete empaquetado probado con Node (ESM/CJS), TypeScript (bundler/node16), Vite y webpack |
| `npm run docs:api` | Referencia de la API con TypeDoc en `site-dist/api` (después de `npm run build:site`) |

Las pruebas de punta a punta (`test/e2e/`) cubren el núcleo, el adaptador Supabase contra `supabase-js` real, la interceptación de XHR con axios real, los pasos interactivos / móvil / páginas, el constructor visual, la demo, la accesibilidad (axe-core) y los navegadores sin APIs recientes. Si una falla, `npx playwright show-trace test-results/…/trace.zip` muestra la grabación paso a paso.

El CI (GitHub Actions) corre en cada PR: lint, formato, tipos, unitarias con cobertura, compilación, tamaño, sitio y demo, y las pruebas de punta a punta en los tres navegadores (un job por navegador; si falla, sube el reporte y las grabaciones).

**Código fuente.** `src/tour.ts` es el ciclo de vida del tour; `src/core/` tiene las piezas: `dom` (objetivos, modales, top layer), `layout` (posición del popover y la flecha, funciones puras), `render` (DOM del popover), `keyboard` y `progress` (progreso guardado).

**Convenciones:** la rama de trabajo es `main`; los mensajes de commit se escriben en español.

## 10. Hoja de ruta

- ✅ Núcleo con modales, `<dialog>`, portales y contenido asíncrono · ✅ wrappers Vue / React · ✅ temas · ✅ RTL · ✅ flecha · ✅ sitio de docs
- ✅ Celulares (hoja inferior, deslizar) · ✅ `advanceOn` · ✅ progreso guardado · ✅ cambio de página
- ✅ Modo práctica: `fetch`, `XMLHttpRequest` (axios, jQuery), adaptador Supabase/PostgREST
- ✅ Checklist · ✅ constructor visual · ✅ demo de portafolio
- ✅ Valores por defecto de columnas en el adaptador Supabase (`defaults`)
- ✅ Demo publicada en `devmedina.is-a.dev/demos/nexus-tours/`
- ✅ Publicada en npm · ✅ pruebas en Chromium, Firefox y WebKit · ✅ auditoría de accesibilidad
- ✅ Analítica (`onEvent`, motivos de cierre), ids de paso, contenido enriquecido, SSR
- ⏭ Demo en vivo del adaptador Supabase en el sitio de docs · probarla dentro de Nexus · 1.0

## 11. Autoría, licencia y derechos de autor

**Autor y titular de los derechos:** Angel Uriel Domínguez Medina, bajo la marca **DevMedina**.
Portafolio: <https://devmedina.is-a.dev/> · GitHub: [@urieldomingezm](https://github.com/urieldomingezm)

```
Copyright © 2026 Angel Uriel Domínguez Medina (DevMedina). Todos los derechos de autor reservados
sobre el código y la documentación, que se ofrecen bajo la licencia MIT.
```

### Licencia de uso

**nexus-tours** se distribuye bajo la **Licencia MIT** (texto completo en [`LICENSE`](./LICENSE)). En términos simples:

**Puedes**
- usarla en proyectos personales, de clientes y **comerciales**, incluso de pago o SaaS;
- copiarla, modificarla, fusionarla con tu código, publicarla, distribuirla y sublicenciarla.

**Debes**
- conservar el aviso de derechos de autor y el texto de la licencia en todas las copias o partes sustanciales del software (incluidas versiones empaquetadas o modificadas).

**No puedes**
- presentar el software como obra tuya eliminando el aviso de autoría;
- exigir al autor garantías: se entrega **«tal cual»**, sin garantía de ningún tipo, y el autor no es responsable de reclamaciones, daños u otras responsabilidades derivadas de su uso.

### Marca y atribución

El código es MIT, pero **«DevMedina»**, el logotipo «DM» y el nombre «Nexus» (la plataforma de la que esta librería forma parte) **no** se incluyen en la licencia: no los uses para sugerir que tu producto o tu fork está respaldado u operado por el autor sin permiso. La demo y el sitio de documentación llevan la marca DevMedina; si los reutilizas, reemplázala por la tuya.

### Contribuciones

Si envías código a este repositorio, se entiende que lo haces bajo la misma licencia MIT y que tienes derecho a hacerlo. Lee [CONTRIBUTING.md](CONTRIBUTING.md) para preparar el entorno y [SECURITY.md](SECURITY.md) para reportar vulnerabilidades en privado.

### Componentes de terceros

La librería no tiene dependencias en tiempo de ejecución. El sitio de documentación y la demo usan [Bootstrap Icons](https://icons.getbootstrap.com/) (MIT) y las pruebas usan Playwright, `@supabase/supabase-js`, axios, Vue y React (todos con licencias permisivas). El detalle y sus avisos están en [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

> Este apartado es información general sobre la licencia y no constituye asesoría legal. Para una necesidad específica (por ejemplo, licenciar a una empresa en condiciones distintas a MIT), consulta a un abogado.
