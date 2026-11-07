# Avisos de componentes de terceros

**nexus-tours** no tiene dependencias en tiempo de ejecución: el código que se publica en npm (`dist/`) es propio
(© 2026 Angel Uriel Domínguez Medina, DevMedina, licencia MIT; ver [`LICENSE`](./LICENSE)).

Los componentes de abajo se usan **solo** en el sitio de documentación, en la demo o en las pruebas, y conservan
sus propias licencias y derechos de autor.

| Componente | Dónde se usa | Licencia |
|---|---|---|
| [Bootstrap Icons](https://github.com/twbs/icons) © The Bootstrap Authors | `demo/` (fuente de íconos incluida en `demo-dist/`) | MIT |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) © Supabase | Pruebas del adaptador Supabase | MIT |
| [axios](https://github.com/axios/axios) © Matt Zabriskie & colaboradores | Pruebas de la interceptación de XHR | MIT |
| [Vue](https://github.com/vuejs/core) © Evan You | Pruebas del wrapper de Vue | MIT |
| [React](https://github.com/facebook/react) © Meta Platforms, Inc. | Pruebas del wrapper de React | MIT |
| [Playwright](https://github.com/microsoft/playwright) © Microsoft Corporation | Pruebas de extremo a extremo | Apache-2.0 |
| [Vite](https://github.com/vitejs/vite) © VoidZero Inc. y colaboradores | Compilación | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) © Microsoft Corporation | Compilación y tipos | Apache-2.0 |

Si redistribuyes la carpeta `demo-dist/` (que incluye la fuente de Bootstrap Icons), conserva este aviso junto a ella.
Los textos completos de cada licencia están en el paquete de cada componente dentro de `node_modules/`.
