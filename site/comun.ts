// Lo que comparten todas las páginas: tema, resaltado de código, botón «Copiar» y menú lateral.
import './estilos.css'

// ── Tema (automático, claro u oscuro) ───────────────────────────────────────
type Tema = 'auto' | 'claro' | 'oscuro'
const TEMAS: Tema[] = ['auto', 'claro', 'oscuro']
const ETIQUETA: Record<Tema, string> = { auto: 'Auto', claro: 'Claro', oscuro: 'Oscuro' }

function guardado(): Tema {
  try {
    const t = localStorage.getItem('nd-tema')
    return TEMAS.includes(t as Tema) ? (t as Tema) : 'auto'
  } catch {
    return 'auto'
  }
}

function aplicar(t: Tema): void {
  const raiz = document.documentElement
  if (t === 'auto') delete raiz.dataset.tema
  else raiz.dataset.tema = t
  for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-tema]')) b.textContent = `Tema: ${ETIQUETA[t]}`
}

aplicar(guardado())
document.addEventListener('click', (e) => {
  const b = (e.target as Element).closest('button[data-tema]')
  if (!b) return
  const siguiente = TEMAS[(TEMAS.indexOf(guardado()) + 1) % TEMAS.length]
  try {
    localStorage.setItem('nd-tema', siguiente)
  } catch {
    /* sin almacenamiento: el tema vale solo para esta visita */
  }
  aplicar(siguiente)
})

// ── Resaltado de código (mínimo, sin dependencias) ──────────────────────────
const PALABRAS =
  'import export from const let var function async await return if else for while of in new class extends interface type as default true false null undefined typeof void throw try catch finally switch case break continue this static readonly public private'
const RX = new RegExp(
  [
    '(?<c>\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|<!--[\\s\\S]*?-->|^#[^\\n]*)',
    '(?<s>`(?:\\\\[\\s\\S]|[^`\\\\])*`|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')',
    '(?<t><\\/?[A-Za-z][\\w-]*)',
    `(?<k>\\b(?:${PALABRAS.split(' ').join('|')})\\b)`,
    '(?<n>\\b\\d[\\d_.]*\\b)',
  ].join('|'),
  'gm',
)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function resaltar(texto: string, lang: string): string {
  if (!/^(ts|tsx|js|jsx|typescript|javascript|json|html|vue|css|bash|sh|txt)?$/.test(lang) && lang !== '') return esc(texto)
  if (lang === 'txt') return esc(texto)
  const sinTags = lang === 'json' || lang === 'bash' || lang === 'sh' || lang === 'css'
  let salida = ''
  let ultimo = 0
  for (const m of texto.matchAll(RX)) {
    const g = m.groups!
    const clase = g.c ? 'c' : g.s ? 's' : g.t ? (sinTags ? '' : 't') : g.k ? (lang === 'json' ? '' : 'k') : g.n ? 'n' : ''
    salida += esc(texto.slice(ultimo, m.index))
    salida += clase ? `<span class="tk-${clase}">${esc(m[0])}</span>` : esc(m[0])
    ultimo = m.index! + m[0].length
  }
  return salida + esc(texto.slice(ultimo))
}

export function decorarCodigo(raiz: ParentNode = document): void {
  for (const pre of raiz.querySelectorAll<HTMLPreElement>('pre[data-lang]:not([data-listo])')) {
    pre.dataset.listo = '1'
    const code = pre.querySelector('code')!
    const texto = code.textContent ?? ''
    code.innerHTML = resaltar(texto, pre.dataset.lang ?? '')
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'copiar'
    b.textContent = 'Copiar'
    b.setAttribute('aria-label', 'Copiar el código')
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(texto)
        b.textContent = 'Copiado'
      } catch {
        b.textContent = 'No se pudo'
      }
      setTimeout(() => (b.textContent = 'Copiar'), 1500)
    })
    pre.appendChild(b)
  }
}

// ── Botones de copiar para texto suelto (data-copiar="...") ─────────────────
document.addEventListener('click', async (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-copiar]')
  if (!b) return
  const antes = b.textContent
  try {
    await navigator.clipboard.writeText(b.dataset.copiar ?? '')
    b.textContent = 'Copiado'
  } catch {
    b.textContent = 'No se pudo'
  }
  setTimeout(() => (b.textContent = antes), 1500)
})

// ── Menú lateral con los títulos de la página ───────────────────────────────
function menuLateral(): void {
  const destino = document.querySelector<HTMLElement>('[data-toc]')
  const cont = document.querySelector<HTMLElement>('.contenido')
  if (!destino || !cont) return
  const titulos = [...cont.querySelectorAll<HTMLElement>('h2[id], h3[id]')]
  const ul = document.createElement('ul')
  for (const t of titulos) {
    const li = document.createElement('li')
    li.className = t.tagName.toLowerCase()
    const a = document.createElement('a')
    a.href = `#${t.id}`
    a.textContent = (t.textContent ?? '').replace(/^#/, '')
    li.appendChild(a)
    ul.appendChild(li)
  }
  destino.appendChild(ul)
  const movil = document.createElement('details')
  movil.className = 'toc-movil'
  movil.innerHTML = '<summary>En esta página</summary>'
  movil.appendChild(ul.cloneNode(true))
  cont.insertBefore(movil, cont.querySelector('h1')?.nextSibling ?? cont.firstChild)
  if (!('IntersectionObserver' in window)) return
  const enlaces = new Map(titulos.map((t) => [t.id, ul.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(t.id)}"]`)!]))
  const visibles = new Set<string>()
  const obs = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (e.isIntersecting) visibles.add(e.target.id)
        else visibles.delete(e.target.id)
      }
      const primero = titulos.find((t) => visibles.has(t.id))
      for (const [id, a] of enlaces) {
        if (id === primero?.id) a.setAttribute('aria-current', 'true')
        else a.removeAttribute('aria-current')
      }
    },
    { rootMargin: '-70px 0px -70% 0px' },
  )
  titulos.forEach((t) => obs.observe(t))
}

// ── Menú de la cabecera en pantallas chicas ─────────────────────────────────
function menuMovil(): void {
  const cab = document.querySelector<HTMLElement>('.cabecera')
  const btn = cab?.querySelector<HTMLButtonElement>('.menu-btn')
  if (!cab || !btn) return
  const poner = (abierto: boolean) => {
    cab.classList.toggle('abierto', abierto)
    btn.setAttribute('aria-expanded', String(abierto))
  }
  btn.addEventListener('click', () => poner(btn.getAttribute('aria-expanded') !== 'true'))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cab.classList.contains('abierto')) {
      poner(false)
      btn.focus()
    }
  })
  cab.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => poner(false)))
}

decorarCodigo()
menuLateral()
menuMovil()
