// «Míralo en acción»: un tour de muestra sobre una pantalla de mentira. Es una maqueta (no usa la librería): el cursor recorre los pasos
// solo y, en cuanto alguien toca la maqueta, queda en sus manos. Con «reducir movimiento» no se mueve nada sin que lo pidas.
import { decorarCodigo } from './comun'

type Escena = 'modal' | 'practica' | 'checklist'
interface Paso {
  sel: string
  titulo: string
  texto: string
  /** Lo que pasa al llegar a este paso: abre o cierra el modal de la maqueta, o marca puntos de la lista. */
  antes?: 'abrir' | 'cerrar'
  marca?: number
}

const ESCENAS: Escena[] = ['modal', 'practica', 'checklist']
const PASOS: Record<Escena, Paso[]> = {
  modal: [
    { sel: '#mira-nuevo', titulo: 'Crea un cliente', texto: 'Empieza aquí. El tour abrirá el modal por ti.' },
    { sel: '#mira-nombre', titulo: 'Ponle nombre', texto: 'El modal tardó en aparecer y el tour lo esperó.', antes: 'abrir' },
    { sel: '#mira-guardar', titulo: 'Guarda', texto: 'Al terminar, el tour cierra el modal.' },
  ],
  practica: [
    { sel: '#mira-nuevo', titulo: 'Modo práctica', texto: 'Los datos son de ejemplo: nada de lo que hagas sale del navegador.' },
    { sel: '#mira-correo', titulo: 'Escribe lo que quieras', texto: 'Las peticiones se responden desde memoria.', antes: 'abrir' },
    { sel: '#mira-guardar', titulo: 'Guarda sin riesgo', texto: 'La escritura real se bloquea y la persona ve que funcionó.' },
  ],
  checklist: [
    { sel: '[data-item="1"]', titulo: 'Crea tu primer cliente', texto: 'Cada elemento de la lista lanza su propio tour.', antes: 'cerrar', marca: 0 },
    { sel: '[data-item="2"]', titulo: 'Envía una factura', texto: 'El avance se recuerda para cada persona.', marca: 1 },
    { sel: '[data-item="3"]', titulo: 'Lee la documentación', texto: 'Terminar el tour marca el elemento como hecho.', marca: 2 },
  ],
}
const AVISO_FINAL: Record<Escena, string> = {
  modal: 'Tour terminado: el modal se cerró solo',
  practica: 'Modo práctica: no se guardó nada real',
  checklist: 'Primeros pasos completos',
}
const CODIGO: Record<Escena, string> = {
  modal: `import { Tour } from 'nexus-tours'

new Tour({
  steps: [
    { element: '#nuevo', title: 'Crea un cliente', before: abrirModal },
    { element: '#nombre', title: 'Ponle nombre' },
    { element: '#guardar', title: 'Guarda', after: cerrarModal },
  ],
}).start()`,
  practica: `import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'

new Tour({
  steps,
  practice: {
    data: createFixtures({ clientes: { count: 6, fields: { nombre: fake.name() } } }, { seed: 1 }),
    rest: { clientes: '/api/clientes' },
  },
}).start()`,
  checklist: `import { Checklist } from 'nexus-tours/checklist'

new Checklist({
  id: 'onboarding',
  items: [
    { id: 'cliente', title: 'Crea tu primer cliente', tour: pasosCliente },
    { id: 'factura', title: 'Envía una factura', tour: pasosFactura },
    { id: 'docs', title: 'Lee la documentación', onSelect: () => open('/docs') },
  ],
}).mount()`,
}

const $ = <T extends HTMLElement>(q: string): T | null => document.querySelector<T>(q)
const pantalla = $('.mira-pantalla')
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)')

class Cancelado extends Error {}
let ciclo = 0 // sube cada vez que alguien toma la maqueta: la animación se corta
let automatico = !sinMovimiento.matches
let escena: Escena = 'modal'
let indice = 0
let hecho = 0 // cuántos elementos de la lista están marcados
let avisoId = 0
let visible = true
let pausas: Array<() => void> = []
const activos = new Set<() => void>()

const pausado = (): boolean => !visible || document.hidden
function reanudar(): void {
  if (pausado()) return
  const p = pausas
  pausas = []
  for (const f of p) f()
}

/** Espera `ms` (quieta mientras la maqueta no se vea). Se corta al instante si alguien la toma. */
function esperar(token: number, ms: number): Promise<void> {
  return new Promise<void>((res, rej) => {
    if (token !== ciclo) return rej(new Cancelado())
    const seguir = (): void => {
      activos.delete(cancelar)
      if (token === ciclo) res()
      else rej(new Cancelado())
    }
    const t = setTimeout(() => (pausado() ? pausas.push(seguir) : seguir()), ms)
    const cancelar = (): void => {
      clearTimeout(t)
      activos.delete(cancelar)
      pausas = pausas.filter((f) => f !== seguir)
      rej(new Cancelado())
    }
    activos.add(cancelar)
  })
}

const foco = pantalla?.querySelector<HTMLElement>('.mira-foco') ?? null
const paso = pantalla?.querySelector<HTMLElement>('.mira-paso') ?? null
const repetir = pantalla?.querySelector<HTMLButtonElement>('.mira-repetir') ?? null
const modal = pantalla?.querySelector<HTMLElement>('#mira-modal') ?? null
const toast = pantalla?.querySelector<HTMLElement>('.mira-toast') ?? null
const cursor = pantalla?.querySelector<HTMLElement>('.mira-cursor') ?? null
const estado = $('#mira-estado')
const panelCodigo = $('.mira-codigo pre')

function mostrarCodigo(e: Escena): void {
  if (!panelCodigo) return
  panelCodigo.querySelector('button.copiar')?.remove()
  panelCodigo.removeAttribute('data-listo')
  const c = panelCodigo.querySelector('code')
  if (c) c.textContent = CODIGO[e]
  decorarCodigo(panelCodigo.parentElement!)
}

function marcarEscena(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-escena]')) b.setAttribute('aria-pressed', String(b.dataset.escena === escena))
}

function aviso(texto: string): void {
  if (!toast) return
  const id = ++avisoId
  toast.querySelector('span')!.textContent = texto
  toast.removeAttribute('inert')
  toast.classList.add('visible')
  setTimeout(() => {
    if (id !== avisoId) return
    toast.classList.remove('visible')
    toast.setAttribute('inert', '')
  }, 2600)
}

function pintarLista(): void {
  for (const it of pantalla?.querySelectorAll<HTMLElement>('.mira-item') ?? []) it.classList.toggle('hecho', Number(it.dataset.item) <= hecho)
}

/** Pone el foco sobre el elemento del paso y el globo al lado, dentro de la pantalla. */
function colocar(): void {
  if (!pantalla || !foco || !paso) return
  const p = PASOS[escena][indice]
  const objetivo = pantalla.querySelector<HTMLElement>(p.sel)
  if (!objetivo) return
  const a = pantalla.getBoundingClientRect()
  const o = objetivo.getBoundingClientRect()
  const m = 6
  foco.style.cssText = `left:${o.left - a.left - m}px;top:${o.top - a.top - m}px;width:${o.width + 2 * m}px;height:${o.height + 2 * m}px`
  const w = Math.min(280, a.width - 16)
  paso.style.width = `${w}px`
  const alto = paso.offsetHeight
  const izq = Math.max(8, Math.min(a.width - w - 8, o.left - a.left + o.width / 2 - w / 2))
  const abajo = o.bottom - a.top + m + 10
  const arriba = o.top - a.top - m - 10 - alto
  const y = abajo + alto + 8 <= a.height ? abajo : Math.max(8, arriba)
  paso.style.left = `${izq}px`
  paso.style.top = `${y}px`
}

function mostrar(): void {
  if (!paso || !foco) return
  const lista = PASOS[escena]
  const p = lista[indice]
  // El estado de la maqueta se deduce del paso en el que se está, así «Anterior» también deja todo como estaba.
  let abierto = false
  hecho = 0
  for (const q of lista.slice(0, indice + 1)) {
    if (q.antes === 'abrir') abierto = true
    if (q.antes === 'cerrar') abierto = false
    if (q.marca !== undefined) hecho = q.marca
  }
  modal?.classList.toggle('abierto', abierto)
  pintarLista()
  paso.querySelector('.mira-n')!.textContent = `Paso ${indice + 1} de ${lista.length}`
  paso.querySelector('.mira-t')!.textContent = p.titulo
  paso.querySelector('.mira-x')!.textContent = p.texto
  paso.querySelector<HTMLButtonElement>('[data-accion=atras]')!.disabled = indice === 0
  paso.querySelector<HTMLElement>('[data-accion=siguiente]')!.textContent = indice === lista.length - 1 ? 'Terminar' : 'Siguiente'
  paso.hidden = false
  foco.hidden = false
  if (repetir) repetir.hidden = true
  if (estado) estado.textContent = `Paso ${indice + 1} de ${lista.length}: ${p.titulo}. ${p.texto}`
  colocar()
}

function abrirEscena(e: Escena): void {
  if (e !== escena) mostrarCodigo(e)
  escena = e
  indice = 0
  hecho = 0
  modal?.classList.remove('abierto')
  marcarEscena()
  mostrar()
}

/** Cierra el tour: se quita el foco y el globo, y queda un botón para repetirlo. */
function cerrar(): void {
  if (!paso || !foco) return
  paso.hidden = true
  foco.hidden = true
  modal?.classList.remove('abierto')
  if (repetir) repetir.hidden = false
}

function terminar(): void {
  aviso(AVISO_FINAL[escena])
  if (escena === 'checklist') {
    hecho = 3
    pintarLista()
  }
  cerrar()
}

function accionar(accion: string): void {
  const n = PASOS[escena].length
  if (accion === 'siguiente') {
    if (indice >= n - 1) return terminar()
    indice++
    mostrar()
  } else if (accion === 'atras') {
    if (indice === 0) return
    indice--
    mostrar()
  } else if (accion === 'salir') cerrar()
  else if (accion === 'repetir') abrirEscena(escena)
}

function detener(): void {
  if (!automatico) return
  automatico = false
  ciclo++
  cursor?.classList.remove('visible')
  for (const c of [...activos]) c()
}

pantalla?.addEventListener('pointerdown', detener)
pantalla?.addEventListener('keydown', detener)
pantalla?.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button[data-accion]')
  if (b) accionar(b.dataset.accion!)
})
pantalla?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && paso && !paso.hidden) cerrar()
})
addEventListener('resize', () => {
  if (paso && !paso.hidden) colocar()
})

function moverCursor(objetivo: Element): void {
  if (!pantalla || !cursor) return
  const p = pantalla.getBoundingClientRect()
  const o = objetivo.getBoundingClientRect()
  cursor.style.transform = `translate(${o.left - p.left + o.width * 0.6}px, ${o.top - p.top + o.height * 0.6}px)`
}

async function pulsar(token: number, accion: string): Promise<void> {
  const b = paso?.querySelector(`[data-accion="${accion}"]`)
  if (!b) return
  moverCursor(b)
  await esperar(token, 900)
  b.classList.add('pulsa')
  await esperar(token, 220)
  b.classList.remove('pulsa')
  accionar(accion)
}

/** El cursor recorre todos los pasos de la escena. */
async function interpretar(token: number): Promise<void> {
  cursor?.classList.add('visible')
  await esperar(token, 500)
  for (let i = 0; i < PASOS[escena].length; i++) {
    await pulsar(token, 'siguiente')
    await esperar(token, 700)
  }
  cursor?.classList.remove('visible')
}

/** Elegir una escena la reproduce una vez (si hay movimiento) y luego queda en el primer paso, lista para llevarla uno mismo. */
function elegir(e: Escena): void {
  for (const c of [...activos]) c()
  automatico = false
  ciclo++
  avisoId++
  toast?.classList.remove('visible')
  toast?.setAttribute('inert', '')
  cursor?.classList.remove('visible')
  abrirEscena(e)
  if (sinMovimiento.matches) return
  automatico = true
  void (async (token: number) => {
    try {
      await esperar(token, 900)
      await interpretar(token)
      await esperar(token, 1200)
      automatico = false
      abrirEscena(e)
    } catch (err) {
      if (!(err instanceof Cancelado)) throw err
    }
  })(ciclo)
}

for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-escena]')) b.addEventListener('click', () => elegir(b.dataset.escena as Escena))

/** La invitación: al cargar, la maqueta recorre las tres escenas una tras otra hasta que alguien la toque. */
async function reproducir(token: number): Promise<void> {
  try {
    for (let i = 0; token === ciclo; i = (i + 1) % ESCENAS.length) {
      abrirEscena(ESCENAS[i])
      await interpretar(token)
      await esperar(token, 1500)
    }
  } catch (e) {
    if (!(e instanceof Cancelado)) throw e
    // Alguien la tomó a media animación: queda en el paso en el que estaba (o cerrada, con su botón para repetir).
    if (paso?.hidden && repetir?.hidden) abrirEscena(escena)
  }
}

if (pantalla) {
  new IntersectionObserver((es) => {
    visible = es[0]?.isIntersecting ?? true
    reanudar()
    if (visible && paso && !paso.hidden) colocar()
  }).observe(pantalla)
  document.addEventListener('visibilitychange', reanudar)
  abrirEscena('modal')
  if (automatico) void reproducir(ciclo)
}
