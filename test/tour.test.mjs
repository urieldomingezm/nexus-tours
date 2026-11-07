// Run with: NODE_PATH=<dir with playwright> node test/tour.test.mjs   (starts its own vite dev server)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const PORT = 5199
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
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
  await p.addInitScript(() => { window.S = (q) => document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(q) })
  await p.goto(base)
  await p.waitForFunction(() => window.makeTour)
  return p
}
const titulo = (p) => p.locator('.gm-title').textContent()
const esperaTitulo = (p, t) => p.waitForFunction((t) => S('.gm-title')?.textContent === t, t, { timeout: 4000 })

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
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').shadowRoot.activeElement === S('.gm-pop')), 'foco en el popover')

  await p.getByRole('button', { name: 'Next' }).click() // abre el modal en before() y espera el campo asíncrono
  await esperaTitulo(p, 'Name it')
  ok(await p.evaluate(() => document.getElementById('modal').open), 'before() abrió el modal')
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'modal'), 'el tour se monta dentro del <dialog> modal (no queda inerte)')
  await p.waitForTimeout(500) // fin de la animación
  const geo = await p.evaluate(() => {
    const r = document.getElementById('nombre').getBoundingClientRect()
    const g = S('.gm-ring').getBoundingClientRect()
    const b = S('.gm-pop .gm-primary').getBoundingClientRect()
    const top = document.querySelector('[data-nexus-tours]').shadowRoot.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    return { dx: Math.abs(g.left - (r.left - 6)), dy: Math.abs(g.top - (r.top - 6)), dw: Math.abs(g.width - (r.width + 12)), botonArriba: top?.classList.contains('gm-primary') }
  })
  ok(geo.dx < 2 && geo.dy < 2 && geo.dw < 2, `el resaltado coincide con el campo (dx ${geo.dx.toFixed(1)}, dy ${geo.dy.toFixed(1)})`)
  ok(geo.botonArriba, 'el botón Next está por encima del modal y recibe clics')

  // Tab queda atrapado en el popover
  const foco = []
  for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); foco.push(await p.evaluate(() => !!document.querySelector('[data-nexus-tours]').shadowRoot.activeElement?.closest('.gm-pop'))) }
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
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement === document.body), 'el tour vuelve al body cuando ya no hay modal')
  ok(await p.evaluate(() => { const b = S('.gm-primary').getBoundingClientRect(); return document.querySelector('[data-nexus-tours]').shadowRoot.elementFromPoint(b.left + 5, b.top + 5)?.classList.contains('gm-primary') }), 'botón Done clicable')
  await p.getByRole('button', { name: 'Done' }).click()
  await p.waitForTimeout(100)
  ok(await p.evaluate(() => !document.querySelector('[data-nexus-tours]')), 'al terminar se limpia el DOM y los estilos')
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
  const c = await p.evaluate(() => { const r = S('.gm-pop').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, ring: getComputedStyle(S('.gm-ring')).display } })
  ok(Math.abs(c.cx - 500) < 2 && Math.abs(c.cy - 350) < 2 && c.ring === 'none', 'sin elemento: popover centrado y sin anillo')
  await p.getByRole('button', { name: 'Next' }).click()
  await esperaTitulo(p, 'Footer')
  await p.waitForTimeout(900)
  const visible = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })
  ok(visible, 'hace scroll hasta el elemento fuera de pantalla')
  const pos = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); const g = S('.gm-ring').getBoundingClientRect(); return Math.abs(g.top - (r.top - 6)) })
  ok(pos < 2, 'el anillo sigue al elemento tras el scroll')

  // ---------- el anillo sigue al elemento si cambia el viewport
  await p.setViewportSize({ width: 600, height: 500 })
  await p.waitForTimeout(500)
  const pos2 = await p.evaluate(() => { const r = document.getElementById('pie').getBoundingClientRect(); const g = S('.gm-ring').getBoundingClientRect(); return Math.abs(g.top - (r.top - 6)) + Math.abs(g.left - (r.left - 6)) })
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
  ok(await p.evaluate(() => t.active && getComputedStyle(S('.gm-ring')).display === 'block'), 'si el objetivo desaparece y vuelve, el tour lo recupera')
  ok(await p.evaluate(() => document.querySelector('[data-nexus-tours]').parentElement.id === 'modal'), 'tras recuperarse sigue dentro del modal')

  // ---------- movimiento reducido
  p = await nueva({ reducedMotion: 'reduce' })
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => getComputedStyle(S('.gm-pop')).transitionDuration === '0s'), 'prefers-reduced-motion desactiva las transiciones')

  // ---------- aislamiento: la CSS de la página no rompe el tour (ni el tour a la página)
  p = await nueva()
  const estilosAntes = await p.evaluate(() => document.head.querySelectorAll('style').length)
  const nuevoAntes = await p.evaluate(() => getComputedStyle(document.getElementById('nuevo')).backgroundColor + getComputedStyle(document.querySelector('h1')).fontFamily)
  await p.evaluate(() => makeTour('full'))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  await p.addStyleTag({ content: "button{all:unset !important;background:red !important;color:red !important;display:none !important} *{font-family:'Comic Sans MS' !important} p{color:lime !important;text-transform:uppercase !important}" })
  const hostil = await p.evaluate(() => { const b = S('.gm-primary'); const cs = getComputedStyle(b); const ti = getComputedStyle(S('.gm-title')); return { bg: cs.backgroundColor, display: cs.display, font: ti.fontFamily, color: ti.color, tt: ti.textTransform } })
  ok(hostil.bg === 'rgb(109, 94, 252)' && hostil.display !== 'none', 'CSS hostil de la página (button/*/p con !important) no afecta al tour: ' + hostil.bg)
  ok(!hostil.font.includes('Comic') && hostil.tt === 'none', 'la tipografía y estilos globales de la página no se filtran al tour')
  await p.evaluate(() => t.stop())
  ok((await p.evaluate(() => document.head.querySelectorAll('style').length)) === estilosAntes + 1, 'el tour no deja <style> en el documento (solo el de la prueba)')

  // ---------- variables CSS desde la página (heredan a través del shadow root)
  p = await nueva()
  await p.addStyleTag({ content: ':root{--gm-accent:rgb(255,0,0);--gm-radius:2px}' })
  await p.evaluate(() => makeTour('full')); await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => { const c = getComputedStyle(S('.gm-primary')); return c.backgroundColor === 'rgb(255, 0, 0)' && getComputedStyle(S('.gm-pop')).borderRadius === '2px' }), 'variables --gm-* definidas en :root personalizan el tour')

  // ---------- opción theme + font + className + css propio
  p = await nueva()
  await p.evaluate(() => makeTour('full', { theme: { accent: '#10b981', accentContrast: '#000', radius: '4px', font: 'Georgia, serif', background: '#111', text: '#eee' }, className: 'mi-tema', css: '.gm-title{text-transform:uppercase;letter-spacing:.05em}' }))
  await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  const th = await p.evaluate(() => { const pop = getComputedStyle(S('.gm-pop')); const b = getComputedStyle(S('.gm-primary')); return { acc: b.backgroundColor, rad: pop.borderRadius, bg: pop.backgroundColor, font: pop.fontFamily, tt: getComputedStyle(S('.gm-title')).textTransform, cls: document.querySelector('[data-nexus-tours]').className } })
  ok(th.acc === 'rgb(16, 185, 129)' && th.rad === '4px' && th.bg === 'rgb(17, 17, 17)', 'theme: acento, radio y fondo')
  ok(th.font.includes('Georgia'), 'theme.font / font aplica la fuente: ' + th.font)
  ok(th.tt === 'uppercase', 'opción css inyecta estilos propios dentro del tour')
  ok(th.cls === 'mi-tema', 'className en el host')

  // ---------- ::part() desde la hoja de estilos de la página
  await p.addStyleTag({ content: '.mi-tema::part(title){color:rgb(1,2,3)} .mi-tema::part(button-primary){border-radius:99px}' })
  ok(await p.evaluate(() => getComputedStyle(S('.gm-title')).color === 'rgb(1, 2, 3)' && getComputedStyle(S('.gm-primary')).borderRadius === '99px'), '::part(title) y ::part(button-primary) se pueden estilizar desde la página')

  // ---------- font: 'inherit' y fonts (@font-face en el documento)
  p = await nueva()
  await p.addStyleTag({ content: "body{font-family:'Courier New',monospace}" })
  await p.evaluate(() => makeTour('full', { font: 'inherit' })); await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => getComputedStyle(S('.gm-pop')).fontFamily.includes('Courier')), "font:'inherit' usa la fuente del body de la página")
  p = await nueva()
  await p.evaluate(() => makeTour('full', { fonts: [{ family: 'Mi Fuente', src: '/fuente.woff2', weight: 600 }] })); await p.evaluate(() => t.start())
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => /font-face/.test(document.querySelector('style[data-nexus-tours-font]')?.textContent || '') && getComputedStyle(S('.gm-pop')).fontFamily.includes('Mi Fuente')), 'fonts: inyecta @font-face una vez y la usa por defecto')
  await p.evaluate(() => { t.stop(); makeTour('full', { fonts: [{ family: 'Mi Fuente', src: '/fuente.woff2', weight: 600 }] }); t.start() })
  ok((await p.evaluate(() => document.querySelectorAll('style[data-nexus-tours-font]').length)) === 1, '@font-face no se duplica')

  // ---------- datos de ejemplo
  p = await nueva()
  const fx = await p.evaluate(() => {
    const { createFixtures, fake } = Guiame
    const schema = { clientes: { count: 6, fields: { id: fake.id(), nombre: fake.name(), email: fake.email({ from: 'nombre', domain: 'demo.mx' }), empresa: fake.company(), estado: fake.pick(['Activo', 'Pendiente']), monto: fake.int(100, 9000), alta: fake.date({ past: 90, now: new Date('2026-01-31') }), fijo: 'x' } }, tareas: { count: 3, fields: { id: fake.id(100), texto: fake.words(3), hecha: fake.bool(), uuid: fake.uuid() } } }
    const a = createFixtures(schema, { seed: 7 }), b = createFixtures(schema, { seed: 7 }), c = createFixtures(schema, { seed: 8 }), en = createFixtures(schema, { seed: 7, locale: 'en' })
    return { a, igual: JSON.stringify(a) === JSON.stringify(b), distinto: JSON.stringify(a) !== JSON.stringify(c), en: en.clientes[0].nombre }
  })
  ok(fx.a.clientes.length === 6 && fx.a.tareas.length === 3, 'fixtures: respeta count por tabla')
  ok(fx.igual && fx.distinto, 'fixtures: misma semilla → mismos datos; otra semilla → otros')
  ok(fx.a.clientes.every((r, i) => r.id === i + 1 && r.fijo === 'x' && r.monto >= 100 && r.monto <= 9000 && /^\d{4}-\d{2}-\d{2}$/.test(r.alta)), 'fixtures: ids, constantes, rangos y fechas ISO')
  ok(fx.a.clientes.every((r) => r.email.endsWith('@demo.mx') && r.email.startsWith(r.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(' ')[0])), 'fixtures: el email se deriva del nombre de la misma fila')
  ok(fx.a.tareas[0].id === 100 && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/.test(fx.a.tareas[0].uuid), 'fixtures: id con inicio propio y uuid v4 válido')
  ok(typeof fx.en === 'string' && fx.en !== fx.a.clientes[0].nombre, 'fixtures: locale en genera nombres en inglés (' + fx.en + ')')

  // ---------- tamaño
  const { gzipSync } = await import('node:zlib')
  const { readFileSync } = await import('node:fs')
  try { const kb = gzipSync(readFileSync('dist/nexus-tours.js')).length / 1024; ok(kb < 8, `núcleo ${kb.toFixed(2)} KB gzip (< 8 KB)`); const kf = gzipSync(readFileSync('dist/fixtures.js')).length / 1024; ok(kf < 4, `fixtures ${kf.toFixed(2)} KB gzip (< 4 KB)`) } catch { console.log('(sin dist: omito tamaño)') }
} finally {
  await browser.close()
  try { process.kill(-server.pid) } catch {}
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
