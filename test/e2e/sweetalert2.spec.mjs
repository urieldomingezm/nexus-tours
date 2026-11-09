// Compatibilidad con SweetAlert2 real: alertas con animación, su trampa de teclado (Tab/flechas/Esc en la ventana),
// su aria-hidden sobre el resto de la página, campos dentro de la alerta, toasts y `themes.sweetalert2`.
import AxeBuilder from '@axe-core/playwright'
import { test as base, ok, eq, expect, BASE, S, sinAnimaciones } from './utilidades.mjs'

const test = base.extend({
  nueva: async ({ nuevoContexto, vigilar }, use) => {
    await use(async () => {
      const p = vigilar(await (await nuevoContexto({ viewport: { width: 1100, height: 750 } })).newPage())
      await p.addInitScript(() => {
        window.host = () => document.querySelector('[data-nexus-tours]')
      })
      await p.goto(BASE + 'sweetalert2.html')
      await p.waitForFunction(() => window.ready)
      return p
    })
  },
})
const espera = async (p, t) => {
  await p.waitForFunction(`${S('.gm-title')}?.textContent === ${JSON.stringify(t)}`, null, { timeout: 5000 })
  await sinAnimaciones(p)
}
const clicReal = async (p, sel) => {
  const c = await p.evaluate(
    `(() => { const b = ${S(sel)}.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`,
  )
  await p.mouse.click(c.x, c.y)
}
const enTour = () => document.activeElement?.matches('[data-nexus-tours]')
const abierta = () => !!document.querySelector('.swal2-container .swal2-popup.swal2-show')

test('alerta de confirmación: el tour entra, se ve, recibe clics y el usuario confirma', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      theme: themes.sweetalert2,
      steps: [
        { element: '#eliminar', title: 'Eliminar', description: 'Abre la confirmación' },
        { element: '.swal2-popup .swal2-title', title: 'Confirmación', beforeClick: '#eliminar' },
        { element: '.swal2-confirm', title: 'Confirma', advanceOn: 'click', hideNext: true, hint: 'Pulsa "Sí, eliminar"' },
        { element: '#resultado', title: 'Hecho' },
      ],
    })
    return t.start()
  })
  await espera(p, 'Eliminar')
  await clicReal(p, '.gm-primary')
  await espera(p, 'Confirmación')
  ok(await p.evaluate(abierta), 'la alerta se abrió')
  ok(await p.evaluate(() => host().parentElement.classList.contains('swal2-popup')), 'el tour se monta dentro de la alerta (role="dialog")')
  ok(await p.evaluate(() => !host().hasAttribute('aria-hidden')), 'el tour no queda oculto para lectores de pantalla')
  // Tab y las flechas son del tour: SweetAlert2 no se lleva el foco a sus botones.
  await p.waitForTimeout(300)
  ok(await p.evaluate(enTour), 'el foco está en el tour')
  await p.keyboard.press('Tab')
  ok(await p.evaluate(enTour), 'Tab no se va a los botones de la alerta')
  await p.keyboard.press('Shift+Tab')
  ok(await p.evaluate(enTour), 'Shift+Tab tampoco')
  await p.keyboard.press('ArrowRight')
  await espera(p, 'Confirma')
  ok(true, 'la flecha avanza el tour (no mueve el foco entre botones de la alerta)')
  ok(await p.evaluate(abierta), 'la alerta sigue abierta')
  // El usuario pulsa el botón real de la alerta: se cierra y el tour sigue en la página.
  await p.locator('.swal2-confirm').click()
  await espera(p, 'Hecho')
  eq(await p.evaluate(() => document.getElementById('resultado').textContent), 'eliminado', 'SweetAlert2 recibió la confirmación')
  await p.waitForFunction(() => !document.querySelector('.swal2-container'))
  ok(
    await p.evaluate(() => host().parentElement === document.body && !host().hasAttribute('aria-hidden')),
    'el tour vuelve a la página sin aria-hidden',
  )
  await clicReal(p, '.gm-primary')
  await p.waitForFunction(() => !t.active)
})

test('campo de texto dentro de la alerta (advanceOn input) y Enter de SweetAlert2', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      steps: [
        { element: '.swal2-input', title: 'Escribe', beforeClick: '#renombrar', advanceOn: 'input' },
        { element: '.swal2-confirm', title: 'Guarda', advanceOn: 'click' },
        { title: 'Fin' },
      ],
    })
    return t.start()
  })
  await espera(p, 'Escribe')
  await p.locator('.swal2-input').fill('Beto')
  await espera(p, 'Guarda')
  // Enter dentro del campo de la alerta lo maneja SweetAlert2 (confirma), no el tour.
  await p.locator('.swal2-input').press('Enter')
  await p.waitForFunction(() => document.getElementById('resultado').textContent === 'nombre:Beto')
  ok(true, 'Enter en el campo confirma la alerta')
  await espera(p, 'Fin')
  ok(true, 'Enter confirma con un clic en el botón: advanceOn lo detecta y el tour sigue sin esperar')
})

test('Esc cierra solo el tour; la alerta sigue abierta y con foco', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({ steps: [{ element: '.swal2-title', title: 'Alerta', beforeClick: '#eliminar' }, { title: 'Dos' }] })
    return t.start()
  })
  await espera(p, 'Alerta')
  await p.keyboard.press('Escape')
  await p.waitForFunction(() => !t.active)
  await p.waitForTimeout(400)
  ok(await p.evaluate(abierta), 'la alerta no se cerró')
  ok(await p.evaluate(() => document.querySelector('.swal2-popup').contains(document.activeElement)), 'el foco queda dentro de la alerta')
  await p.keyboard.press('Escape')
  await p.waitForFunction(() => document.getElementById('resultado').textContent === 'cancelado:esc')
  ok(true, 'un segundo Esc ya cierra la alerta (dismiss: esc)')
})

test('una alerta que se abre con el tour ya en la página no lo oculta ni lo tapa', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({ steps: [{ title: 'Centrado' }, { title: 'Otro' }] })
    return t.start()
  })
  await espera(p, 'Centrado')
  await p.evaluate(() => {
    Swal.fire({ title: 'Encima', showConfirmButton: true })
  })
  await p.waitForFunction(() => document.querySelector('.swal2-popup.swal2-show'))
  await p.waitForTimeout(300)
  ok(await p.evaluate(() => !host().hasAttribute('aria-hidden')), 'SweetAlert2 no deja el tour con aria-hidden')
  ok(
    await p.evaluate(
      `(() => { const b = ${S('.gm-primary')}.getBoundingClientRect(); return document.querySelector('[data-nexus-tours]').shadowRoot.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.classList.contains('gm-primary') })()`,
    ),
    'el botón del tour sigue encima del fondo de la alerta',
  )
  await clicReal(p, '.gm-primary')
  await espera(p, 'Otro')
  ok(await p.evaluate(abierta), 'usar el tour no cierra la alerta')
  await p.evaluate(() => t.stop())
  await p.evaluate(() => Swal.close())
})

test('toast de SweetAlert2: el tour resalta su botón', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({ steps: [{ element: '.swal2-toast .swal2-confirm', title: 'Deshacer', beforeClick: '#avisar' }] })
    return t.start()
  })
  await espera(p, 'Deshacer')
  const coincide = await p.evaluate(() => {
    const r = document.querySelector('.swal2-toast .swal2-confirm').getBoundingClientRect()
    const a = host().shadowRoot.querySelector('.gm-ring').getBoundingClientRect()
    return Math.abs(a.left + 6 - r.left) < 3 && Math.abs(a.top + 6 - r.top) < 3
  })
  ok(coincide, 'el resaltado coincide con el botón del toast')
  await p.evaluate(() => t.stop())
})

test('themes.sweetalert2 se ve como las alertas (claro y oscuro) y pasa contraste', async ({ nueva }) => {
  const p = await nueva()
  await p.evaluate(() => {
    window.t = new Tour({
      theme: themes.sweetalert2,
      closeButton: true,
      steps: [{ element: '#eliminar', title: 'Hola', description: 'Texto' }, { title: 'Dos' }],
    })
    return t.start()
  })
  await espera(p, 'Hola')
  const colores = () =>
    p.evaluate(
      `(() => { const b = getComputedStyle(${S('.gm-primary')}), pop = getComputedStyle(${S('.gm-pop')}); return { boton: b.backgroundColor, fondo: pop.backgroundColor, texto: pop.color } })()`,
    )
  const claro = await colores()
  eq(claro.boton, 'rgb(112, 102, 224)', 'botón con el morado de SweetAlert2')
  eq(claro.texto, 'rgb(84, 84, 84)', 'texto como las alertas')
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
  await p.evaluate(() => document.documentElement.setAttribute('data-swal2-theme', 'dark'))
  await sinAnimaciones(p)
  eq((await colores()).fondo, 'rgb(25, 25, 26)', 'modo oscuro de SweetAlert2')
  await axe('oscuro')
})
