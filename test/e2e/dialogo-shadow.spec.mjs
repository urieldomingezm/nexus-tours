// Ventana modal con el contenido en un shadow root abierto (nexus-dialogs): el tour se monta dentro del <dialog>,
// el campo resaltado se puede usar y las teclas del campo no mueven el tour.
import { test as base, ok, eq, BASE, S, sinAnimaciones } from './utilidades.mjs'

const test = base.extend({
  nueva: async ({ nuevoContexto, vigilar }, use) => {
    await use(async () => {
      const p = vigilar(await (await nuevoContexto({ viewport: { width: 1100, height: 750 } })).newPage())
      await p.goto(BASE + 'dialogo-shadow.html')
      await p.waitForFunction(() => window.ready)
      return p
    })
  },
})

test('campo dentro de un shadow root: se monta en el diálogo, se puede escribir y las flechas no avanzan', async ({ nueva }) => {
  const p = await nueva()
  await p.click('#abrir')
  await p.evaluate(() => {
    window.t = new Tour({
      steps: [{ element: () => window.campo(), title: 'Personas', side: 'left' }, { title: 'Fin' }],
    })
    return t.start()
  })
  await p.waitForFunction(`${S('.gm-title')}?.textContent === 'Personas'`, null, { timeout: 5000 })
  await sinAnimaciones(p)
  ok(
    await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.tagName === 'DIALOG'),
    'se monta dentro del <dialog>',
  )
  await p.evaluate(() => window.campo().querySelector('input').scrollIntoView())
  const c = await p.evaluate(() => {
    const b = window.campo().querySelector('input').getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
  })
  await p.mouse.click(c.x, c.y)
  await p.keyboard.type('Carl')
  eq(await p.evaluate(() => window.campo().querySelector('input').value), 'Carl', 'el campo recibe lo que se escribe')
  await p.keyboard.press('ArrowRight')
  await p.keyboard.press('Enter')
  eq(await p.evaluate(() => t.index), 0, 'las teclas del campo no mueven el tour')
  await p.evaluate(() => t.stop())
})
