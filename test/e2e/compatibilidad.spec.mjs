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
  await p.addInitScript(() => { window.S = (q) => document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(q) })
  await p.goto(BASE)
  await p.waitForFunction(() => window.makeTour)
  ok(await p.evaluate(() => !('showPopover' in document.body) && !('adoptedStyleSheets' in ShadowRoot.prototype)), 'las APIs quedaron desactivadas')

  await p.evaluate(() => { makeTour('full'); t.start() })
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Create a client')
  ok(await p.evaluate(() => !document.querySelector('[data-nexus-tours]').hasAttribute('popover')), 'sin atributo popover')
  ok(await p.evaluate(() => !!document.querySelector('[data-nexus-tours]').shadowRoot.querySelector('style')), 'los estilos van en un <style> dentro del shadow root')
  ok(await p.evaluate(() => getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(66, 99, 235)'), 'los estilos se aplican')

  await p.getByRole('button', { name: 'Next' }).click()
  await p.waitForFunction(() => S('.gm-title')?.textContent === 'Name it')
  await p.waitForTimeout(500)
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'modal'), 'se monta dentro del <dialog> modal')
  ok(await p.evaluate(() => {
    const b = S('.gm-primary').getBoundingClientRect()
    return document.querySelector('[data-nexus-tours]').shadowRoot.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.classList.contains('gm-primary')
  }), 'el botón Next queda encima del modal y recibe clics')
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
  await p.goto(BASE + 'checklist.html'); await p.waitForFunction(() => window.make)
  await p.evaluate(() => make()); await p.evaluate(() => cl.ready)
  ok(await p.evaluate(() => {
    const l = document.querySelector('[data-nexus-checklist]').shadowRoot.querySelector('.launch')
    return getComputedStyle(l).borderRadius === '999px' && l.getBoundingClientRect().width > 0
  }), 'checklist: estilos aplicados con <style>')
  await p.goto(BASE + 'builder.html'); await p.waitForFunction(() => window.ready)
  await p.evaluate(() => { window.b = new TourBuilder({ storage: null }).open() })
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-nexus-builder]').shadowRoot.querySelector('.panel')).position === 'fixed'), 'constructor: estilos aplicados con <style>')
})
