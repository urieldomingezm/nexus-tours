# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado semántico.

## [Sin publicar]

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
