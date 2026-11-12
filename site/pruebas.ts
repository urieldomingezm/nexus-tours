// Mesa de pruebas: elegir tema, dirección y pantalla de celular, lanzar tours reales (con un modal que carga tarde, un paso que no
// existe y modo práctica) y armar un resumen para reportar.
import './comun'
import { Tour } from 'nexus-tours'
import { themes, autoTheme } from 'nexus-tours/themes'
import { createFixtures, fake } from 'nexus-tours/fixtures'

type TemaPrueba = 'auto' | 'light' | 'dark' | 'ocean' | 'bootstrap' | 'tailwind'
type Tema = (typeof themes)[keyof typeof themes]

const REPO = 'https://github.com/urieldomingezm/nexus-tours'
const NOMBRES: Record<TemaPrueba, string> = {
  auto: 'sigue la página',
  light: 'Claro',
  dark: 'Oscuro',
  ocean: 'Océano',
  bootstrap: 'Bootstrap',
  tailwind: 'Tailwind',
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const raiz = document.documentElement
const version = $('pruebas').dataset.version ?? ''

// ── Apariencia ──────────────────────────────────────────────────────────────
let tema: TemaPrueba = 'auto'
let dir: 'ltr' | 'rtl' = 'ltr'
let movil: 'auto' | 'always' = 'auto'

/** «Sigue la página»: el modo que eligió el botón Tema del encabezado o, si es automático, el del sistema. */
const dePagina = (): Tema => (raiz.dataset.tema === 'oscuro' ? themes.dark : raiz.dataset.tema === 'claro' ? themes.light : autoTheme())
const temaActual = (): Tema => (tema === 'auto' ? dePagina() : themes[tema])
const modoActual = (): string => (temaActual() === themes.dark ? 'oscuro' : tema === 'auto' || tema === 'light' ? 'claro' : 'propio del tema')

function pintar(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tema-prueba]')) b.setAttribute('aria-pressed', String(b.dataset.temaPrueba === tema))
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-dir-prueba]')) b.setAttribute('aria-pressed', String(b.dataset.dirPrueba === dir))
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-movil-prueba]')) b.setAttribute('aria-pressed', String(b.dataset.movilPrueba === movil))
  $('estado-apariencia').textContent = `El próximo tour sale con el tema ${NOMBRES[tema]} (${modoActual()}), ${dir === 'rtl' ? 'de derecha a izquierda' : 'de izquierda a derecha'} y ${movil === 'always' ? 'siempre como hoja inferior' : 'como hoja inferior solo en pantallas angostas'}.`
  armarResumen()
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tema-prueba]')) {
  b.addEventListener('click', () => {
    tema = b.dataset.temaPrueba as TemaPrueba
    pintar()
  })
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-dir-prueba]')) {
  b.addEventListener('click', () => {
    dir = b.dataset.dirPrueba as 'ltr' | 'rtl'
    pintar()
  })
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-movil-prueba]')) {
  b.addEventListener('click', () => {
    movil = b.dataset.movilPrueba as 'auto' | 'always'
    pintar()
  })
}
// El botón «Tema» del encabezado cambia el modo de la página: se refleja aquí.
new MutationObserver(pintar).observe(raiz, { attributes: true, attributeFilter: ['data-tema'] })

// ── Tours de prueba ─────────────────────────────────────────────────────────
const resultado = (texto: string): void => {
  $('resultado').textContent = texto
}
let activo: Tour | null = null
const ETIQUETAS = { next: 'Siguiente', previous: 'Atrás', done: 'Listo', close: 'Cerrar tour', progress: '{current} de {total}', practice: 'Modo práctica · nada se guarda', skip: 'Omitir' }
/** Opciones comunes: lo que se eligió arriba y los textos en español. */
const opciones = () => ({ theme: temaActual(), dir, mobile: movil, labels: ETIQUETAS })
function lanzar(tour: Tour, alTerminar?: () => void): void {
  activo?.destroy()
  activo = tour
  tour.on('end', () => alTerminar?.())
  void tour.start()
}

const modal = $<HTMLDialogElement>('modal-prueba')
function abrirModal(): void {
  const cuerpo = $('modal-cuerpo')
  cuerpo.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando formulario…' }))
  modal.showModal()
  // El formulario aparece después de abrir el modal: justo el caso que rompe a otras librerías. El tour debe esperarlo.
  setTimeout(() => {
    const et = Object.assign(document.createElement('label'), { htmlFor: 'prueba-nombre', textContent: 'Nombre' })
    const campo = Object.assign(document.createElement('input'), { id: 'prueba-nombre', type: 'text', autocomplete: 'off' })
    cuerpo.replaceChildren(et, campo)
  }, 700)
}
const cerrarModal = (): void => {
  if (modal.open) modal.close()
}
$('modal-cerrar').addEventListener('click', cerrarModal)

$('caso-pagina').addEventListener('click', () => {
  lanzar(
    new Tour({
      ...opciones(),
      steps: [
        { element: '#apariencia', title: 'Apariencia', description: 'Aquí eliges el tema, la dirección y la pantalla de celular.', side: 'bottom' },
        { element: '#botones', title: 'Casos de prueba', description: 'Cada botón lanza un tour distinto.', side: 'bottom' },
        { element: '#lista-revision', title: 'Qué revisar', description: 'Marca lo que probaste; queda guardado en tu navegador.', side: 'top' },
        { element: '#resumen', title: 'Tu resumen', description: 'Cópialo o ábrelo en un reporte.', side: 'top' },
      ],
    }),
    () => resultado('Tour sobre la página: terminó.'),
  )
  resultado('Tour sobre la página: en curso.')
})

$('caso-modal').addEventListener('click', () => {
  lanzar(
    new Tour({
      ...opciones(),
      steps: [
        { element: '#caso-modal', title: 'Empieza aquí', description: 'El siguiente paso abre un modal.' },
        {
          before: abrirModal,
          element: '#prueba-nombre',
          title: 'Ponle nombre',
          description: 'El formulario apareció 700 ms después de abrir el modal; el tour lo esperó.',
        },
        { element: '#prueba-guardar', title: 'Guarda', description: 'Al salir de este paso el modal se cierra solo.', after: cerrarModal },
      ],
    }),
    () => {
      cerrarModal()
      resultado('Tour con un modal: terminó.')
    },
  )
  resultado('Tour con un modal: en curso.')
})

$('caso-falta').addEventListener('click', () => {
  lanzar(
    new Tour({
      ...opciones(),
      steps: [
        { element: '#caso-falta', title: 'Paso 1', description: 'El paso 2 apunta a un elemento que no existe.' },
        { element: '#no-existe', title: 'Este no se verá', description: 'Se omite al agotar la espera.', waitTimeout: 800 },
        { title: 'Paso 3', description: 'El tour siguió sin trabarse.' },
      ],
    }),
    () => resultado('Paso que no existe: terminó; el paso 2 se omitió porque su elemento no existe.'),
  )
  resultado('Paso que no existe: en curso.')
})

$('caso-practica').addEventListener('click', () => {
  lanzar(
    new Tour({
      ...opciones(),
      practice: {
        data: createFixtures({ clientes: { count: 6, fields: { id: fake.id(), nombre: fake.name() } } }, { seed: 1 }),
        rest: { clientes: '/api/clientes' },
      },
      steps: [
        {
          title: 'Modo práctica',
          description: 'Mientras dure este tour, fetch responde con datos de ejemplo y las escrituras se bloquean.',
          before: async () => {
            const lista: unknown = await (await fetch('/api/clientes')).json()
            const escritura = await fetch('/api/pagos', { method: 'POST', body: '{}' })
            const filas = Array.isArray(lista) ? lista.length : '?'
            resultado(`Modo práctica: GET /api/clientes → ${filas} filas de ejemplo; POST /api/pagos → ${escritura.status}, bloqueado.`)
          },
        },
        { title: 'Listo', description: 'Al terminar, fetch vuelve a ser el de siempre.' },
      ],
    }),
    () => resultado('Modo práctica: terminó; fetch quedó restaurado.'),
  )
})

// ── Lista de revisión (se guarda en este navegador) ─────────────────────────
const REVISION: [string, string][] = [
  ['teclado', 'Con el teclado: las flechas y Enter avanzan, Esc cierra y el foco vuelve al botón que lanzó el tour.'],
  ['modal', 'En «Tour con un modal», el tour espera al formulario, lo resalta y sigue clicable aunque la página quede inerte.'],
  ['temas', 'Con cada tema (y en claro y oscuro), los colores cambian y nada queda ilegible.'],
  ['celular', 'En un teléfono (o con «Hoja inferior siempre») el tour sale como hoja inferior con botones grandes y se avanza deslizando.'],
  ['rtl', 'De derecha a izquierda, la tarjeta y las flechas se invierten sin romperse.'],
  ['zoom', 'Con el zoom al 200 %, el tour sigue pudiéndose leer y usar.'],
  ['movimiento', 'Con «reducir movimiento» activado en el sistema, no hay animaciones largas.'],
  ['practica', 'En «Modo práctica» se ve la píldora, el GET trae datos de ejemplo y el POST queda bloqueado.'],
  ['lector', 'Con un lector de pantalla (NVDA, VoiceOver, TalkBack) se anuncia el título de cada paso y «2 de 4».'],
  ['claridad', 'Los textos y botones se entienden sin explicación.'],
]
type Guardado = { marcas: Record<string, boolean>; notas: string }
const LLAVE = 'nt-pruebas'
const leer = (): Guardado => {
  try {
    return { marcas: {}, notas: '', ...JSON.parse(localStorage.getItem(LLAVE) ?? '{}') }
  } catch {
    return { marcas: {}, notas: '' }
  }
}
const datos = leer()
const guardar = (): void => {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(datos))
  } catch {
    /* sin almacenamiento: la lista vale solo para esta visita */
  }
}

const lista = $('lista-revision')
for (const [id, texto] of REVISION) {
  const li = document.createElement('li')
  const etiqueta = document.createElement('label')
  const caja = document.createElement('input')
  caja.type = 'checkbox'
  caja.id = `rev-${id}`
  caja.checked = !!datos.marcas[id]
  caja.addEventListener('change', () => {
    datos.marcas[id] = caja.checked
    guardar()
    armarResumen()
  })
  etiqueta.append(caja, ` ${texto}`)
  li.append(etiqueta)
  lista.append(li)
}
const notas = $<HTMLTextAreaElement>('notas')
notas.value = datos.notas
notas.addEventListener('input', () => {
  datos.notas = notas.value
  guardar()
  armarResumen()
})

// ── Resumen y reportes ──────────────────────────────────────────────────────
const resumen = $<HTMLTextAreaElement>('resumen')
function armarResumen(): void {
  const navegador = navigator.userAgent
  const lineas = [
    `nexus-tours ${version}`,
    `Navegador: ${navegador}`,
    `Ventana: ${innerWidth}×${innerHeight} (zoom del dispositivo ${devicePixelRatio})`,
    `Apariencia: tema ${NOMBRES[tema]} (${modoActual()}), ${dir === 'rtl' ? 'derecha a izquierda' : 'izquierda a derecha'}, celular ${movil === 'always' ? 'siempre' : 'según el ancho'}`,
    '',
    'Revisión:',
    ...REVISION.map(([id, texto]) => `[${datos.marcas[id] ? 'x' : ' '}] ${texto}`),
    '',
    `Notas: ${datos.notas.trim() || '(ninguna)'}`,
  ]
  resumen.value = lineas.join('\n')
  const corto = navegador.length > 120 ? `${navegador.slice(0, 117)}…` : navegador
  const url = (plantilla: string) => `${REPO}/issues/new?template=${plantilla}&version=${encodeURIComponent(version)}&navegador=${encodeURIComponent(corto)}`
  $<HTMLAnchorElement>('reportar-error').href = url('error.yml')
  $<HTMLAnchorElement>('reportar-ok').href = url('adopcion.yml')
}

$('copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resumen.value)
    resultado('Resumen copiado.')
  } catch {
    resumen.select()
    resultado('Selecciona el resumen y cópialo con Ctrl+C.')
  }
})
addEventListener('resize', armarResumen)

pintar()
