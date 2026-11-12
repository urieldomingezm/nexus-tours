# Cómo contribuir a nexus-tours

Gracias por ayudar. Esta guía explica cómo preparar el entorno, qué revisa el CI y cómo se publica una versión.

## Entorno

Necesitas Node 22 o superior.

```bash
npm ci
npx playwright install chromium firefox webkit
npm run dev            # abre test/paginas/ (un <dialog> animado y una página por escenario)
```

## Antes de abrir un PR

```bash
npm run lint && npm run format:check && npm run typecheck
npm run build          # también genera los tipos (.d.ts y .d.cts)
npm run test:unit
npm run build:demo && npm run test:e2e:chromium   # rápido; el CI corre los 3 navegadores
npm run size           # límites de tamaño gzip
npm run api:check      # ¿cambió la API pública?
```

- **Pruebas.** Toda corrección lleva una prueba que fallaba antes. Lógica pura → `test/unit/` (Vitest). Comportamiento en el navegador → `test/e2e/` (Playwright). Las pruebas de punta a punta usan `ok()` / `eq()` de `test/e2e/utilidades.mjs`, que no detienen la prueba al fallar.
- **Accesibilidad.** Si cambias lo que dibuja la librería, `test/e2e/accesibilidad.spec.mjs` lo audita con axe-core (WCAG 2.2 AA). Agrega el caso nuevo ahí.
- **API pública.** `api/nexus-tours.api.md` es el contrato. Si tu cambio lo modifica, corre `npm run build && npm run api` y súbelo con el PR; el CI falla si no coincide. Antes de la 1.0 se permiten cambios incompatibles en versiones menores, pero siempre se anotan en el CHANGELOG.
- **Tamaño.** Se mide minificado + gzip (lo que descarga el usuario). El núcleo debe quedar por debajo de 13 KB. El CI deja en el resumen una tabla con el cambio contra `main`.
- **Paquete.** `npm run check:paquete` instala el paquete empaquetado en un proyecto limpio y lo prueba con Node (ESM y CJS), TypeScript (bundler y node16), Vite y webpack.

## Estilo

- TypeScript sin dependencias en tiempo de ejecución. Si algo necesita una dependencia, va en un punto de entrada aparte y opcional.
- Prettier formatea el código (`npm run format`). Los `.md` se escriben a mano.
- La interfaz de la librería está en inglés (`labels` permite traducirla). La documentación, los comentarios de las pruebas y los commits van en español.
- Mensajes de commit en español, en imperativo o descriptivos: "Checklist: nombre accesible desde el texto visible".
- Usa "Create a merge commit" o "Rebase and merge" al integrar un PR. Con "Squash" se pierde el commit de formato que `.git-blame-ignore-revs` le pide a `git blame` ignorar.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/tour.ts` | Ciclo de vida del tour (orquestador) |
| `src/core/` | `dom`, `layout` (posición, funciones puras), `render`, `keyboard`, `progress` |
| `src/practice.ts`, `src/supabase.ts`, `src/fixtures.ts` | Modo práctica |
| `src/checklist.ts`, `src/builder.ts`, `src/vue.ts`, `src/react.ts` | Extras (cada uno es un punto de entrada) |
| `test/unit/`, `test/e2e/` | Pruebas |
| `test/paginas/` | Páginas que usan las pruebas de punta a punta (una por escenario: Bootstrap, SweetAlert2, Supabase, CDN…) |
| `scripts/` | Tamaño, reporte de API, ajuste de tipos y prueba del paquete |
| `api/` | Reporte de la API pública (generado) |
| `site/`, `demo/` | Sitio de documentación y demo del portafolio |

## Publicar una versión

Tú eliges el número; lo demás es automático.

1. Anota los cambios en la sección **«Sin publicar»** de `CHANGELOG.md` (si está vacía, el flujo se detiene sin tocar nada).
2. En GitHub: **Actions → Nueva versión → Run workflow**. Elige `patch` (correcciones: 0.2.0 → 0.2.1), `minor` (funciones nuevas: 0.2.0 → 0.3.0) o `major`, o escribe un número exacto en «numero» (manda sobre el tipo). Mientras sea 0.x, las funciones nuevas o los cambios incompatibles suben el segundo número.
3. El flujo sube `package.json`, `package-lock.json` y el CHANGELOG (lo de «Sin publicar» pasa a la versión nueva, con la fecha de hoy), guarda un commit en `main` con la etiqueta `vX.Y.Z`, crea la release en GitHub con esas notas y lanza **Publicar en npm** y **Documentación**.
4. **Publicar en npm** revisa primero si esa versión ya está en npm (si está, termina sin hacer nada); si no, corre la calidad y las pruebas de los 3 navegadores en paralelo (unos 10 minutos) y sube la versión **en espera**. Apruébala con 2FA en npmjs.com (pestaña *Staged Packages*); también funciona desde el celular.

El sitio de documentación se publica solo al hacer merge a `main` de cualquier cambio que lo afecte (`site/`, `README.md`, `CHANGELOG.md`, `src/`…), sin esperar a una versión.

Si prefieres hacerlo a mano: sube `version` en un PR, mueve las notas al encabezado de la versión (`node scripts/nueva-version.mjs patch|minor|major|X.Y.Z` lo hace por ti) y crea la etiqueta `vX.Y.Z` sobre `main`.

El flujo necesita el secreto `NPM_TOKEN` en el repositorio: un token *Granular access* con permiso "Read and write (stage only)" y sin la opción de saltarse el 2FA.
