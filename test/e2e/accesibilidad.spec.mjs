// Auditoría automática de accesibilidad (axe-core, WCAG 2.2 A/AA) de lo que dibuja la librería:
// popover del tour (escritorio, celular, bienvenida, modo práctica), temas, checklist y constructor.
// Solo se analiza el DOM de la librería (no la página de prueba que la rodea).
import AxeBuilder from '@axe-core/playwright'
import { test, expect, BASE, S, sinAnimaciones } from './utilidades.mjs'

const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function auditar(page, selector) {
  await sinAnimaciones(page) // el contraste se mide con los colores finales, no a media transición
  const { violations } = await new AxeBuilder({ page }).include(selector).withTags(REGLAS).analyze()
  const resumen = violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(resumen, `violaciones de accesibilidad en ${selector}`).toEqual([])
}

const espera = (p, t) => p.waitForFunction(`${S('.gm-title')}?.textContent === ${JSON.stringify(t)}`, null, { timeout: 5000 })

async function abrir(nuevoContexto, vigilar, url, opts = {}) {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1000, height: 700 }, ...opts })).newPage())
  await p.goto(BASE + url)
  return p
}

test('tour: popover con modal <dialog>, progreso y botones', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, '')
  await p.waitForFunction(() => window.makeTour)
  await p.evaluate(() => {
    makeTour('full', { closeButton: true })
    t.start()
  })
  await espera(p, 'Create a client')
  await p.waitForTimeout(400)
  await auditar(p, '[data-nexus-tours]')
  await p.getByRole('button', { name: 'Next' }).click()
  await espera(p, 'Name it')
  await p.waitForTimeout(500)
  await auditar(p, '[data-nexus-tours]')
})

test('tour: tarjeta de bienvenida, puntos, Omitir, pista y "no volver a mostrar"', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, 'features.html')
  await p.waitForFunction(() => window.ready)
  await p.evaluate(() => {
    window.t = new Tour({
      persist: { id: 'a11y', dontShowAgain: true, storage: null },
      steps: [
        { title: 'Bienvenido', description: 'Un recorrido corto', icon: '👋' },
        { element: '#go', title: 'Pulsa', hint: 'Haz clic en el botón', advanceOn: 'click', hideNext: true },
      ],
    })
    return t.start()
  })
  await espera(p, 'Bienvenido')
  await p.waitForTimeout(400)
  await auditar(p, '[data-nexus-tours]')
  await p.evaluate(`${S('.gm-primary')}.click()`)
  await espera(p, 'Pulsa')
  await p.waitForTimeout(400)
  await auditar(p, '[data-nexus-tours]')
})

test('tour: panel inferior en celular', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, 'features.html', { viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true })
  await p.waitForFunction(() => window.ready)
  await p.evaluate(() => {
    window.t = new Tour({
      steps: [
        { element: '#go', title: 'Uno', description: 'Primer paso' },
        { element: '#other', title: 'Dos' },
      ],
    })
    return t.start()
  })
  await espera(p, 'Uno')
  await p.waitForTimeout(500)
  await auditar(p, '[data-nexus-tours]')
})

test('tour: aviso de modo práctica y barra de progreso (más de 10 pasos)', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, '')
  await p.waitForFunction(() => window.makeTour)
  await p.evaluate(() => {
    makeTour('full', { practice: practiceCfg() })
    t.start()
  })
  await espera(p, 'Create a client')
  await p.waitForTimeout(400)
  await auditar(p, '[data-nexus-tours]')
  await p.goto(BASE + 'features.html')
  await p.waitForFunction(() => window.ready)
  await p.evaluate(() => {
    window.t = new Tour({ steps: Array.from({ length: 12 }, (_, i) => ({ element: '#go', title: 'P' + i })) })
    return t.start()
  })
  await espera(p, 'P0')
  await p.waitForTimeout(400)
  await auditar(p, '[data-nexus-tours]')
})

for (const tema of [
  'light',
  'dark',
  'ocean',
  'sunset',
  'mint',
  'rose',
  'mono',
  'bootstrap',
  'tailwind',
  'shadcn',
  'daisyui',
  'vuetify',
  'mui',
]) {
  test(`tema ${tema}: contraste suficiente`, async ({ nuevoContexto, vigilar }) => {
    const p = await abrir(nuevoContexto, vigilar, '')
    await p.waitForFunction(() => window.makeTour)
    await p.evaluate((tema) => {
      makeTour('full', { theme: Guiame.themes[tema], closeButton: true })
      t.start()
    }, tema)
    await espera(p, 'Create a client')
    await p.waitForTimeout(400)
    await auditar(p, '[data-nexus-tours]')
  })
}

test('checklist: lanzador y panel abierto', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, 'checklist.html')
  await p.waitForFunction(() => window.make)
  await p.evaluate(() => make())
  await p.evaluate(() => cl.ready)
  await auditar(p, '[data-nexus-checklist]')
  await p.evaluate(() => {
    cl.markDone('a')
    cl.open()
  })
  await p.waitForTimeout(300)
  await auditar(p, '[data-nexus-checklist]')
})

test('constructor visual: panel con pasos', async ({ nuevoContexto, vigilar }) => {
  const p = await abrir(nuevoContexto, vigilar, 'builder.html', { viewport: { width: 1100, height: 700 } })
  await p.waitForFunction(() => window.ready)
  await p.evaluate(() => {
    window.b = new TourBuilder({
      storage: null,
      lang: 'es',
      steps: [
        { element: '#nuevo', title: 'Hola', description: 'Primer paso' },
        { element: '#no-existe', title: 'Roto' },
        { element: 'button', title: 'Ambiguo' },
        { title: 'Fin' },
      ],
    }).open()
  })
  await p.waitForTimeout(300)
  await auditar(p, '[data-nexus-builder]')
})
