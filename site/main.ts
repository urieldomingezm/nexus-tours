import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { themes, autoTheme } from 'nexus-tours/themes'
import { Checklist } from 'nexus-tours/checklist'
import { TourBuilder } from 'nexus-tours/builder'

type Lang = 'es' | 'en'
const T: Record<string, [string, string]> = {
  nav_demo: ['Demo', 'Demo'], nav_use: ['Uso', 'Usage'],
  h1: ['Tours que no se rompen con modales.', "Tours that don't break with modals."],
  lead: ['Guías de producto sin dependencias (~8 KB). Esperan a que el modal exista, viven dentro del <dialog>, no chocan con tu CSS y dejan practicar con datos de ejemplo.', 'Zero-dependency product tours (~8 KB). They wait for the modal to exist, live inside the <dialog>, never clash with your CSS and let users practice on example data.'],
  try: ['Probar el tour', 'Try the tour'], howto: ['Cómo se usa', 'How to use'],
  f1t: ['Modales de verdad', 'Real modals'], f1d: ['Espera elementos animados o asíncronos, se monta dentro del <dialog> y se recupera si el modal se cierra y reabre.', 'Waits for animated or async elements, mounts inside the <dialog> and recovers if the modal closes and reopens.'],
  f2t: ['Aislado de tu CSS', 'Isolated from your CSS'], f2d: ['Shadow DOM: tu página no lo rompe ni él rompe tu página. Personalízalo con variables, ::part() y temas.', "Shadow DOM: your page can't break it and it can't break your page. Customize with variables, ::part() and themes."],
  f3t: ['Modo práctica', 'Practice mode'], f3d: ['Responde fetch con datos de ejemplo y bloquea escrituras reales mientras el usuario aprende.', 'Answers fetch with example data and blocks real writes while the user learns.'],
  f4t: ['Accesible', 'Accessible'], f4d: ['Foco atrapado y restaurado, anuncios para lector de pantalla, teclado, RTL y movimiento reducido.', 'Focus trapped and restored, screen-reader announcements, keyboard, RTL and reduced motion.'],
  f5t: ['Vue y React', 'Vue & React'], f5d: ['Wrappers de ~1 KB: componente y hook/composable, seguros con StrictMode.', '~1 KB wrappers: component and hook/composable, StrictMode-safe.'],
  f6t: ['Ligero', 'Tiny'], f6d: ['Núcleo ~8 KB gzip, datos de ejemplo 2 KB, temas 0.5 KB, sin dependencias.', 'Core ~8 KB gzip, example data 2 KB, themes 0.5 KB, no dependencies.'],
  demo_h: ['Pruébalo aquí', 'Try it here'], demo_s: ['El mini CRM de la derecha tiene un modal animado con contenido que carga después: el caso que rompe a otras librerías.', 'The mini CRM on the right has an animated modal whose content loads later: the case that breaks other libraries.'],
  start: ['▶ Iniciar tour', '▶ Start tour'], c_practice: ['Modo práctica', 'Practice mode'], c_theme: ['Tema', 'Theme'], c_font: ['Fuente', 'Font'], font_sys: ['Sistema', 'System'], font_inh: ['Heredar', 'Inherit'],
  c_arrow: ['Flecha', 'Arrow'], c_rtl: ['Derecha a izquierda', 'Right-to-left'],
  c_note: ['Con modo práctica activo, guardar un cliente no toca los datos reales; al terminar el tour todo vuelve.', 'With practice mode on, saving a client never touches the real data; when the tour ends everything is back.'],
  new: ['Nuevo cliente', 'New client'], th_name: ['Nombre', 'Name'], th_status: ['Estado', 'Status'],
  use_h: ['Uso', 'Usage'], foot: ['Hecho por Uriel Domínguez · rama de librerías de Nexus · MIT', 'By Uriel Domínguez · Nexus libraries branch · MIT'],
  m_title: ['Nuevo cliente', 'New client'], m_loading: ['Cargando formulario…', 'Loading form…'], m_name: ['Nombre', 'Name'], m_cancel: ['Cancelar', 'Cancel'], m_save: ['Guardar', 'Save'],
  src_real: ['Mostrando datos reales (simulados en esta página).', 'Showing real data (simulated on this page).'],
  src_practice: ['Modo práctica: datos de ejemplo, nada se guarda.', 'Practice mode: example data, nothing is saved.'],
  s1t: ['Crea un cliente', 'Create a client'], s1d: ['Todo empieza aquí.', 'Everything starts here.'],
  s2t: ['Ponle nombre', 'Name it'], s2d: ['El formulario cargó después de abrir el modal; el tour esperó por él.', 'The form loaded after the modal opened; the tour waited for it.'],
  s3t: ['Guarda', 'Save'], s3d: ['En modo práctica esto no se guarda de verdad.', 'In practice mode this is not really saved.'],
  s4t: ['Tu lista', 'Your list'], s4d: ['Aquí aparecen los clientes.', 'Clients show up here.'],
  c_check: ['Checklist', 'Checklist'], ck_title: ['Primeros pasos', 'Getting started'],
  ck_a: ['Crea tu primer cliente', 'Create your first client'], ck_ad: ['Recorrido de 4 pasos', '4-step walkthrough'],
  ck_b: ['Conoce tu lista', 'Meet your list'], ck_c: ['Prueba el modo práctica', 'Try practice mode'], ck_cd: ['Actívalo en el panel', 'Turn it on in the panel'],
  ck_complete: ['¡Listo! Ya viste todo.', 'All done! You have seen everything.'], ck_start: ['Empezar', 'Start'], ck_review: ['Repetir', 'Replay'], ck_reset: ['Reiniciar', 'Reset'], ck_hide: ['Ocultar', 'Hide'],
  ck_open: ['Abrir checklist', 'Open checklist'], ck_close: ['Cerrar', 'Close'], ck_completed: ['completado', 'completed'], ck_pending: ['pendiente', 'pending'],
  builder: ['🛠 Constructor visual', '🛠 Visual builder'],
  skip: ['Omitir', 'Skip'],
  next: ['Siguiente', 'Next'], previous: ['Atrás', 'Back'], done: ['Listo', 'Done'], close: ['Cerrar tour', 'Close tour'], practiceLbl: ['Modo práctica · nada se guarda', 'Practice mode · nothing is saved'],
}
let lang: Lang = (localStorage.getItem('nt-lang') as Lang) || (navigator.language.startsWith('es') ? 'es' : 'en')
const tr = (k: string) => T[k]![lang === 'es' ? 0 : 1]

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E

// ---- a tiny fake "real backend" so the demo has data to show and to protect
const real = [
  { id: 1, name: 'Globex', status: 'Active' },
  { id: 2, name: 'Initech', status: 'Pending' },
]
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
  if (url.pathname === '/api/clients') {
    if ((init?.method ?? 'GET') === 'POST') real.push({ id: real.length + 1, status: 'New', ...JSON.parse(String(init!.body)) })
    return new Response(JSON.stringify(real), { headers: { 'content-type': 'application/json' } })
  }
  return nativeFetch(input, init)
}

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
let practiceOn = false
async function load() {
  const rows = (await (await fetch('/api/clients')).json()) as { name: string; status?: string }[]
  $('rows').innerHTML = rows.map((r) => `<tr><td>${esc(r.name)}</td><td><span class="tag">${esc(r.status ?? 'New')}</span></td></tr>`).join('')
  $('source').textContent = practiceOn ? tr('src_practice') : tr('src_real')
}

// ---- modal with animation + async content
const modal = $<HTMLDialogElement>('modal')
function openModal() {
  $('form').hidden = true
  $('loading').hidden = false
  modal.showModal()
  setTimeout(() => ((($('loading').hidden = true), ($('form').hidden = false))), 600)
}
$('new').addEventListener('click', openModal)
$('cancel').addEventListener('click', () => modal.close())
$('form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = ($<HTMLInputElement>('name').value || '').trim() || tr('new')
  await fetch('/api/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
  $<HTMLInputElement>('name').value = ''
  modal.close()
  await load()
})

// ---- tour
let tour: Tour | null = null
const stepsAll = () => [
  { element: '#new', title: tr('s1t'), description: tr('s1d') },
  { before: openModal, element: '#name', title: tr('s2t'), description: tr('s2d') },
  { element: '#save', title: tr('s3t'), description: tr('s3d'), after: () => modal.close() },
  { element: '#table', title: tr('s4t'), description: tr('s4d'), side: 'top' as const },
]
function common() {
  const themeName = $<HTMLSelectElement>('theme').value
  const theme = themeName === 'auto' ? autoTheme() : themes[themeName as keyof typeof themes]
  const font = $<HTMLSelectElement>('font').value
  return {
    theme,
    font: font || undefined,
    arrow: $<HTMLInputElement>('arrow').checked,
    dir: ($<HTMLInputElement>('rtl').checked ? 'rtl' : 'auto') as 'rtl' | 'auto',
    labels: { skip: tr('skip'), next: tr('next'), previous: tr('previous'), done: tr('done'), close: tr('close'), practice: tr('practiceLbl') },
    practice: $<HTMLInputElement>('practice').checked
      ? {
          data: createFixtures({ clients: { count: 5, fields: { id: fake.id(), name: fake.name(), status: fake.pick(['Active', 'Pending', 'New']) } } }, { seed: 7, locale: lang }),
          rest: { clients: '/api/clients' },
          latency: 80,
          onStart: () => ((practiceOn = true), void load()),
          onEnd: () => ((practiceOn = false), void load()),
        }
      : undefined,
  }
}
function startTour() {
  tour?.destroy()
  tour = new Tour({ steps: stepsAll(), ...common() })
  void tour.start()
}

// ---- onboarding checklist (remembers what each visitor has seen)
let checklist: Checklist | null = null
function mountChecklist() {
  checklist?.unmount()
  checklist = null
  if (!$<HTMLInputElement>('checklist').checked) return
  const { theme, font, dir, ...tourOptions } = common()
  checklist = new Checklist({
    id: 'site-demo',
    theme,
    font,
    dir,
    tourOptions,
    labels: { title: tr('ck_title'), complete: tr('ck_complete'), start: tr('ck_start'), review: tr('ck_review'), reset: tr('ck_reset'), hide: tr('ck_hide'), open: tr('ck_open'), close: tr('ck_close'), completed: tr('ck_completed'), pending: tr('ck_pending') },
    items: [
      { id: 'client', title: tr('ck_a'), description: tr('ck_ad'), tour: stepsAll() },
      { id: 'list', title: tr('ck_b'), tour: [{ element: '#table', title: tr('s4t'), description: tr('s4d'), side: 'top' }] },
      { id: 'practice', title: tr('ck_c'), description: tr('ck_cd'), onSelect: () => $('practice').focus() },
    ],
  }).mount()
  void checklist.ready.then(() => checklist!.open())
}
let builder: TourBuilder | null = null
$('builder').addEventListener('click', () => {
  builder?.destroy()
  const { theme, font, dir, ...tourOptions } = common()
  builder = new TourBuilder({ id: 'site-demo', lang, theme, tourOptions: { ...tourOptions, theme, font, dir } }).open()
})
$('checklist').addEventListener('change', mountChecklist)
for (const id of ['theme', 'font', 'arrow', 'rtl', 'practice']) $(id).addEventListener('change', () => checklist && mountChecklist())
$('start').addEventListener('click', startTour)
$('hero-start').addEventListener('click', () => {
  $('demo').scrollIntoView({ behavior: 'smooth' })
  setTimeout(startTour, 450)
})

// ---- code samples
const CODE: Record<string, string> = {
  core: `import { Tour } from 'nexus-tours'

new Tour({
  steps: [
    { element: '#new-client', title: 'Create a client' },
    { before: openModal,              // the tour waits for the target to show up
      element: '#name', title: 'Name it' },
    { element: '#save', title: 'Save', after: closeModal },
  ],
}).start()`,
  practice: `import { createFixtures, fake } from 'nexus-tours/fixtures'

new Tour({
  steps,
  practice: {
    data: createFixtures({ clients: { count: 6, fields: {
      id: fake.id(), name: fake.name(), status: fake.pick(['Active', 'Pending']),
    } } }, { seed: 1 }),
    rest: { clients: '/api/clients' },   // CRUD in memory, real writes blocked
    onStart: reload, onEnd: reload,
  },
}).start()`,
  vue: `<script setup>
import { ref } from 'vue'
import { NexusTour } from 'nexus-tours/vue'
const open = ref(false)
</script>

<template>
  <button @click="open = true">Start</button>
  <NexusTour v-model="open" :steps="steps" :options="{ theme }" @end="done" />
</template>`,
  react: `import { useState } from 'react'
import { NexusTour } from 'nexus-tours/react'

export function Help() {
  const [open, setOpen] = useState(false)
  return (<>
    <button onClick={() => setOpen(true)}>Start</button>
    <NexusTour open={open} onOpenChange={setOpen} steps={steps} theme={theme} />
  </>)
}`,
  checklist: `import { Checklist } from 'nexus-tours/checklist'

const checklist = new Checklist({
  id: 'onboarding',                       // new id = show it again to everyone
  items: [
    { id: 'client', title: 'Create your first client', tour: clientSteps },
    { id: 'invoice', title: 'Send an invoice', tour: invoiceSteps },
    { id: 'docs', title: 'Read the docs', onSelect: () => open('/docs') },
  ],
  onComplete: () => confetti(),
}).mount()

// finishing a tour checks its item off; progress is remembered per user
// storage: localStorage by default, or your own (async) { get, set }`,
  theme: `import { themes } from 'nexus-tours/themes'

new Tour({
  steps,
  theme: { ...themes.dark, accent: '#10b981', radius: '16px' },
  font: 'inherit',                // or fonts: [{ family, src }]
  css: '.gm-title { text-transform: uppercase }',
})

/* or from your own stylesheet */
:root { --gm-accent: #e11d48; --gm-font: "Inter", sans-serif }
.my-tour::part(button-primary) { border-radius: 999px }`,
}
function tab(name: string) {
  $('code').textContent = CODE[name]!
  document.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)))
}
document.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab!)))
tab('core')

// ---- language
function applyLang() {
  document.documentElement.lang = lang
  document.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => {
    const v = T[el.dataset.i!]
    if (v) el.innerHTML = v[lang === 'es' ? 0 : 1].replace(/</g, '&lt;')
  })
  $('lang').textContent = lang === 'es' ? 'EN' : 'ES'
  void load()
  if (checklist) mountChecklist()
}
$('lang').addEventListener('click', () => {
  lang = lang === 'es' ? 'en' : 'es'
  localStorage.setItem('nt-lang', lang)
  applyLang()
})
applyLang()
