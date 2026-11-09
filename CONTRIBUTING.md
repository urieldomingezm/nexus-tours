# Cómo contribuir a nexus-tours

Gracias por ayudar. Esta guía explica cómo preparar el entorno, qué revisa el CI y cómo se publica una versión.

## Entorno

Necesitas Node 22 o superior.

```bash
npm ci
npx playwright install chromium firefox webkit
npm run dev            # página de prueba con un <dialog> animado en http://localhost:5173
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
| `scripts/` | Tamaño, reporte de API, ajuste de tipos y prueba del paquete |
| `api/` | Reporte de la API pública (generado) |
| `site/`, `demo/` | Sitio de documentación y demo del portafolio |

## Publicar una versión

1. Elige la versión según [SemVer](https://semver.org/lang/es/). Mientras sea 0.x: correcciones → parche (0.1.1); funciones nuevas o cambios incompatibles → menor (0.2.0).
2. En un PR: sube `version` en `package.json`, mueve las notas al encabezado de la versión en `CHANGELOG.md` con la fecha y haz merge cuando el CI esté en verde.
3. Crea la etiqueta `vX.Y.Z` sobre `main`. Se puede hacer desde GitHub: **Releases → Draft a new release → Choose a tag → crear `vX.Y.Z`**, usando las notas del CHANGELOG.
4. El flujo **Publicar en npm** vuelve a correr todo y sube la versión **en espera**. Apruébala con 2FA en npmjs.com (pestaña *Staged Packages*); también funciona desde el celular.

El flujo necesita el secreto `NPM_TOKEN` en el repositorio: un token *Granular access* con permiso "Read and write (stage only)" y sin la opción de saltarse el 2FA.
