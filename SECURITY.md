# Seguridad

## Versiones con soporte

Mientras la librería esté en 0.x, solo la última versión menor publicada recibe correcciones de seguridad.

| Versión | Soporte |
|---|---|
| 0.x más reciente | ✅ |
| Anteriores | ❌ (actualiza a la más reciente) |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub: pestaña **Security → Report a vulnerability** del repositorio. Si no está disponible, contacta al autor desde https://devmedina.is-a.dev/.

Incluye la versión afectada, los pasos para reproducirla y su impacto. Recibirás respuesta en un máximo de 7 días. Cuando se publique la corrección se te dará crédito, si así lo quieres.

## Qué cuida la librería

- **Textos como texto.** `title`, `description`, `hint` y los `labels` nunca se interpretan como HTML. `content` acepta nodos que tú creas o texto plano.
- **Imágenes.** `image` solo acepta `http(s):`, `data:image/…` y rutas relativas; nunca `javascript:`.
- **Aislamiento.** El tour vive en un shadow root, así que el CSS de la página no lo altera ni el suyo se filtra a la página.
- **CSP.** Con navegadores que soportan hojas de estilo construibles, los estilos del tour no usan etiquetas `<style>`. Las únicas que se agregan (estilos en navegadores sin esa función y las reglas `@font-face` de la opción `fonts`) llevan el `nonce` que indiques.
- **Modo práctica.** Por defecto bloquea las escrituras reales (POST/PUT/PATCH/DELETE) que no tengan una ruta de práctica y solo intercepta mientras el tour está activo. Las llamadas de autenticación de Supabase pasan al servidor real.
- **Sin dependencias** en tiempo de ejecución.
