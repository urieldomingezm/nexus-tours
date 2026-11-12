// Buscador de la documentación: se abre con «/» o Ctrl/Cmd+K (o el botón de la cabecera). Usa el <dialog> nativo, flechas y Enter.
// El índice (páginas, encabezados y ejemplos) se genera en el build y se descarga solo la primera vez que se abre.

interface Entrada {
  t: string
  p: string
  d: string
  u: string
}

const normal = (t: string): string =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

let indice: (Entrada & { n: string })[] | null = null
let dialogo: HTMLDialogElement | null = null
let entrada: HTMLInputElement
let lista: HTMLUListElement
let aviso: HTMLElement
let resultados: Entrada[] = []
let activo = 0
let abridor: Element | null = null

async function cargarIndice(): Promise<void> {
  if (indice) return
  const { default: datos } = await import('virtual:indice-busqueda')
  indice = datos.map((e) => ({ ...e, n: normal(`${e.t} ${e.p} ${e.d}`) }))
}

function buscar(q: string): Entrada[] {
  if (!indice) return []
  const palabras = normal(q).split(/\s+/).filter(Boolean)
  // Sin texto: las páginas, para poder moverse sin escribir.
  if (!palabras.length) return indice.filter((e) => e.p === 'Página').slice(0, 10)
  const puntos: Array<[number, Entrada]> = []
  for (const e of indice) {
    if (!palabras.every((w) => e.n.includes(w))) continue
    const t = normal(e.t)
    let p = 0
    for (const w of palabras) p += t.startsWith(w) ? 4 : t.includes(w) ? 3 : 1
    if (e.p === 'Página') p += 2
    puntos.push([p, e])
  }
  return puntos.sort((a, b) => b[0] - a[0]).map(([, e]) => e).slice(0, 8)
}

function pintar(): void {
  lista.replaceChildren()
  resultados.forEach((r, i) => {
    const li = document.createElement('li')
    li.id = `busca-${i}`
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', String(i === activo))
    const fila = document.createElement('div') // sin enlace dentro: una opción no debe llevar nada interactivo
    const t = document.createElement('span')
    t.className = 'busca-t'
    t.textContent = r.t
    const p = document.createElement('span')
    p.className = 'busca-p'
    p.textContent = r.p
    fila.append(t, p)
    li.appendChild(fila)
    lista.appendChild(li)
  })
  entrada.setAttribute('aria-activedescendant', resultados.length ? `busca-${activo}` : '')
  aviso.textContent = resultados.length ? `${resultados.length} resultados` : entrada.value.trim() ? 'Sin resultados' : ''
  lista.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' })
}

function actualizar(): void {
  resultados = buscar(entrada.value)
  activo = 0
  pintar()
}

function construir(): HTMLDialogElement {
  const d = document.createElement('dialog')
  d.className = 'buscador'
  d.setAttribute('aria-label', 'Buscar en la documentación')
  d.innerHTML = `<div class="busca-caja">
    <input class="busca-entrada" type="text" role="combobox" aria-expanded="true" aria-controls="busca-lista" aria-autocomplete="list" aria-label="Buscar" placeholder="Buscar en la documentación…" autocomplete="off" spellcheck="false" />
    <ul id="busca-lista" class="busca-lista" role="listbox" aria-label="Resultados"></ul>
    <p class="busca-ayuda"><kbd>↑</kbd> <kbd>↓</kbd> para moverte · <kbd>Enter</kbd> para abrir · <kbd>Esc</kbd> para cerrar</p>
    <p class="busca-aviso" role="status"></p>
  </div>`
  entrada = d.querySelector('input')!
  lista = d.querySelector('ul')!
  aviso = d.querySelector('.busca-aviso')!
  entrada.addEventListener('input', actualizar)
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      d.close()
      return
    }
    if (!resultados.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      activo = (activo + (e.key === 'ArrowDown' ? 1 : resultados.length - 1)) % resultados.length
      pintar()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      location.href = resultados[activo].u
    }
  })
  lista.addEventListener('mousemove', (e) => {
    const li = (e.target as Element).closest('li')
    const i = li ? Number(li.id.replace('busca-', '')) : -1
    if (i >= 0 && i !== activo) {
      activo = i
      for (const [j, n] of [...lista.children].entries()) n.setAttribute('aria-selected', String(j === i))
      entrada.setAttribute('aria-activedescendant', `busca-${i}`)
    }
  })
  lista.addEventListener('click', (e) => {
    const li = (e.target as Element).closest('li')
    const i = li ? Number(li.id.replace('busca-', '')) : -1
    if (i >= 0) location.href = resultados[i].u
  })
  // Clic fuera de la caja (en el fondo) cierra.
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close()
  })
  d.addEventListener('close', () => {
    if (abridor instanceof HTMLElement && abridor.isConnected) abridor.focus()
  })
  document.body.appendChild(d)
  return d
}

async function abrir(): Promise<void> {
  abridor = document.activeElement
  dialogo ??= construir()
  if (dialogo.open) return
  dialogo.showModal()
  entrada.value = ''
  aviso.textContent = 'Cargando…'
  await cargarIndice()
  actualizar()
}

const escribiendo = (el: EventTarget | null): boolean => {
  const n = el as HTMLElement | null
  return !!n && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName))
}

document.addEventListener('keydown', (e) => {
  const atajo = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)
  const barra = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo(e.target)
  if (!atajo && !barra) return
  // No se abre encima de otro diálogo modal abierto (por ejemplo el del tour de práctica): ese tiene su propio teclado.
  if (document.querySelector('dialog[open]:not(.buscador)')) return
  e.preventDefault()
  void abrir()
})

document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('[data-buscar]')) void abrir()
})
