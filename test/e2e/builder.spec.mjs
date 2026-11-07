// Constructor visual de tours: elegir elementos, selectores, modales, probar, exportar, guardar.
import { test as base, ok, BASE } from './utilidades.mjs'

const test = base.extend({
  nueva: async ({ nuevoContexto, vigilar }, use) => {
    await use(async () => {
      const p = vigilar(await (await nuevoContexto({ viewport: { width: 1100, height: 700 } })).newPage())
      await p.goto(BASE + 'builder.html'); await p.waitForFunction(() => window.ready)
      return p
    })
  },
})
const B = (q) => `document.querySelector('[data-nexus-builder]').shadowRoot.querySelector(${JSON.stringify(q)})`
const BA = (q) => `[...document.querySelector('[data-nexus-builder]').shadowRoot.querySelectorAll(${JSON.stringify(q)})]`
const T = (q) => `document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(${JSON.stringify(q)})`
const centro = async (p, sel) => p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
const hover = async (p, sel) => { const c = await centro(p, sel); await p.mouse.move(c.x, c.y); await p.waitForTimeout(120) }
const clic = async (p, sel) => { const c = await centro(p, sel); await p.mouse.click(c.x, c.y); await p.waitForTimeout(120) }
const pasos = (p) => p.evaluate(() => b.toJSON().steps)

test("generador de selectores", async ({ nueva }) => {
  {
    const p = await nueva()
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const el = {
        nuevo: q('#nuevo'), exportar: q('.btn-export'), stats: q('[data-testid=stats]'), total: q('.svc-4f8a9b12'), em: q('em'),
        linkC: q('a[href="/c"]'), tres: q('section p:nth-child(3)'), nombre: q('#nombre'),
      }
      const out = {}
      for (const [k, e] of Object.entries(el)) { const s = bestSelector(e); out[k] = { s, ok: document.querySelectorAll(s).length === 1 && document.querySelector(s) === e } }
      return out
    })
    ok(r.nuevo.s === '#nuevo', `id estable → #nuevo`)
    ok(r.exportar.ok && !r.exportar.s.includes('3a9f') && !r.exportar.s.includes('css-'), `ignora ids y clases generados (${r.exportar.s})`)
    ok(r.stats.s === '[data-testid="stats"]', `prefiere data-testid (${r.stats.s})`)
    ok(r.total.ok && !r.total.s.includes('4f8a9b12'), `ignora la clase con hash (${r.total.s})`)
    ok(r.em.ok, `elemento sin atributos: selector único (${r.em.s})`)
    ok(r.linkC.ok && r.linkC.s.includes('href'), `enlace por href (${r.linkC.s})`)
    ok(r.tres.ok && r.tres.s.includes('nth-child'), `hermanos iguales: nth-child (${r.tres.s})`)
    ok(Object.values(r).every((x) => x.ok), 'todos los selectores generados son únicos')
  }
})

test("elegir elementos", async ({ nueva }) => {
  {
    const p = await nueva()
    await p.evaluate(() => { window.b = new TourBuilder({ storage: null, lang: 'es' }).open() })
    ok(await p.evaluate(`${B('.btn[aria-pressed=true]')}.textContent === 'Elegir elemento'`), 'abre en modo elegir')
    ok((await p.evaluate(`${B('.empty')}.textContent`)).includes('Aún no hay pasos'), 'lista vacía con mensaje')
    await hover(p, '.btn-export')
    const hl = await p.evaluate(`(() => { const h = ${B('.hl')}.getBoundingClientRect(); const t = document.querySelector('.btn-export').getBoundingClientRect(); return { dx: Math.abs(h.left - t.left), dw: Math.abs(h.width - t.width), label: ${B('.hl i')}.textContent, shown: ${B('.hl')}.style.display } })()`)
    ok(hl.shown === 'block' && hl.dx < 2 && hl.dw < 2, 'el resaltado sigue al elemento bajo el cursor')
    ok(hl.label === '.btn-export', `la etiqueta muestra el selector (${hl.label})`)
    await clic(p, '.btn-export')
    ok(await p.evaluate(() => hits.exportar === 0), 'en modo elegir el clic NO llega a la página')
    let s = await pasos(p)
    ok(s.length === 1 && s[0].element === '.btn-export' && s[0].route === '/builder.html', 'el clic agrega un paso con selector y página')
    ok(await p.evaluate(`${B('.card .title')} === document.querySelector('[data-nexus-builder]').shadowRoot.activeElement`), 'el título del paso queda enfocado')
    // flecha arriba: contenedor
    await hover(p, '.svc-4f8a9b12'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100)
    const up = await p.evaluate(`(() => { const h = ${B('.hl')}.getBoundingClientRect(); const t = document.querySelector('[data-testid=stats]').getBoundingClientRect(); return Math.abs(h.width - t.width) < 2 && ${B('.hl i')}.textContent })()`)
    ok(up === '[data-testid="stats"]', '↑ sube al contenedor y lo resalta')
    await clic(p, '.svc-4f8a9b12')
    s = await pasos(p)
    ok(s[1].element === '[data-testid="stats"]', 'el clic elige el contenedor resaltado')
    ok(s[1].route === undefined, 'misma página que el paso anterior: no repite route')
    // editar
    await p.evaluate(`(() => { const t = ${BA('.card .title')}[0]; t.value = 'Exporta'; t.dispatchEvent(new Event('input')); const d = ${BA('.card .desc')}[0]; d.value = 'Descarga tus datos'; d.dispatchEvent(new Event('input')); const c = ${BA('.card input[type=checkbox]')}[0]; c.checked = true; c.dispatchEvent(new Event('change')) })()`)
    s = await pasos(p)
    ok(s[0].title === 'Exporta' && s[0].description === 'Descarga tus datos' && s[0].advanceOn === 'click', 'editar título, descripción y "avanza al hacer clic"')
    ok(!('side' in s[0]) && !('beforeClick' in s[0]) && !('afterClick' in s[0]), 'el JSON no lleva campos vacíos')
    // selector editable + estado
    await p.evaluate(`(() => { const i = ${BA('.card .sel')}[0]; i.value = '#no-existe'; i.dispatchEvent(new Event('input')) })()`)
    ok(await p.evaluate(`${BA('.badge')}[0].dataset.ok === 'false' && ${BA('.badge')}[0].textContent.includes('no encontrado')`), 'selector que no existe: insignia roja')
    await p.evaluate(`(() => { const i = ${BA('.card .sel')}[0]; i.value = 'button'; i.dispatchEvent(new Event('input')) })()`)
    ok((await p.evaluate(`${BA('.badge')}[0].textContent`)).includes('elementos'), 'selector ambiguo: avisa cuántos elementos')
    await p.evaluate(`(() => { const i = ${BA('.card .sel')}[0]; i.value = '.btn-export'; i.dispatchEvent(new Event('input')) })()`)
    // reordenar y quitar
    await p.evaluate(`${BA('.card')}[0].querySelectorAll('.ico')[2].click()`)
    s = await pasos(p)
    ok(s[0].element === '[data-testid="stats"]' && s[1].element === '.btn-export', '↓ reordena los pasos')
    await p.evaluate(`${BA('.card')}[0].querySelectorAll('.ico')[3].click()`)
    ok((await pasos(p)).length === 1, '× quita el paso')
    // Esc en modo elegir pasa a interactuar
    await p.keyboard.press('Escape'); await p.waitForTimeout(80)
    ok(await p.evaluate(`${B('.btn[aria-pressed=true]')}.textContent === 'Interactuar'`), 'Esc cambia a modo interactuar')
    await p.evaluate(() => b.close())
    ok(await p.evaluate(() => !document.querySelector('[data-nexus-builder]')), 'close() quita el panel')
  }
})

test("modales: interactuar, grabar clics, elegir dentro del modal, probar", async ({ nueva }) => {
  {
    const p = await nueva()
    await p.evaluate(() => { window.b = new TourBuilder({ storage: null, lang: 'es' }).open() })
    await clic(p, '#nuevo') // en modo elegir: agrega paso #nuevo
    await p.evaluate(`${B('.modes .btn:nth-child(2)')}.click()`) // interactuar
    await clic(p, '#nuevo'); await p.waitForTimeout(700) // abre el modal; el panel debe seguir usable
    ok(await p.evaluate(() => hits.nuevo === 1 && document.getElementById('dlg').open), 'en modo interactuar la página responde (abre el modal)')
    ok(await p.evaluate(`${B('.chip')}.textContent.startsWith('#nuevo')`), 'se graba el clic como chip')
    ok(await p.evaluate(() => document.querySelector('[data-nexus-builder]').parentElement === document.getElementById('dlg')), 'el panel se muda dentro del modal para seguir usable')
    ok(await p.evaluate(`!!${B('.panel')}`) && (await p.evaluate(() => { const r = document.querySelector('[data-nexus-builder]').shadowRoot.querySelector('.panel').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 20, r.top + 20); return e === document.querySelector('[data-nexus-builder]') })), 'el panel recibe clics aunque haya un modal')
    await p.evaluate(`${B('.modes .btn:nth-child(1)')}.click()`) // elegir
    await clic(p, '#nombre')
    let s = await pasos(p)
    ok(s.length === 2 && s[1].element === '#nombre' && JSON.stringify(s[1].beforeClick) === '["#nuevo"]', 'elegir dentro del modal: guarda beforeClick con el clic que lo abrió')
    ok((await p.evaluate(() => document.getElementById('dlg').open)), 'elegir no cierra el modal')
    ok(await p.evaluate(`${BA('.chip')}.length === 0`), 'los clics grabados se consumen al elegir')
    // afterClick a mano y cerrar el modal
    await p.evaluate(`(() => { const i = ${BA('.card')}[1].querySelectorAll('.opts .sel')[1]; i.value = '#cancelar'; i.dispatchEvent(new Event('input')) })()`)
    s = await pasos(p)
    ok(JSON.stringify(s[1].afterClick) === '["#cancelar"]', 'afterClick editable a mano')
    await p.evaluate(() => document.getElementById('dlg').close()); await p.waitForTimeout(500)
    ok(await p.evaluate(() => document.querySelector('[data-nexus-builder]').parentElement === document.body), 'sin modal el panel vuelve al body')
    // probar: abre el modal solo gracias a beforeClick
    await p.evaluate(`(() => { const c = ${BA('.card')}; for (const [i, t] of ['Nuevo', 'Nombre'].entries()) { const el = c[i].querySelector('.title'); el.value = t; el.dispatchEvent(new Event('input')) } })()`)
    await p.evaluate(`${B('.foot .btn.pri')}.click()`)
    await p.waitForFunction(`${T('.gm-title')}?.textContent === 'Nuevo'`)
    ok(await p.evaluate(`document.querySelector('[data-nexus-builder]').hidden`), 'probar: el panel se oculta')
    await p.evaluate(`${T('.gm-primary')}.click()`)
    await p.waitForFunction(`${T('.gm-title')}?.textContent === 'Nombre'`, null, { timeout: 5000 })
    ok(await p.evaluate(() => document.getElementById('dlg').open), 'probar: beforeClick abrió el modal para el paso 2')
    await p.evaluate(`${T('.gm-primary')}.click()`); await p.waitForTimeout(400)
    ok(await p.evaluate(`!document.querySelector('[data-nexus-builder]').hidden`), 'al terminar la prueba vuelve el panel')
    ok(await p.evaluate(() => !document.getElementById('dlg').open), 'afterClick cerró el modal al salir del paso')
    // probar desde un paso intermedio
    await p.evaluate(`${BA('.card')}[1].querySelectorAll('.ico')[0].click()`)
    await p.waitForFunction(`${T('.gm-title')}?.textContent === 'Nombre'`, null, { timeout: 5000 })
    ok(await p.evaluate(() => document.getElementById('dlg').open), 'probar desde el paso 2 también abre el modal')
    await p.evaluate(`${T('.gm-x') ?? T('.gm-skip')}.click()`); await p.waitForTimeout(300)
    ok(await p.evaluate(`!document.querySelector('[data-nexus-builder]').hidden`), 'cerrar la prueba con Omitir/× devuelve el panel')
    await p.evaluate(() => b.close())
  }
})

test("exportar / importar / guardar / borrador", async ({ nueva }) => {
  {
    const p = await nueva()
    await p.evaluate(() => {
      window.saved = null
      window.b = new TourBuilder({ id: 'demo', lang: 'en', steps: [{ element: '#nuevo', title: 'Hi', description: 'Start here' }, { title: 'Bye' }], onSave: (j) => { window.saved = j } }).open()
    })
    ok(await p.evaluate(`${B('.panel')}.getAttribute('aria-label') === 'Tour builder'`), 'idioma inglés')
    ok(await p.evaluate(`${BA('.card')}.length === 2 && ${BA('.card')}[1].textContent.includes('No element')`), 'paso sin elemento (bienvenida/cierre)')
    const json = await p.evaluate(() => b.toJSON())
    ok(json.version === 1 && json.steps.length === 2 && json.steps[1].title === 'Bye', 'toJSON: { version, steps }')
    const code = await p.evaluate(() => b.toCode())
    ok(code.includes("import { Tour } from 'nexus-tours'") && code.includes('new Tour(') && code.includes('"element": "#nuevo"') && code.trim().endsWith('tour.start()'), 'toCode genera el código listo para pegar')
    await p.evaluate(`${B('.foot .btn.pri:nth-of-type(2)') ?? B('.foot')}`)
    await p.evaluate(`${BA('.foot .btn')}.find((x) => x.textContent === 'Save').click()`); await p.waitForTimeout(100)
    ok(await p.evaluate(() => window.saved?.steps?.length === 2), 'Save llama a onSave con el JSON')
    // importar
    await p.evaluate(`${BA('.foot .btn')}.find((x) => x.textContent === 'Import').click()`)
    await p.evaluate(`(() => { const a = ${B('.imp textarea')}; a.value = 'no es json'; ${BA('.imp .btn')}[0].click() })()`)
    ok((await p.evaluate(`${B('.imp .muted')}.textContent`)) === 'Invalid JSON', 'importar: avisa si el JSON no es válido')
    await p.evaluate(`(() => { const a = ${B('.imp textarea')}; a.value = ${JSON.stringify(JSON.stringify({ version: 1, steps: [{ element: '#guardar', title: 'Importado' }] }))}; ${BA('.imp .btn')}[0].click() })()`)
    ok(await p.evaluate(() => b.toJSON().steps.length === 1 && b.toJSON().steps[0].title === 'Importado'), 'importar: carga los pasos')
    // borrar con confirmación en dos clics
    await p.evaluate(`${BA('.foot .btn')}.find((x) => x.textContent === 'Clear all').click()`)
    ok(await p.evaluate(() => b.toJSON().steps.length === 1), 'borrar todo pide confirmar (un clic no borra)')
    await p.evaluate(`${BA('.foot .btn')}.find((x) => x.textContent === 'Sure?').click()`)
    ok(await p.evaluate(() => b.toJSON().steps.length === 0), 'segundo clic: borra todo')
    // borrador guardado entre sesiones
    await p.evaluate(() => b.load({ version: 1, steps: [{ element: '#nuevo', title: 'Persistente' }] }))
    await p.waitForTimeout(500)
    await p.evaluate(() => b.close())
    const again = await p.evaluate(async () => { const x = new TourBuilder({ id: 'demo' }); await x.ready; return x.toJSON().steps[0]?.title })
    ok(again === 'Persistente', 'el borrador se recupera al volver (localStorage)')
    ok(await p.evaluate(async () => { const x = new TourBuilder({ id: 'otro' }); await x.ready; return x.toJSON().steps.length === 0 }), 'cada id tiene su propio borrador')
  }
})

test("el JSON exportado funciona tal cual en un Tour", async ({ nueva }) => {
  {
    const p = await nueva()
    await p.evaluate(() => { window.b = new TourBuilder({ storage: null }).open() })
    await clic(p, '.btn-export'); await p.evaluate(`${B('.card .title')}.value = 'Exportar'; ${B('.card .title')}.dispatchEvent(new Event('input'))`)
    await p.evaluate(() => b.close())
    const ok2 = await p.evaluate(async () => {
      const t = new Tour({ steps: JSON.parse(JSON.stringify(b.toJSON())).steps }); await t.start()
      await new Promise((r) => setTimeout(r, 400))
      const title = document.querySelector('[data-nexus-tours]').shadowRoot.querySelector('.gm-title').textContent
      t.destroy(); return title
    })
    ok(ok2 === 'Exportar', 'new Tour({ steps: json.steps }) funciona sin conversión')
  }
})

test("por CDN (dos <script>, sin bundler)", async ({ nuevoContexto }) => {
  {
    const p = await (await nuevoContexto({ viewport: { width: 1100, height: 700 } })).newPage()
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto(BASE + 'cdn-builder.html'); await p.waitForFunction(() => window.ready)
    ok(await p.evaluate(() => !!document.querySelector('[data-nexus-builder]')), 'cdn: el constructor abre con dos <script>')
    const c = await centro(p, '#a'); await p.mouse.move(c.x, c.y); await p.mouse.click(c.x, c.y); await p.waitForTimeout(150)
    ok(await p.evaluate(() => b.toJSON().steps[0]?.element === '#a'), 'cdn: elegir un elemento funciona')
    await p.evaluate(`${B('.foot .btn.pri')}.click()`); await p.waitForTimeout(500)
    ok(await p.evaluate(() => !!document.querySelector('[data-nexus-tours]')), 'cdn: probar usa el Tour del archivo global')
    ok(errs.length === 0, 'cdn: sin errores ' + errs.join('|'))
  }
})
