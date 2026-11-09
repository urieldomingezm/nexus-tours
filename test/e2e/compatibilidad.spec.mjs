// Navegadores sin APIs recientes: se simulan quitándolas antes de cargar la página.
// Sin Popover API el tour usa z-index (y se monta dentro del <dialog> modal abierto);
// sin adoptedStyleSheets usa un <style> dentro del shadow root.
import { test, ok, BASE } from './utilidades.mjs'

const sinApisModernas = () => {
  for (const k of ['showPopover', 'hidePopover', 'togglePopover']) delete HTMLElement.prototype[k]
  delete ShadowRoot.prototype.adoptedStyleSheets
  delete Document.prototype.adoptedStyleSheets
}

test('sin Popover API ni adoptedStyleSheets: el flujo con modal sigue funcionando', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1000, height: 700 } })).newPage())
  await p.addInitScript(sinApisModernas)
  await p.addInitScript(() => {
    window.S = (q) => document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(q)
  })
  await p.goto(BASE)
  await p.waitForFunction(() => window.makeTour)
  ok(
    await p.evaluate(() => !('showPopover' in document.body) && !('adoptedStyleSheets' in ShadowRoot.prototype)),
    'las APIs quedaron desactivadas',
  )

  await p.evaluate(() => {
    makeTour('full')
    t.start()
  })
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Create a client')
  ok(await p.evaluate(() => !document.querySelector('[data-nexus-tours]').hasAttribute('popover')), 'sin atributo popover')
  ok(
    await p.evaluate(() => !!document.querySelector('[data-nexus-tours]').shadowRoot.querySelector('style')),
    'los estilos van en un <style> dentro del shadow root',
  )
  ok(await p.evaluate(() => getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(66, 99, 235)'), 'los estilos se aplican')

  await p.getByRole('button', { name: 'Next' }).click()
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Name it')
  await p.waitForTimeout(500)
  ok(
    await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'modal'),
    'se monta dentro del <dialog> modal',
  )
  ok(
    await p.evaluate(() => {
      const b = S('.gm-primary').getBoundingClientRect()
      return document
        .querySelector('[data-nexus-tours]')
        .shadowRoot.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        ?.classList.contains('gm-primary')
    }),
    'el botón Next queda encima del modal y recibe clics',
  )
  await p.getByRole('button', { name: 'Next' }).click()
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Save')
  await p.getByRole('button', { name: 'Next' }).click()
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Your list')
  await p.getByRole('button', { name: 'Done' }).click()
  await p.waitForFunction(() => !document.querySelector('[data-nexus-tours]'))
  ok(true, 'termina y limpia el DOM')
})

test('sin adoptedStyleSheets: checklist y constructor se ven bien', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1100, height: 700 } })).newPage())
  await p.addInitScript(sinApisModernas)
  await p.goto(BASE + 'checklist.html')
  await p.waitForFunction(() => window.make)
  await p.evaluate(() => make())
  await p.evaluate(() => cl.ready)
  ok(
    await p.evaluate(() => {
      const l = document.querySelector('[data-nexus-checklist]').shadowRoot.querySelector('.launch')
      return getComputedStyle(l).borderRadius === '999px' && l.getBoundingClientRect().width > 0
    }),
    'checklist: estilos aplicados con <style>',
  )
  await p.goto(BASE + 'builder.html')
  await p.waitForFunction(() => window.ready)
  await p.evaluate(() => {
    window.b = new TourBuilder({ storage: null }).open()
  })
  ok(
    await p.evaluate(
      () => getComputedStyle(document.querySelector('[data-nexus-builder]').shadowRoot.querySelector('.panel')).position === 'fixed',
    ),
    'constructor: estilos aplicados con <style>',
  )
})

// Temas que leen las variables CSS de cada framework: se simulan sus variables en :root.
const FRAMEWORKS = {
  tailwind: {
    vars: { '--color-indigo-600': 'oklch(0.511 0.262 276.966)', '--color-white': '#fff' },
    esperado: 'oklch(0.511 0.262 276.966)',
  },
  shadcn: { vars: { '--primary': 'oklch(0.205 0 0)', '--primary-foreground': 'oklch(0.985 0 0)' }, esperado: 'oklch(0.205 0 0)' },
  daisyui: {
    vars: { '--color-primary': 'oklch(45% 0.24 277.023)', '--color-primary-content': 'oklch(93% 0.034 272.788)' },
    esperado: 'oklch(0.45 0.24 277.023)',
  },
  vuetify: { vars: { '--v-theme-primary': '98,0,238', '--v-theme-on-primary': '255,255,255' }, esperado: 'rgb(98, 0, 238)' },
  mui: { vars: { '--mui-palette-primary-main': '#9c27b0', '--mui-palette-primary-contrastText': '#fff' }, esperado: 'rgb(156, 39, 176)' },
}

for (const [nombre, { vars, esperado }] of Object.entries(FRAMEWORKS)) {
  test(`themes.${nombre} toma el color primario de las variables del framework`, async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1000, height: 700 } })).newPage())
    await p.goto(BASE)
    await p.waitForFunction(() => window.makeTour)
    await p.evaluate(
      ({ nombre, vars }) => {
        for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v)
        makeTour('full', { theme: Guiame.themes[nombre] })
        t.start()
      },
      { nombre, vars },
    )
    await p.waitForFunction(() => document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector('.gm-primary'))
    await p.waitForTimeout(400)
    const color = await p.evaluate(
      () => getComputedStyle(document.querySelector('[data-nexus-tours]').shadowRoot.querySelector('.gm-primary')).backgroundColor,
    )
    ok(color === esperado, `${nombre}: botón con el primario del framework (${color})`)
  })
}
