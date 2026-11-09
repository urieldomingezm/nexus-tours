// Compatibilidad con Bootstrap 5 real (CSS + JS): modal con animación y trampa de foco, offcanvas (transform),
// dropdown, pestañas y acordeón con transiciones, Esc, y el tema `themes.bootstrap` (incluido el modo oscuro).
import AxeBuilder from '@axe-core/playwright'
import { test as base, ok, eq, expect, BASE, S, sinAnimaciones } from './utilidades.mjs'

const test = base.extend({
  nueva: async ({ nuevoContexto, vigilar }, use) => {
    await use(async (opts = {}) => {
      const p = vigilar(await (await nuevoContexto({ viewport: { width: 1100, height: 750 }, ...opts })).newPage())
      await p.goto(BASE + 'bootstrap.html')
      await p.waitForFunction(() => window.ready)
      return p
    })
  },
})
const espera = async (p, t) => {
  await p.waitForFunction(`${S('.gm-title')}?.textContent === ${JSON.stringify(t)}`, null, { timeout: 5000 })
  await sinAnimaciones(p)
}
/** El botón principal del tour está encima de todo y recibe el clic de verdad (mouse real, no .click()). */
const clicReal = async (p, sel) => {
  const c = await p.evaluate(
    `(() => { const b = ${S(sel)}.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`,
  )
  await p.mouse.click(c.x, c.y)
}
/** El anillo de resaltado coincide con el elemento (±3 px), aunque esté dentro de algo con transform. */
const anilloSobre = (p, sel) =>
  p.evaluate(
    ({ sel, pad }) => {
      const r = document.querySelector(sel).getBoundingClientRect()
      const a = document.querySelector('[data-nexus-tours]').shadowRoot.querySelector('.gm-ring').getBoundingClientRect()
      return Math.abs(a.left + pad - r.left) < 3 && Math.abs(a.top + pad - r.top) < 3 && Math.abs(a.width - pad * 2 - r.width) < 3
    },
    { sel, pad: 6 },
  )

test('modal de Bootstrap: lo abre, espera la animación, el tour queda encima y recibe foco y clics', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      theme: themes.bootstrap,
      steps: [
        { element: '#abrir', title: 'Nuevo cliente' },
        { element: '#nombre', title: 'Nombre', beforeClick: '#abrir', advanceOn: 'input', hint: 'Escribe algo' },
        { element: '#guardar', title: 'Guardar', afterClick: '#cerrar' },
        { title: 'Listo' },
      ],
    })
    return t.start()
  })
  await espera(p, 'Nuevo cliente')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Nombre')
  ok(await p.evaluate(() => document.querySelector('#modal').classList.contains('show')), 'el modal se abrió')
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'modal'), 'el tour se monta dentro del modal')
  ok(await anilloSobre(p, '#nombre'), 'el resaltado coincide con el campo')
  // La trampa de foco de Bootstrap no le quita el foco al tour.
  await p.waitForTimeout(300)
  ok(await p.evaluate(() => document.activeElement?.matches('[data-nexus-tours]')), 'el foco sigue en el tour')
  await p.keyboard.press('Tab')
  ok(await p.evaluate(() => document.activeElement?.matches('[data-nexus-tours]')), 'Tab no se escapa del tour')
  // El usuario escribe en el campo resaltado (dentro del modal) y el tour avanza solo.
  await p.locator('#nombre').fill('Ana')
  await espera(p, 'Guardar')
  ok(await anilloSobre(p, '#guardar'), 'el resaltado sigue al botón Guardar')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Listo')
  await p.waitForFunction(() => !document.querySelector('#modal').classList.contains('show'))
  ok(true, 'afterClick cerró el modal')
  await clicReal(p, '.gm-primary')
  await p.waitForFunction(() => !t.active)
})

test('Esc cierra solo el tour; el modal de Bootstrap sigue abierto', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({ steps: [{ element: '#nombre', title: 'Nombre', beforeClick: '#abrir' }, { title: 'Fin' }] })
    return t.start()
  })
  await espera(p, 'Nombre')
  await p.keyboard.press('Escape')
  await p.waitForFunction(() => !t.active)
  await p.waitForTimeout(400)
  ok(await p.evaluate(() => document.querySelector('#modal').classList.contains('show')), 'el modal no se cerró')
  await p.keyboard.press('Escape')
  await p.waitForFunction(() => !document.querySelector('#modal').classList.contains('show'))
  ok(true, 'un segundo Esc ya cierra el modal')
})

test('offcanvas (panel lateral con transform), dropdown, pestañas y acordeón', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      steps: [
        { element: '#perfil', title: 'Perfil', beforeClick: '#menu' },
        { element: '#avanzado', title: 'Avanzado', beforeClick: '#tab2' },
        { element: '#soporte', title: 'Soporte', beforeClick: '#acc' },
        { element: '#estado', title: 'Estado', beforeClick: '#panel', afterClick: '#lateral .btn-close' },
        { title: 'Fin' },
      ],
    })
    return t.start()
  })
  await espera(p, 'Perfil')
  ok(await anilloSobre(p, '#perfil'), 'dropdown: resalta el elemento del menú (posicionado por Popper)')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Avanzado')
  ok(await anilloSobre(p, '#avanzado'), 'pestaña: espera a que termine el fade y resalta')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Soporte')
  ok(await anilloSobre(p, '#soporte'), 'acordeón: espera a que se despliegue y resalta')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Estado')
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'lateral'), 'se monta dentro del offcanvas')
  ok(await anilloSobre(p, '#estado'), 'offcanvas: el resaltado coincide aunque el panel tenga transform')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Fin')
  await p.waitForFunction(() => !document.querySelector('#lateral').classList.contains('show'))
  ok(true, 'afterClick cerró el offcanvas')
})

test('themes.bootstrap sigue los colores de Bootstrap y su modo oscuro, con buen contraste', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      theme: themes.bootstrap,
      closeButton: true,
      steps: [{ element: '#abrir', title: 'Hola', description: 'Texto' }, { title: 'Dos' }],
    })
    return t.start()
  })
  await espera(p, 'Hola')
  const colores = () =>
    p.evaluate(
      `(() => { const b = getComputedStyle(${S('.gm-primary')}), pop = getComputedStyle(${S('.gm-pop')}); return { boton: b.backgroundColor, fondo: pop.backgroundColor, texto: pop.color, fuente: pop.fontFamily } })()`,
    )
  const claro = await colores()
  eq(claro.boton, 'rgb(13, 110, 253)', 'botón con el --bs-primary de Bootstrap')
  eq(claro.fondo, 'rgb(255, 255, 255)', 'fondo con --bs-body-bg (claro)')
  ok(claro.fuente.includes('system-ui'), 'fuente de Bootstrap')
  const axe = async (modo) => {
    const { violations } = await new AxeBuilder({ page: p }).include('[data-nexus-tours]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect
      .soft(
        violations.map((v) => v.id),
        `accesibilidad en modo ${modo}`,
      )
      .toEqual([])
  }
  await axe('claro')
  // Cambiar el tema de Bootstrap en vivo: el tour lo sigue sin recrearse.
  await p.evaluate(() => document.documentElement.setAttribute('data-bs-theme', 'dark'))
  await sinAnimaciones(p)
  const oscuro = await colores()
  eq(oscuro.fondo, 'rgb(33, 37, 41)', 'fondo oscuro de Bootstrap (--bs-body-bg en data-bs-theme="dark")')
  eq(oscuro.texto, 'rgb(222, 226, 230)', 'texto claro en modo oscuro')
  await axe('oscuro')
  // Un color de marca propio en --bs-primary también se respeta.
  await p.evaluate(() => document.documentElement.style.setProperty('--bs-primary', '#6f42c1'))
  await sinAnimaciones(p)
  eq((await colores()).boton, 'rgb(111, 66, 193)', 'respeta un --bs-primary personalizado')
})

test('modalSelector: contenedores de otras librerías sin role="dialog"', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    const m = document.createElement('div')
    m.className = 'mi-modal'
    m.style.cssText = 'position:fixed;inset:20% 30%;background:#fff;border:1px solid;padding:20px;z-index:2000'
    m.innerHTML = '<button id="dentro">Dentro</button>'
    document.body.appendChild(m)
    window.t = new Tour({ modalSelector: '.mi-modal', steps: [{ element: '#dentro', title: 'Dentro' }] })
    return t.start()
  })
  await espera(p, 'Dentro')
  ok(
    await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.className === 'mi-modal'),
    'se monta dentro del contenedor indicado',
  )
  await p.evaluate(() => {
    t.stop()
    window.t = new Tour({ modalSelector: '[[inválido', steps: [{ element: '#abrir', title: 'Sigue' }] })
    return t.start()
  })
  await espera(p, 'Sigue')
  ok(true, 'un selector inválido no rompe el tour')
})
