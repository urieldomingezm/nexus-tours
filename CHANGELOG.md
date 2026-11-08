# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado semántico.

## [Sin publicar]

### Corregido
- Accesibilidad del checklist: el nombre accesible del lanzador y de cada paso sale del texto visible (WCAG 2.5.3) y la barra de progreso tiene nombre y valor en texto.
- Contraste de las insignias "encontrado / no encontrado" del constructor visual (WCAG AA).
- Adaptador Supabase: `'uuid()'` / `'gen_random_uuid()'` y los ids de texto funcionan sin `crypto.randomUUID` (páginas en HTTP sin TLS, navegadores viejos).

### Cambiado
- Los mensajes de error en consola usan el prefijo `[nexus-tours]`.
- Organización interna: `tour.ts` se dividió en módulos (`src/core/`). La API pública no cambia.

### Interno
- Pruebas de punta a punta con Playwright Test en Chromium, Firefox y WebKit.
- Pruebas unitarias con Vitest y piso de cobertura.
- Auditoría de accesibilidad con axe-core y prueba de navegadores sin Popover API ni `adoptedStyleSheets`.
- ESLint + Prettier y límites de tamaño en el CI.

## [0.1.0] — 2026-11-07

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
