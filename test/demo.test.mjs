// Demo de portafolio: se sirve la carpeta estática demo-dist y se hace el recorrido como un usuario.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')
if (!existsSync('demo-dist/index.html')) { console.log('(sin demo-dist: omito test de la demo)'); process.exit(0) }

const PORT = 5195
const server = spawn('python3', ['-m', 'http.server', String(PORT), '-d', 'demo-dist'], { stdio: 'ignore', detached: true })
const base = `http://localhost:${PORT}/`
for (let i = 0; i < 40; i++) { try { if ((await fetch(base)).ok) break } catch {} await new Promise((r) => setTimeout(r, 150)) }
let fallos = 0
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ FALLO ') + m); if (!c) fallos++ }
const browser = await chromium.launch()
const shot = process.env.SHOTS

async function recorrido(p, etiqueta) {
  const host = () => p.locator('[data-nexus-tours]')
  const T = (q) => host().locator(q)
  const title = async () => (await T('.gm-title').textContent())?.trim()
  await p.goto(base); await p.waitForSelector('#filas tr')
  ok((await p.locator('#filas tr').count()) === 3 && (await p.textContent('#origen')).includes('Datos reales'), `${etiqueta}: carga con 3 empleados reales`)
  await p.click('#empezar'); await p.waitForTimeout(500)
  await T('.gm-title').waitFor()
  ok((await title()).includes('Bienvenido'), `${etiqueta}: abre con la tarjeta de bienvenida`)
  ok((await p.textContent('#origen')).includes('Modo práctica') && (await p.locator('#filas tr').count()) === 5, `${etiqueta}: modo práctica muestra 5 empleados de ejemplo`)
  if (shot) await p.screenshot({ path: `/home/claude/demo-${etiqueta}-1.png` })
  await T('.gm-primary').first().click()
  await p.waitForTimeout(500)
  ok((await title()).includes('equipo'), `${etiqueta}: paso de estadísticas`)
  if (shot) await p.screenshot({ path: `/home/claude/demo-${etiqueta}-2.png` })
  await T('.gm-primary').first().click()
  await p.waitForTimeout(500)
  ok((await title()).includes('alta'), `${etiqueta}: paso interactivo "Nuevo empleado"`)
  await p.click('#nuevo')
  await p.waitForFunction(() => document.querySelector('#nombre') && !document.querySelector('#form').hidden)
  await p.waitForTimeout(700)
  ok((await title()).includes('nombre'), `${etiqueta}: avanza solo al abrir el modal`)
  if (shot) await p.screenshot({ path: `/home/claude/demo-${etiqueta}-3.png` })
  await p.fill('#nombre', 'Zo'); await p.waitForTimeout(1000)
  ok((await title()).includes('nombre'), `${etiqueta}: con 2 letras no avanza`)
  await p.fill('#nombre', 'Zoé Prueba'); await p.waitForTimeout(1200)
  ok((await title()).includes('Guarda'), `${etiqueta}: con 3+ letras avanza`)
  await p.click('#guardar'); await p.waitForTimeout(1200)
  ok((await title()).includes('está'), `${etiqueta}: tras guardar (aunque el modal se cierre) avanza a la lista`)
  ok((await p.locator('#filas tr').count()) === 6 && (await p.textContent('#filas')).includes('Zoé Prueba'), `${etiqueta}: el empleado aparece (en práctica)`)
  if (shot) await p.screenshot({ path: `/home/claude/demo-${etiqueta}-4.png` })
  await T('.gm-primary').first().click(); await p.waitForTimeout(500)
  ok((await title()).includes('todo'), `${etiqueta}: tarjeta final`)
  await T('.gm-primary').first().click(); await p.waitForTimeout(600)
  ok((await p.locator('#filas tr').count()) === 3 && (await p.textContent('#origen')).includes('Datos reales'), `${etiqueta}: al terminar vuelven los datos reales, sin Zoé`)
}
try {
  const d = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  d.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
  await recorrido(d, 'pc')
  const m = await (await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })).newPage()
  m.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
  await recorrido(m, 'movil')
  const e = await (await browser.newContext({ viewport: { width: 700, height: 600 } })).newPage()
  await e.goto(base + '?embed=1'); await e.waitForSelector('#filas tr')
  ok(!(await e.locator('aside').isVisible()), 'embed=1 oculta la barra lateral')
} catch (e) { console.log('✗ EXCEPCIÓN', e.message); fallos++ }
finally { await browser.close(); try { process.kill(-server.pid) } catch {} }
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
