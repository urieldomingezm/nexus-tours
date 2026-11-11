// Plugin de Vite para el sitio de documentación: rellena los marcadores de las páginas HTML.
//   <!--@cabecera:guia-->   cabecera con el menú (la página activa va resaltada)
//   <!--@pie-->             pie de página
//   <!--@readme-->          README.md convertido a HTML (sin el índice, que lo reemplaza el menú lateral)
//   <!--@version-->         versión de package.json
//   <!--@tam:forms-->       tamaño min+gzip de dist/forms.js (necesita `npm run build` antes); `a+b` suma varios archivos
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { URL } from 'node:url'
import { transformSync } from 'esbuild'
import { Marked } from 'marked'

const REPO = 'https://github.com/urieldomingezm/nexus-tours'
const NPM = 'https://www.npmjs.com/package/nexus-tours'
const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const pkg = JSON.parse(leer('../package.json'))

const MENU = [
  ['inicio', 'index.html', 'Inicio'],
  ['guia', 'guia.html', 'Guía'],
  ['demo', 'demo.html', 'Demo'],
  ['api', 'api/index.html', 'API'],
]

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Misma regla que usa GitHub para los anclajes: así los enlaces del índice del README siguen funcionando. */
export const slug = (texto) =>
  texto
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-')

function enlace(href) {
  if (!href || /^(https?:|mailto:|#)/.test(href)) return href
  if (href.endsWith('api/nexus-tours.api.md')) return 'api/index.html'
  return `${REPO}/blob/main/${href.replace(/^\.\//, '')}`
}

function markdown() {
  const m = new Marked({ gfm: true })
  const usados = new Map()
  m.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens)
        const texto = tokens.map((t) => t.raw ?? t.text ?? '').join('')
        let id = slug(texto)
        const n = usados.get(id) ?? 0
        usados.set(id, n + 1)
        if (n) id += `-${n}`
        return `<h${depth} id="${id}"><a class="ancla" href="#${id}" aria-label="Enlace a esta sección">#</a>${html}</h${depth}>\n`
      },
      code({ text, lang }) {
        const l = (lang ?? '').split(/\s/)[0] || 'txt'
        return `<pre data-lang="${escapar(l)}"><code class="language-${escapar(l)}">${escapar(text)}</code></pre>\n`
      },
      table(t) {
        const cab = t.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')
        const filas = t.rows.map((f) => `<tr>${f.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('')
        return `<div class="tabla"><table><thead><tr>${cab}</tr></thead><tbody>${filas}</tbody></table></div>\n`
      },
      link({ href, title, tokens }) {
        const h = enlace(href)
        const externo = /^https?:/.test(h)
        return `<a href="${escapar(h)}"${title ? ` title="${escapar(title)}"` : ''}${externo ? ' rel="noopener"' : ''}>${this.parser.parseInline(tokens)}</a>`
      },
    },
  })
  return m
}

/** README sin la cabecera centrada (la reemplaza la portada) y sin el índice (lo reemplaza el menú lateral). */
function readmeHtml() {
  let md = leer('../README.md')
  md = md.replace(/^<div align="center">[\s\S]*?<\/div>\s*---\s*/, '')
  md = md.replace(/## Índice[\s\S]*?(?=\n## 1\.)/, '')
  return markdown().parse(md)
}

const tamano = (ruta) => {
  if (!existsSync(ruta)) return null
  const min = transformSync(readFileSync(ruta, 'utf8'), { minify: true, format: 'esm' }).code
  return gzipSync(min).length / 1024
}
const kb = (n) => (n === null ? '—' : `${n.toFixed(1)} KB`)

function cabecera(activa) {
  const enlaces = MENU.map(
    ([id, href, texto]) => `<a href="${href}"${id === activa ? ' aria-current="page"' : ''}>${texto}</a>`,
  ).join('')
  return `<header class="cabecera">
  <a class="marca" href="index.html"><span class="logo" aria-hidden="true"></span>nexus-tours</a>
  <button type="button" class="menu-btn" aria-expanded="false" aria-controls="menu-principal" aria-label="Menú"><span aria-hidden="true"></span></button>
  <nav id="menu-principal" aria-label="Principal">${enlaces}<a class="solo-movil" href="${REPO}" rel="noopener">GitHub</a><a class="solo-movil" href="${NPM}" rel="noopener">npm</a></nav>
  <div class="herr">
    <a class="ico-enlace" href="${REPO}" rel="noopener">GitHub</a>
    <a class="ico-enlace" href="${NPM}" rel="noopener">npm</a>
    <button type="button" class="tema" data-tema title="Cambiar entre automático, claro y oscuro"></button>
  </div>
</header>`
}

const ICONO =
  '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27%236d28d9%27/%3E%3C/svg%3E" />'

const pie = () => `<footer class="pie">
  <p><strong>nexus-tours</strong> v${pkg.version}. Licencia MIT. Hecho por <a href="https://devmedina.is-a.dev/" rel="noopener">DevMedina</a>, rama de librerías de Nexus.</p>
  <nav aria-label="Pie de página">
    <a href="${REPO}" rel="noopener">Código</a>
    <a href="${NPM}" rel="noopener">npm</a>
    <a href="${REPO}/blob/main/CHANGELOG.md" rel="noopener">Cambios</a>
    <a href="${REPO}/issues" rel="noopener">Reportar un problema</a>
  </nav>
</footer>`

export function docsPlugin() {
  return {
    name: 'nexus-tours-docs',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!--@')) return html
        return html
          .replace('</head>', `    ${ICONO}\n  </head>`)
          .replace(/<!--@cabecera:(\w+)-->/g, (_, id) => cabecera(id))
          .replace(/<!--@pie-->/g, pie())
          .replace(/<!--@readme-->/g, () => readmeHtml())
          .replace(/<!--@version-->/g, pkg.version)
          .replace(/<!--@tam:([\w.+-]+)-->/g, (_, a) => kb(a.split('+').map((x) => tamano(`dist/${x}.js`)).reduce((s, n) => (s === null || n === null ? null : s + n), 0)))
      },
    },
  }
}
