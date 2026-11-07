import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { autoTheme } from 'nexus-tours/themes'
import { TourBuilder } from 'nexus-tours/builder'

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E
if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embed')

type Emp = { id: number; nombre: string; puesto: string; estado: 'Activo' | 'Vacaciones' | 'Nuevo' }

// ---- "backend real" ficticio (en memoria) para que haya datos que proteger
const real: Emp[] = [
  { id: 1, nombre: 'Laura Hernández', puesto: 'Administración', estado: 'Activo' },
  { id: 2, nombre: 'Carlos Mendoza', puesto: 'Ventas', estado: 'Vacaciones' },
  { id: 3, nombre: 'Sofía Ramírez', puesto: 'Soporte', estado: 'Activo' },
]
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
  if (url.pathname === '/api/empleados') {
    if ((init?.method ?? 'GET') === 'POST') real.push({ id: real.length + 1, estado: 'Nuevo', ...JSON.parse(String(init!.body)) })
    return new Response(JSON.stringify(real), { headers: { 'content-type': 'application/json' } })
  }
  return nativeFetch(input, init)
}

// ---- la app
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const COLORS = ['#4263eb', '#0ca678', '#e8590c', '#7048e8', '#d6336c', '#1c7ed6']
let practice = false
async function cargar() {
  const rows = (await (await fetch('/api/empleados')).json()) as Emp[]
  $('filas').innerHTML = rows
    .map((r) => {
      const estado = r.estado ?? 'Nuevo' // en práctica el POST no trae estado
      const cls = estado === 'Vacaciones' ? 'v' : estado === 'Nuevo' ? 'n' : ''
      const ini = r.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
      return `<tr><td><div class="who"><span class="av" style="background:${COLORS[r.id % COLORS.length]}">${esc(ini)}</span>${esc(r.nombre)}</div></td><td>${esc(r.puesto ?? '—')}</td><td><span class="tag ${cls}">${esc(estado)}</span></td></tr>`
    })
    .join('')
  const n = (e: Emp['estado']) => rows.filter((r) => (r.estado ?? 'Nuevo') === e).length
  $('s-act').textContent = String(n('Activo'))
  $('s-vac').textContent = String(n('Vacaciones'))
  $('s-new').textContent = String(n('Nuevo'))
  $('origen').textContent = practice ? 'Modo práctica' : 'Datos reales'
  $('nota').textContent = practice ? 'Datos de ejemplo: nada de lo que hagas se guarda.' : 'Datos de la empresa (ficticios en esta demo).'
}

const modal = $<HTMLDialogElement>('modal')
function abrirModal() {
  if (modal.open) return
  $('form').hidden = true
  $('cargando').hidden = false
  modal.showModal()
  setTimeout(() => (($('cargando').hidden = true), ($('form').hidden = false), $<HTMLInputElement>('nombre').focus()), 600) // el formulario "carga" después
}
$('nuevo').addEventListener('click', abrirModal)
$('cancelar').addEventListener('click', () => modal.close())
$('form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const nombre = $<HTMLInputElement>('nombre').value.trim() || 'Nuevo empleado'
  await fetch('/api/empleados', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre, puesto: $<HTMLSelectElement>('puesto').value }) })
  $<HTMLInputElement>('nombre').value = ''
  modal.close()
  await cargar()
})

// ---- el recorrido
const common = () => ({
  theme: autoTheme(),
  celebrate: true,
  persist: { id: 'nexus-demo', version: 1 },
  labels: { next: 'Siguiente', previous: 'Atrás', done: 'Terminar', skip: 'Omitir', close: 'Cerrar', practice: 'Modo práctica · nada se guarda' },
  practice: {
    data: createFixtures(
      { empleados: { count: 5, fields: { id: fake.id(), nombre: fake.name(), puesto: fake.pick(['Ventas', 'Soporte', 'Diseño', 'Administración']), estado: fake.pick(['Activo', 'Activo', 'Vacaciones']) } } },
      { seed: 11, locale: 'es' },
    ),
    rest: { empleados: '/api/empleados' },
    latency: 90,
    onStart: () => ((practice = true), void cargar()),
    onEnd: () => ((practice = false), void cargar()),
  },
})
const pasos = () => [
  { icon: '👋', title: '¡Bienvenido a Nexus!', description: 'Te enseño a dar de alta a un empleado en 30 segundos. Es un ensayo: nada se guarda de verdad.' },
  { element: '#stats', title: 'Tu equipo de un vistazo', description: 'Estos números se actualizan solos cuando cambia la plantilla.', side: 'bottom' as const },
  { element: '#nuevo', title: 'Da de alta a alguien', description: 'Aquí empieza todo.', hint: 'Haz clic en “Nuevo empleado”', advanceOn: 'click' as const, hideNext: true },
  { element: '#nombre', title: 'Escribe el nombre', description: 'El formulario cargó después de abrir el modal y el recorrido esperó por él.', hint: 'Escribe al menos 3 letras', advanceOn: { event: 'input', delay: 700, when: (e: Event) => (e.target as HTMLInputElement).value.trim().length >= 3 }, hideNext: true },
  { element: '#guardar', title: 'Guarda', description: 'En modo práctica esto se queda en datos de ejemplo.', hint: 'Pulsa “Guardar”', advanceOn: { event: 'click', delay: 500 }, hideNext: true },
  { element: '#tabla', title: '¡Ahí está!', description: 'Tu empleado aparece en la lista. Al terminar, todo vuelve a como estaba.', side: 'top' as const },
  { icon: '🎉', title: '¡Eso es todo!', description: 'Así de fácil es guiar a tus usuarios con nexus-tours, una librería hecha por DevMedina.' },
]
let tour: Tour | null = null
function empezar() {
  tour?.destroy()
  tour = new Tour({ steps: pasos(), ...common() })
  void tour.start()
}
$('empezar').addEventListener('click', empezar)
$('reiniciar').addEventListener('click', () => {
  tour?.destroy()
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('nexus-tours:')) localStorage.removeItem(k) } catch { /* sin storage */ }
  real.length = 3
  void cargar()
})
let builder: TourBuilder | null = null
$('constructor').addEventListener('click', () => {
  builder?.destroy()
  builder = new TourBuilder({ id: 'nexus-demo', lang: 'es', theme: autoTheme(), tourOptions: { theme: autoTheme() } }).open()
})

void cargar()
