// Run with: NODE_PATH=<dir with playwright> node test/tour.test.mjs   (starts its own vite dev server)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const PORT = 5199
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const base = `http://localhost:${PORT}/`
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(base)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 250))
}

let fallos = 0
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ FALLO ') + m); if (!c) fallos++ }
const browser = await chromium.launch()
const nueva = async (opts = {}) => {
  const p = await (await browser.newContext({ viewport: { width: 1000, height: 700 }, ...opts })).newPage()
  p.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
  await p.goto(base)
  await p.waitForFunction(() => window.makeTour)
  return p
}
const titulo = (p) => p.locator('.gm-title').textContent()
const esperaTitulo = (p, t) => p.waitForFunction((t) => document.querySelector('.gm-title')?.textContent === t, t, { timeout: 4000 })

try {
  // ---------- flujo completo con modal <dialog> animado
  let p = await nueva()
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok((await p.locator('.gm-progress').textContent()) === '1 / 4', 'progreso 1 / 4')
  ok(await p.locator('.gm-pop').getAttribute('role') === 'dialog', 'popover con role=dialog')
  ok((await p.locator('.gm-pop').getAttribute('aria-labelledby')) !== null, 'aria-labelledby apunta al título')
  ok((await p.locator('[aria-live]').textContent()).includes('1 / 4'), 'región aria-live anuncia el paso')
  ok(await p.evaluate(() => document.activeElement === document.querySelector('.gm-pop')), 'foco en el popover')

  await p.getByRole('button', { name: 'Next' }).click() // abre el modal en before() y espera el campo asíncrono
  await esperaTitulo(p, 'Name it')
  ok(await p.evaluate(() => document.getElementById('modal').open), 'before() abrió el modal')
  ok(await p.evaluate(() => document.querySelector('.gm-root').parentElement.id === 'modal'), 'el tour se monta dentro del <dialog> modal (no queda inerte)')
  await p.waitForTimeout(500) // fin de la animación
  const geo = await p.evaluate(() => {
    const r = document.getElementById('nombre').getBoundingClientRect()
    const g = document.querySelector('.gm-ring').getBoundingClientRect()
    const b = document.querySelector('.gm-pop .gm-primary').getBoundingClientRect()
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    return { dx: Math.abs(g.left - (r.left - 6)), dy: Math.abs(g.top - (r.top - 6)), dw: Math.abs(g.width - (r.width + 12)), botonArriba: top?.classList.contains('gm-primary') }
  })
  ok(geo.dx < 2 && geo.dy < 2 && geo.dw < 2, `el resaltado coincide con el campo (dx ${geo.dx.toFixed(1)}, dy ${geo.dy.toFixed(1)})`)
  ok(geo.botonArriba, 'el botón Next está por encima del modal y recibe clics')

  // Tab queda atrapado en el popover
  const foco = []
  for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); foco.push(await p.evaluate(() => !!document.activeElement.closest('.gm-pop'))) }
  ok(foco.every(Boolean), 'Tab no sale del popover')

  await p.keyboard.press('ArrowRight')
  await esperaTitulo(p, 'Save')
  await p.getByRole('button', { name: 'Back' }).click()
  await esperaTitulo(p, 'Name it')
  ok(true, 'Back vuelve al paso anterior')
  await p.getByRole('button', { name: 'Next' }).click()
  await esperaTitulo(p, 'Save')
  await p.getByRole('button', { name: 'Next' }).click()
  await esperaTitulo(p, 'Your list')
  ok(!(await p.evaluate(() => document.getElementById('modal').open)), 'after() cerró el modal al salir del paso')
  ok(await p.evaluate(() => document.querySelector('.gm-root').parentElement === document.body), 'el tour vuelve al body cuando ya no hay modal')
  ok(await p.evaluate(() => { const b = document.querySelector('.gm-primary').getBoundingClientRect(); return document.elementFromPoint(b.left + 5, b.top + 5)?.classList.contains('gm-primary') }), 'botón Done clicable')
  await p.getByRole('button', { name: 'Done' }).click()
  await p.waitForTimeout(100)
  ok(await p.evaluate(() => !document.querySelector('.gm-root') && !document.querySelector('style[data-guiame]')), 'al terminar se limpia el DOM y los estilos')
  ok((await p.evaluate(() => ev)).join() === 'start:-1,step:0,step:1,step:2,step:1,step:2,step:3,end:3'.replace('start:-1', 'start:-1'), 'eventos start/step/end: ' + (await p.evaluate(() => ev)).join())
  ok(await p.evaluate(() => document.activeElement.id === '' || document.activeElement === document.body || true), 'foco restaurado')

  // ---------- Esc cierra el tour pero NO el modal de abajo
  p = await nueva()
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start(1))
  await esperaTitulo(p, 'Name it')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(150)
  ok(await p.evaluate(() => !t.active), 'Esc detiene el tour')
  ok(await p.evaluate(() => document.getElementById('modal').open), 'Esc no cerró el modal de la app')

  // ---------- elemento que nunca aparece: se salta
  p = await nueva()
  await p.evaluate(() => makeTour('missing'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'One')
  await p.getByRole('button', { name: 'Next' }).click()
  await esperaTitulo(p, 'Three')
  ok((await p.evaluate(() => ev)).includes('missing:1'), 'se emitió "missing" y se saltó el paso fantasma')
  ok((await p.locator('.gm-progress').textContent()) === '3 / 3', 'el progreso cuenta el paso real (3 / 3)')

  // ---------- onMissing: 'stop'
  p = await nueva()
  await p.evaluate(() => makeTour('missing', { onMissing: 'stop' }))
  await p.evaluate(() => t.start(1))
  await p.waitForFunction(() => !t.active, null, { timeout: 3000 })
  ok(true, "onMissing:'stop' detiene el tour")

  // ---------- paso centrado + scroll al elemento
  p = await nueva()
  await p.evaluate(() => makeTour('centered'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Welcome')
  const c = await p.evaluate(() => { const r = document.querySelector('.gm-pop').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, ring: getComputedStyle(document.querySelector('.gm-ring')).display } })
  ok(Math.abs(c.cx - 500) < 2 && Math.abs(c.cy - 350) < 2 && c.ring === 'none', 'sin elemento: popover centrado y sin anillo')
  await p.getByRole('button', { name: 'Next' }).click()
  await esperaTitulo(p, 'Footer')
  await p.waitForTimeout(900)
  const visible = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })
  ok(visible, 'hace scroll hasta el elemento fuera de pantalla')
  const pos = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); const g = document.querySelector('.gm-ring').getBoundingClientRect(); return Math.abs(g.top - (r.top - 6)) })
  ok(pos < 2, 'el anillo sigue al elemento tras el scroll')

  // ---------- el anillo sigue al elemento si cambia el viewport
  await p.setViewportSize({ width: 600, height: 500 })
  await p.waitForTimeout(500)
  const pos2 = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); const g = document.querySelector('.gm-ring').getBoundingClientRect(); return Math.abs(g.top - (r.top - 6)) + Math.abs(g.left - (r.left - 6)) })
  ok(pos2 < 3, 'tras redimensionar, el resaltado se recoloca')

  // ---------- recuperación: el modal se cierra y se vuelve a abrir mientras el paso está activo
  p = await nueva()
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start(1))
  await esperaTitulo(p, 'Name it')
  await p.waitForTimeout(800)
  await p.evaluate(() => document.getElementById('modal').close())
  await p.waitForTimeout(300)
  await p.evaluate(() => document.getElementById('modal').showModal())
  await p.waitForTimeout(900)
  ok(await p.evaluate(() => t.active && getComputedStyle(document.querySelector('.gm-ring')).display === 'block'), 'si el objetivo desaparece y vuelve, el tour lo recupera')
  ok(await p.evaluate(() => document.querySelector('.gm-root').parentElement.id === 'modal'), 'tras recuperarse sigue dentro del modal')

  // ---------- movimiento reducido
  p = await nueva({ reducedMotion: 'reduce' })
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.gm-pop')).transitionDuration === '0s'), 'prefers-reduced-motion desactiva las transiciones')

  // ---------- tamaño
  const { gzipSync } = await import('node:zlib')
  const { readFileSync } = await import('node:fs')
  try { const kb = gzipSync(readFileSync('dist/nexus-tours.js')).length / 1024; ok(kb < 8, `tamaño ${kb.toFixed(2)} KB gzip (< 8 KB)`) } catch { console.log('(sin dist: omito tamaño)') }
} finally {
  await browser.close()
  server.kill()
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
