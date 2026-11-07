// Demo de portafolio: se sirve la carpeta compilada demo-dist y se hace el recorrido como un usuario.
import { existsSync } from 'node:fs'
import { test, ok, DEMO } from './utilidades.mjs'

test.skip(!existsSync('demo-dist/index.html'), 'sin demo-dist: corre antes `npm run build:demo`')

async function recorrido(p, etiqueta) {
  const host = () => p.locator('[data-nexus-tours]')
  const T = (q) => host().locator(q)
  const title = async () => (await T('.gm-title').textContent())?.trim()
  await p.goto(DEMO); await p.waitForSelector('#filas tr')
  ok((await p.locator('#filas tr').count()) === 3 && (await p.textContent('#origen')).includes('Datos reales'), `${etiqueta}: carga con 3 empleados reales`)
  await p.click('#empezar'); await p.waitForTimeout(500)
  await T('.gm-title').waitFor()
  ok((await title()).includes('Bienvenido'), `${etiqueta}: abre con la tarjeta de bienvenida`)
  ok((await p.textContent('#origen')).includes('Modo práctica') && (await p.locator('#filas tr').count()) === 5, `${etiqueta}: modo práctica muestra 5 empleados de ejemplo`)
    await T('.gm-primary').first().click()
  await p.waitForTimeout(500)
  ok((await title()).includes('equipo'), `${etiqueta}: paso de estadísticas`)
    await T('.gm-primary').first().click()
  await p.waitForTimeout(500)
  ok((await title()).includes('alta'), `${etiqueta}: paso interactivo "Nuevo empleado"`)
  await p.click('#nuevo')
  await p.waitForFunction(() => document.querySelector('#nombre') && !document.querySelector('#form').hidden)
  await p.waitForTimeout(700)
  ok((await title()).includes('nombre'), `${etiqueta}: avanza solo al abrir el modal`)
    await p.fill('#nombre', 'Zo'); await p.waitForTimeout(1000)
  ok((await title()).includes('nombre'), `${etiqueta}: con 2 letras no avanza`)
  await p.fill('#nombre', 'Zoé Prueba'); await p.waitForTimeout(1200)
  ok((await title()).includes('Guarda'), `${etiqueta}: con 3+ letras avanza`)
  await p.click('#guardar'); await p.waitForTimeout(1200)
  ok((await title()).includes('está'), `${etiqueta}: tras guardar (aunque el modal se cierre) avanza a la lista`)
  ok((await p.locator('#filas tr').count()) === 6 && (await p.textContent('#filas')).includes('Zoé Prueba'), `${etiqueta}: el empleado aparece (en práctica)`)
    await T('.gm-primary').first().click(); await p.waitForTimeout(500)
  ok((await title()).includes('todo'), `${etiqueta}: tarjeta final`)
  await T('.gm-primary').first().click(); await p.waitForTimeout(600)
  ok((await p.locator('#filas tr').count()) === 3 && (await p.textContent('#origen')).includes('Datos reales'), `${etiqueta}: al terminar vuelven los datos reales, sin Zoé`)
}
test('demo en escritorio', async ({ nuevoContexto, vigilar }) => {
  await recorrido(vigilar(await (await nuevoContexto({ viewport: { width: 1280, height: 800 } })).newPage()), 'pc')
})

test('demo en celular', async ({ nuevoContexto, vigilar }) => {
  await recorrido(vigilar(await (await nuevoContexto({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })).newPage()), 'movil')
})

test('embed=1 oculta la barra lateral', async ({ nuevoContexto }) => {
  const e = await (await nuevoContexto({ viewport: { width: 700, height: 600 } })).newPage()
  await e.goto(DEMO + '?embed=1'); await e.waitForSelector('#filas tr')
  ok(!(await e.locator('aside').isVisible()), 'embed=1 oculta la barra lateral')
})
