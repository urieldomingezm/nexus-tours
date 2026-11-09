// API pública añadida antes de la 1.0: ids de paso, goTo('id'), eventos next/previous, motivo de cierre,
// onEvent (analítica) y contenido enriquecido seguro (content).
import { test as base, ok, eq, BASE, S } from './utilidades.mjs'

const test = base.extend({
  nueva: async ({ nuevoContexto, vigilar }, use) => {
    await use(async () => {
      const p = vigilar(await (await nuevoContexto({ viewport: { width: 1000, height: 700 } })).newPage())
      await p.goto(BASE + 'features.html')
      await p.waitForFunction(() => window.ready)
      return p
    })
  },
})
const titulo = (p) => p.evaluate(`${S('.gm-title')}?.textContent ?? null`)
const espera = (p, t) => p.waitForFunction(`${S('.gm-title')}?.textContent === ${JSON.stringify(t)}`, null, { timeout: 4000 })
const clicEn = (p, sel) => p.evaluate(`${S(sel)}.click()`)

/** Tour de 3 pasos que registra eventos (on) y analítica (onEvent) en window.log / window.analitica. */
const crear = (p, extra = {}) =>
  p.evaluate((extra) => {
    window.log = []
    window.analitica = []
    window.t = new Tour({
      id: 'bienvenida',
      onEvent: (e) => window.analitica.push(e),
      steps: [
        { id: 'hola', title: 'Hola' },
        { id: 'crear', element: '#go', title: 'Crear' },
        { id: 'fin', element: '#other', title: 'Fin' },
      ],
      ...extra,
    })
    for (const ev of ['start', 'step', 'next', 'previous', 'missing', 'end', 'stop'])
      t.on(ev, (c) => window.log.push(ev + ':' + c.index + (c.reason ? ':' + c.reason : '') + ':' + c.total))
  }, extra)

test('eventos next/previous en orden y end al terminar', async ({ nueva }) => {
  const p = await nueva()
  await crear(p)
  await p.evaluate(() => t.start())
  await espera(p, 'Hola')
  await clicEn(p, '.gm-primary')
  await espera(p, 'Crear')
  await p.getByRole('button', { name: 'Back' }).click()
  await espera(p, 'Hola')
  await p.evaluate(() => t.previous()) // en el primer paso no hace nada
  await p.waitForTimeout(200)
  ok((await titulo(p)) === 'Hola', 'previous() en el primer paso no se mueve')
  await p.evaluate(() => t.next())
  await espera(p, 'Crear')
  await p.evaluate(() => t.next())
  await espera(p, 'Fin')
  await clicEn(p, '.gm-primary')
  await p.waitForFunction(() => !t.active)
  eq(
    await p.evaluate(() => window.log),
    [
      'start:-1:3',
      'step:0:3',
      'next:0:3',
      'step:1:3',
      'previous:1:3',
      'step:0:3',
      'next:0:3',
      'step:1:3',
      'next:1:3',
      'step:2:3',
      'next:2:3',
      'end:2:3',
    ],
    'secuencia de eventos',
  )
})

test('motivo de cierre: skip, close, esc, backdrop, dismiss, missing y api', async ({ nueva }) => {
  const p = await nueva()
  const razon = async (abrir, cerrar, extra = {}) => {
    await crear(p, extra)
    await p.evaluate(abrir)
    await espera(p, 'Hola')
    await cerrar()
    await p.waitForFunction(() => !t.active)
    return p.evaluate(() => window.log.at(-1))
  }
  const iniciar = () => t.start()
  eq(await razon(iniciar, () => clicEn(p, '.gm-skip')), 'stop:0:skip:3', 'Omitir → skip')
  eq(await razon(iniciar, () => clicEn(p, '.gm-x'), { closeButton: true }), 'stop:0:close:3', '× → close')
  eq(await razon(iniciar, () => p.keyboard.press('Escape')), 'stop:0:esc:3', 'Esc → esc')
  eq(await razon(iniciar, () => p.evaluate(() => t.stop())), 'stop:0:api:3', 'stop() → api')
  eq(await razon(iniciar, () => clicEn(p, '.gm-backdrop'), { closeOnBackdrop: true }), 'stop:0:backdrop:3', 'clic en el fondo → backdrop')
  eq(
    await razon(iniciar, () => clicEn(p, '.gm-never'), { persist: { id: 'r', storage: null, dontShowAgain: true } }),
    'stop:0:dismiss:3',
    'No volver a mostrar → dismiss',
  )
  await crear(p, {
    waitTimeout: 150,
    steps: [{ title: 'Hola' }, { element: '#no-existe', title: 'Nunca', onMissing: 'stop' }],
  })
  await p.evaluate(() => t.start())
  await espera(p, 'Hola')
  await p.evaluate(() => t.next())
  await p.waitForFunction(() => !t.active)
  eq(await p.evaluate(() => window.log.slice(-2)), ['missing:1:2', 'stop:1:missing:2'], 'elemento que nunca aparece → missing')
})

test('goTo por id, id inexistente avisa sin romper', async ({ nueva }) => {
  const p = await nueva()
  const avisos = []
  p.on('console', (m) => m.type() === 'warning' && avisos.push(m.text()))
  await crear(p)
  await p.evaluate(() => t.start())
  await espera(p, 'Hola')
  await p.evaluate(() => t.goTo('fin'))
  await espera(p, 'Fin')
  ok((await p.evaluate(() => t.index)) === 2, "goTo('fin') va al tercer paso")
  await p.evaluate(() => t.goTo('no-existe'))
  await p.waitForTimeout(150)
  ok((await titulo(p)) === 'Fin', 'un id que no existe no mueve el tour')
  ok(
    avisos.some((a) => a.includes('no step with id "no-existe"')),
    'avisa en consola',
  )
  await p.evaluate(() => t.goTo(0))
  await espera(p, 'Hola')
  await p.evaluate(() => t.stop())
  await p.evaluate(() => t.start('crear'))
  await espera(p, 'Crear')
  ok((await p.evaluate(() => t.index)) === 1, "start('crear') empieza en ese paso")
})

test('onEvent: un objeto listo para analítica en cada evento', async ({ nueva }) => {
  const p = await nueva()
  await crear(p)
  await p.evaluate(() => t.start())
  await espera(p, 'Hola')
  await p.waitForTimeout(120)
  await clicEn(p, '.gm-primary')
  await espera(p, 'Crear')
  await clicEn(p, '.gm-skip')
  await p.waitForFunction(() => !t.active)
  const a = await p.evaluate(() => window.analitica)
  eq(
    a.map((e) => e.type),
    ['start', 'step', 'next', 'step', 'stop'],
    'tipos de evento',
  )
  const next = a[2]
  ok(
    next.tourId === 'bienvenida' && next.stepId === 'hola' && next.title === 'Hola' && next.index === 0 && next.total === 3,
    'datos del paso',
  )
  ok(next.stepElapsed >= 100 && next.elapsed >= next.stepElapsed, 'tiempos: en el paso y desde el inicio')
  const stop = a.at(-1)
  ok(stop.reason === 'skip' && stop.stepId === 'crear', 'stop con motivo y paso')
  ok(
    a.every((e) => JSON.stringify(e) === JSON.stringify(JSON.parse(JSON.stringify(e)))),
    'serializable tal cual (sin elementos ni funciones)',
  )

  // persist.id sirve de tourId; un onEvent que lanza no rompe el tour
  await p.evaluate(() => {
    window.t = new Tour({
      persist: { id: 'desde-persist', storage: null },
      onEvent: (e) => {
        window.ultimo = e
        throw new Error('analítica rota')
      },
      steps: [{ title: 'Uno' }, { title: 'Dos' }],
    })
    return t.start()
  })
  await espera(p, 'Uno')
  await clicEn(p, '.gm-primary')
  await espera(p, 'Dos')
  ok((await p.evaluate(() => window.ultimo.tourId)) === 'desde-persist', 'tourId desde persist.id')
  await p.evaluate(() => t.stop())
})

test('content: nodos propios y texto (nunca HTML), con nombre accesible', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      steps: [
        {
          title: 'Con lista',
          description: 'Tres cosas:',
          content: (ctx) => {
            const ul = document.createElement('ul')
            for (const x of ['uno', 'dos', String(ctx.index) + '/' + ctx.total])
              ul.appendChild(Object.assign(document.createElement('li'), { textContent: x }))
            return ul
          },
        },
        { title: 'Texto', content: () => '<img src=x onerror="window.hackeado=1">' },
        {
          title: 'Falla',
          content: () => {
            throw new Error('mal')
          },
        },
      ],
    })
    return t.start()
  })
  await espera(p, 'Con lista')
  eq(
    await p.evaluate(`[...${S('.gm-content')}.querySelectorAll('li')].map((l) => l.textContent)`),
    ['uno', 'dos', '0/3'],
    'el nodo se muestra y recibe el contexto',
  )
  ok(
    await p.evaluate(`${S('.gm-pop')}.getAttribute('aria-describedby').split(' ').includes(${S('.gm-content')}.id)`),
    'el contenido forma parte de la descripción accesible',
  )
  await clicEn(p, '.gm-primary')
  await espera(p, 'Texto')
  ok((await p.evaluate(`${S('.gm-content')}.textContent`)) === '<img src=x onerror="window.hackeado=1">', 'un string se muestra como texto')
  ok(!(await p.evaluate(`${S('.gm-content img')}`)), 'no se crea ningún elemento')
  await p.waitForTimeout(100)
  ok(!(await p.evaluate(() => window.hackeado)), 'no se ejecuta nada')
  const errores = []
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
  await clicEn(p, '.gm-primary')
  await espera(p, 'Falla')
  ok(!(await p.evaluate(`${S('.gm-content')}`)), 'si content() lanza, el paso se muestra sin contenido')
  ok(
    errores.some((e) => e.includes('content()')),
    'y el error se reporta en consola',
  )
})
