# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado semántico.

## [Sin publicar]

### Modo práctica: aislamiento más estricto
- `strict: true`: bloquea también las lecturas (`fetch`/XHR) que ninguna ruta atienda; solo pasa lo que autorice `allow`. `allow` ahora aplica a cualquier método.
- Una sola sesión de modo práctica activa: un segundo `start()` rechaza con un error claro (antes se apilaban dos interceptores).
- Si `onStart` lanza, `fetch` y XHR quedan restaurados. Si otra librería envolvió `fetch` encima, el interceptor deja de responder tras `stop()`.
- `<html data-nexus-practice>` (`="strict"` en modo estricto) mientras dura, para estilar un indicador de entorno de demostración.
- Pruebas de peticiones simultáneas (antes, durante y después del tour) y de restauración.

### Documentación
- Tabla «Garantías y límites del modo práctica», límites del Shadow DOM y aclaración de que la auditoría con axe no es una certificación WCAG.

### Agregado
- Sitio de documentación rediseñado: portada con un tour real sobre la propia página, guía (el README), demo y referencia de la API. Menú de celular, tema claro/oscuro y publicación en GitHub Pages (`docs.yml`).

## [0.2.0] — 2026-11-09

### Posicionamiento y resaltado
- `align: 'start' | 'center' | 'end'` por paso o para todo el tour (reflejado en RTL).
- `highlight(elemento, paso?, opciones?)`: resalta un elemento suelto sin armar un tour.
- `Step.popover: false`: solo el resaltado, sin tarjeta (el foco se queda en la página).

### Compatibilidad con frameworks de UI
- Temas que leen las variables CSS del framework y siguen su modo oscuro: `themes.bootstrap`, `tailwind`, `shadcn`, `daisyui`, `vuetify` y `mui`.
- Se detectan como modales el modal y el offcanvas de Bootstrap y los overlays de Vuetify; opción `modalSelector` para otras librerías.
- Si el framework mueve el foco a su contenedor al abrir un modal (Bootstrap lo hace al terminar la animación), el tour lo recupera.
- Al cerrar el tour dentro de un modal que sigue abierto, el foco vuelve dentro del modal (antes caía en `<body>` y Esc ya no cerraba el modal).
- Pruebas con Bootstrap 5 real: modal con animación, offcanvas, dropdown, pestañas, acordeón y modo oscuro.

### SweetAlert2
- `themes.sweetalert2` (variables `--swal2-*`, también en oscuro).
- Tab y las flechas ya no llegan a la ventana de SweetAlert2 cuando el foco está en el tour; antes SweetAlert2 se llevaba el foco a sus botones.
- El tour se quita `aria-hidden` e `inert` cuando una librería se los pone (SweetAlert2, react-aria, Radix); antes podía quedar oculto para lectores de pantalla, incluso después de cerrar la alerta.
- Pruebas con SweetAlert2 real: confirmación, alerta con campo, Esc, alerta abierta encima del tour, toast y tema claro/oscuro.

### Agregado
- `Step.id`, `goTo('id')` y `start('id')`.
- Eventos `next` y `previous`; `stop` trae `ctx.reason` (`skip`, `close`, `esc`, `backdrop`, `dismiss`, `missing`, `api`); `ctx.total`.
- Opciones `id` y `onEvent` para analítica: un objeto serializable por evento, con tiempos (`elapsed`, `stepElapsed`).
- `Step.content` para contenido enriquecido (nodos propios o texto, nunca HTML).
- Los wrappers de Vue y React reenvían `next` / `previous` (`@next`, `onNext`…); `startAt` acepta un id.

### Corregido
- Tipos correctos en todos los modos de TypeScript: `node16` (ESM y CJS con `.d.cts`) y `node` (subrutas con `typesVersions`).
- SSR: `start()` y `startIfNeeded()` no hacen nada sin `document` (Nuxt, Next).
- `previous()` en el primer paso ya no vuelve a mostrar el paso (ni corre su `after`).
- `on()` devuelve `() => void` en los tipos.

### Interno
- Reporte de la API pública (`api/nexus-tours.api.md`) verificado en el CI; referencia con TypeDoc.
- El CI prueba el paquete empaquetado con Node, TypeScript, Vite y webpack, y compara el tamaño contra `main`.
- CONTRIBUTING, SECURITY, plantillas de issues y PRs, Dependabot.

## [0.1.1] — 2026-11-10

Versión de mantenimiento sin cambios de código respecto a 0.1.0 (se compiló desde una copia anterior del repositorio).

## [0.1.0] — 2026-11-08

Primera versión pública.

### Núcleo
- Tours que esperan elementos animados o asíncronos, se montan dentro de `<dialog>` / modales y se recuperan si el modal se cierra y reabre.
- Aislamiento con Shadow DOM, temas, fuentes propias, variables CSS y `::part()`; flecha, RTL y movimiento reducido.
- Celulares: hoja inferior, botones táctiles, deslizar para avanzar, teclado en pantalla y safe-area.
- `advanceOn` (pasos que avanzan cuando el usuario actúa), `hint`, `hideNext`, `beforeClick` / `afterClick`.
- Progreso guardado (`persist`, `startIfNeeded`, `status`, `reset`) y cambio de página (`router`, `route`).
- Tarjeta de bienvenida, puntos de progreso, "Omitir", imagen / ícono y confeti.

### Modo práctica
- Datos de ejemplo reproducibles (`nexus-tours/fixtures`), interceptación de `fetch` y `XMLHttpRequest` (axios, jQuery) y bloqueo de escrituras.
- Adaptador Supabase / PostgREST (`nexus-tours/supabase`) con filtros, orden, paginación, joins, `rpc`, funciones edge y `defaults` de columnas.

### Extras
- Checklist de primeros pasos (`nexus-tours/checklist`), constructor visual sin código (`nexus-tours/builder`), wrappers de Vue y React.
- Build por CDN (`nexus-tours.all.iife.js`, global `NexusTours`).

### Calidad
- Pruebas en Chromium, Firefox y WebKit; pruebas unitarias con piso de cobertura; auditoría de accesibilidad con axe-core (WCAG 2.2 AA); prueba de navegadores sin Popover API ni `adoptedStyleSheets`.
- Accesibilidad del checklist (nombre desde el texto visible, barra de progreso con nombre) y contraste de las insignias del constructor.
- Adaptador Supabase: UUID sin `crypto.randomUUID` (HTTP sin TLS, navegadores viejos).
