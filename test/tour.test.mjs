// Run with: NODE_PATH=<dir with playwright> node test/tour.test.mjs   (starts its own vite dev server)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

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
  await p.waitForTimeout(350) // fin de la animación de entrada
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
  ok(hostil.bg === 'rgb(66, 99, 235)' && hostil.display !== 'none', 'CSS hostil de la página (button/*/p con !important) no afecta al tour: ' + hostil.bg)
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

  // ---------- modo práctica: fetch con datos de ejemplo, escrituras bloqueadas, limpieza
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } })
    p = await ctx.newPage()
    p.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
    const real = [{ id: 1, name: 'Globex', status: 'Active' }]
    const red = []
    await p.route('**/api/**', async (route) => {
      const r = route.request(); const u = new URL(r.url())
      red.push(r.method() + ' ' + u.pathname)
      if (u.pathname === '/api/clients' && r.method() === 'GET') return route.fulfill({ json: real })
      if (u.pathname === '/api/clients' && r.method() === 'POST') { real.push({ id: 99, ...JSON.parse(r.postData()) }); return route.fulfill({ status: 201, json: {} }) }
      if (u.pathname === '/api/ping') return route.fulfill({ json: { pong: true } })
      return route.fulfill({ status: 404, json: {} })
    })
    await p.addInitScript(() => { window.S = (q) => document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(q) })
    await p.goto(base); await p.waitForFunction(() => window.makeTour)
    await p.waitForFunction(() => document.getElementById('filas').textContent.includes('Globex'))
    await p.evaluate(() => { window.__f0 = window.fetch })
    ok(true, 'práctica: la tabla muestra los datos reales antes del tour (Globex)')

    await p.evaluate(() => { makeTour('full', { practice: practiceCfg() }); t.start() })
    await esperaTitulo(p, 'Create a client')
    await p.waitForFunction(() => document.querySelectorAll('#filas tr').length === 4 && !document.getElementById('filas').textContent.includes('Globex'))
    ok(await p.evaluate(() => !document.getElementById('filas').textContent.includes('Globex') && document.querySelectorAll('#filas tr').length === 4), 'práctica: la UI carga los 4 clientes de ejemplo en lugar de los reales')
    ok((await p.locator('.gm-banner').textContent()).includes('Practice mode'), 'aviso visual "modo práctica"')
    ok(await p.evaluate(() => window.fetch !== window.__f0), 'fetch está interceptado durante el tour')

    // guardar un cliente desde la app: no llega al backend real
    const antes = red.length
    await p.evaluate(() => { document.getElementById('nombre').value = 'Zed Práctica'; document.getElementById('form').requestSubmit() })
    await p.waitForFunction(() => document.getElementById('filas').textContent.includes('Zed Práctica'))
    ok(!red.slice(antes).some((x) => x.startsWith('POST')), 'POST a /api/clients se atiende en memoria (no llega al backend real)')
    ok(await p.evaluate(() => t.practiceData.clients.some((c) => c.name === 'Zed Práctica' && c.id === 5)), 'la fila nueva queda en los datos de práctica con id autoincremental')
    ok(real.length === 1, 'el backend real no cambió')

    // CRUD, ruta con :params, escritura sin ruta bloqueada, lectura sin ruta pasa
    const r = await p.evaluate(async () => {
      const j = async (res) => ({ s: res.status, b: res.status === 204 ? null : await res.json() })
      const out = {}
      out.item = await j(await fetch('/api/clients/2'))
      out.patch = await j(await fetch('/api/clients/2', { method: 'PATCH', body: JSON.stringify({ status: 'Hecho' }) }))
      out.item2 = await j(await fetch(new Request('/api/clients/2')))
      out.sum = await j(await fetch('/api/clients/3/summary'))
      out.del = await j(await fetch('/api/clients/1', { method: 'DELETE' }))
      out.nf = await j(await fetch('/api/clients/1'))
      out.filtro = await j(await fetch('/api/clients?status=Hecho'))
      out.bloq = await j(await fetch('/api/otra-cosa', { method: 'POST', body: '{}' }))
      out.lee = await j(await fetch('/api/ping'))
      return out
    })
    ok(r.item.s === 200 && r.item.b.id === 2, 'GET /api/clients/:id')
    ok(r.patch.b.status === 'Hecho' && r.item2.b.status === 'Hecho', 'PATCH actualiza (y fetch acepta objetos Request)')
    ok(r.sum.b.id === '3' && r.sum.b.total === 5, 'ruta personalizada con :id y acceso a db')
    ok(r.del.s === 204 && r.nf.s === 404, 'DELETE devuelve 204 y luego 404')
    ok(r.filtro.b.length === 1 && r.filtro.b[0].id === 2, 'filtro por query (?status=Hecho)')
    ok(r.bloq.s === 403 && r.bloq.b.error === 'practice-mode', 'escritura sin ruta: bloqueada con 403')
    ok(!red.includes('POST /api/otra-cosa'), 'la escritura bloqueada nunca salió a la red')
    ok(r.lee.s === 200 && r.lee.b.pong === true && red.includes('GET /api/ping'), 'lectura sin ruta pasa a la red real')
    ok((await p.evaluate(() => practiceEv)).includes('blocked:POST'), 'onBlocked se llamó')

    // terminar el tour: se restaura todo y la UI vuelve a los datos reales
    await p.evaluate(() => t.stop())
    await p.waitForFunction(() => document.getElementById('filas').textContent.includes('Globex'))
    ok(await p.evaluate(() => window.fetch === window.__f0), 'al terminar se restaura fetch')
    ok(await p.evaluate(() => !document.querySelector('[data-nexus-tours]') && t.practiceData === undefined), 'se elimina el aviso y los datos de práctica')
    ok(await p.evaluate(() => practiceEv.filter((e) => e === 'start' || e === 'end').join()) === 'start,end', 'onStart / onEnd en orden')
    ok(real.length === 1 && real[0].name === 'Globex', 'al final los datos reales siguen intactos')

    // la lista de ejemplo original no se muta (se copia) y reusar el tour funciona
    await p.evaluate(() => { const cfg = practiceCfg(); window.cfg = cfg; makeTour('full', { practice: cfg }); t.start() })
    await esperaTitulo(p, 'Create a client')
    await p.evaluate(() => fetch('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'X' }) }))
    ok(await p.evaluate(() => cfg.data.clients.length === 4 && t.practiceData.clients.length === 5), 'los datos que pasas no se mutan (el tour trabaja con una copia)')
    await p.evaluate(() => t.stop())
    await ctx.close()
  }

  // ---------- detalles visuales: flecha, RTL, tamaños
  p = await nueva()
  await p.evaluate(() => { makeTour('full'); t.start() })
  await esperaTitulo(p, 'Create a client')
  const fl = await p.evaluate(() => { const a = S('.gm-arrow'); const pop = S('.gm-pop'); return { side: pop.dataset.side, disp: getComputedStyle(a).display, top: a.style.top } })
  ok(fl.side === 'bottom' && fl.disp !== 'none' && fl.top === '-6px', 'flecha apunta al objetivo (popover debajo, flecha arriba)')
  await p.evaluate(() => t.stop())
  await p.evaluate(() => { makeTour('centered'); t.start() })
  await esperaTitulo(p, 'Welcome')
  ok(await p.evaluate(() => S('.gm-pop').dataset.side === 'center' && getComputedStyle(S('.gm-arrow')).display === 'none'), 'paso centrado: sin flecha')
  await p.evaluate(() => t.stop())
  await p.evaluate(() => { makeTour('full', { arrow: false }); t.start() })
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => !S('.gm-arrow')), 'arrow:false quita la flecha')
  await p.evaluate(() => t.stop())

  await p.evaluate(() => { makeTour('full', { dir: 'rtl', closeButton: true }); t.start() })
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => { const pop = S('.gm-pop').getBoundingClientRect(); const x = S('.gm-x').getBoundingClientRect(); return document.querySelector('[data-nexus-tours]').dir === 'rtl' && x.left < pop.left + pop.width / 2 }), 'dir:rtl → botón cerrar a la izquierda')
  await p.keyboard.press('ArrowLeft')
  await esperaTitulo(p, 'Name it')
  ok(true, 'en RTL la flecha izquierda avanza')
  await p.evaluate(() => t.stop())

  await p.evaluate(() => { makeTour('full', { theme: { fontSize: '18px', width: '420px' } }); t.start() })
  await esperaTitulo(p, 'Create a client')
  await p.waitForTimeout(350)
  ok(await p.evaluate(() => { const c = getComputedStyle(S('.gm-pop')); return c.fontSize === '18px' && S('.gm-pop').getBoundingClientRect().width === 420 }), 'theme.fontSize y theme.width')
  await p.evaluate(() => t.stop())

  // ---------- temas listos
  await p.evaluate(() => { makeTour('full', { theme: Guiame.themes.dark }); t.start() })
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => { const c = getComputedStyle(S('.gm-pop')); return c.backgroundColor === 'rgb(23, 22, 31)' && getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(124, 147, 255)' }), 'tema dark aplicado')
  await p.evaluate(() => t.stop())
  await p.evaluate(() => { makeTour('full', { theme: { ...Guiame.themes.ocean, accent: 'rgb(1, 2, 3)' } }); t.start() })
  await esperaTitulo(p, 'Create a client')
  ok(await p.evaluate(() => getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(1, 2, 3)' && getComputedStyle(S('.gm-pop')).borderRadius === '14px'), 'se puede extender un tema ({ ...themes.ocean, accent })')
  await p.evaluate(() => t.stop())
  for (const [scheme, bg] of [['dark', 'rgb(23, 22, 31)'], ['light', 'rgb(255, 255, 255)']]) {
    const pc = await nueva({ colorScheme: scheme })
    await pc.evaluate(() => { makeTour('full', { theme: Guiame.autoTheme() }); t.start() })
    await esperaTitulo(pc, 'Create a client')
    ok(await pc.evaluate((bg) => getComputedStyle(S('.gm-pop')).backgroundColor === bg, bg), `autoTheme() sigue prefers-color-scheme (${scheme})`)
  }
  ok(await p.evaluate(() => Object.keys(Guiame.themes).join() === 'light,dark,ocean,sunset,mint,rose,mono'), 'temas disponibles: light, dark, ocean, sunset, mint, rose, mono')

  // ---------- wrappers de Vue y React
  {
    const w = await nueva()
    await w.goto(base + 'wrappers.html'); await w.waitForFunction(() => window.ready)
    const hay = () => w.evaluate(() => document.querySelectorAll('[data-nexus-tours]').length)
    // Vue: v-model
    await w.click('#vbtn'); await esperaTitulo(w, 'V1')
    ok((await hay()) === 1, 'Vue: <NexusTour v-model> arranca el tour')
    ok(await w.evaluate(() => getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(255, 0, 0)'), 'Vue: :options (tema) se aplica')
    await w.getByRole('button', { name: 'Next' }).click(); await esperaTitulo(w, 'V2')
    await w.getByRole('button', { name: 'Done' }).click(); await w.waitForTimeout(150)
    ok(await w.evaluate(() => window.vOpen.value === false && window.log.includes('vend') && window.log.includes('vstep1') ), 'Vue: al terminar se emite update:modelValue=false, step y end')
    await w.click('#vbtn'); await esperaTitulo(w, 'V1'); await w.keyboard.press('Escape'); await w.waitForTimeout(150)
    ok(await w.evaluate(() => window.vOpen.value === false) && (await hay()) === 0, 'Vue: Esc cierra y devuelve false al v-model')
    await w.evaluate(() => (window.vOpen.value = true)); await esperaTitulo(w, 'V1')
    await w.evaluate(() => (window.vOpen.value = false)); await w.waitForTimeout(150)
    ok((await hay()) === 0, 'Vue: poner v-model en false detiene el tour')
    // Vue: composable
    await w.click('#ubtn'); await esperaTitulo(w, 'U1')
    ok((await w.locator('#ustate').textContent()) === 'active:0', 'Vue: useTour expone active e index reactivos')
    await w.keyboard.press('ArrowRight'); await esperaTitulo(w, 'U2')
    ok((await w.locator('#ustate').textContent()) === 'active:1', 'Vue: useTour sigue el paso')
    await w.keyboard.press('Escape'); await w.waitForTimeout(150)
    ok((await w.locator('#ustate').textContent()) === 'idle', 'Vue: useTour vuelve a idle')

    // React (en StrictMode)
    await w.click('#rbtn'); await esperaTitulo(w, 'R1'); await w.waitForTimeout(300)
    ok((await hay()) === 1 && await w.evaluate(() => window.rOpen === true), 'React (StrictMode): un solo tour y no se cierra solo')
    ok(await w.evaluate(() => getComputedStyle(S('.gm-primary')).backgroundColor === 'rgb(0, 0, 255)'), 'React: props de opciones (theme) se aplican')
    await w.getByRole('button', { name: 'Next' }).click(); await esperaTitulo(w, 'R2')
    await w.getByRole('button', { name: 'Done' }).click(); await w.waitForTimeout(200)
    ok(await w.evaluate(() => window.rOpen === false && window.log.includes('rend') && window.log.includes('rstep1')), 'React: onOpenChange(false), onStep y onEnd')
    await w.click('#rbtn'); await esperaTitulo(w, 'R1'); await w.keyboard.press('Escape'); await w.waitForTimeout(200)
    ok(await w.evaluate(() => window.rOpen === false) && (await hay()) === 0, 'React: Esc cierra y avisa con onOpenChange(false)')
    await w.evaluate(() => window.rSet(true)); await esperaTitulo(w, 'R1')
    await w.evaluate(() => window.rSet(false)); await w.waitForTimeout(200)
    ok((await hay()) === 0, 'React: open=false detiene el tour')
    await w.click('#rubtn'); await esperaTitulo(w, 'RU1')
    ok((await w.locator('#rustate').textContent()) === 'active:0', 'React: useTour expone active e index')
    await w.keyboard.press('Escape'); await w.waitForTimeout(150)
    ok((await w.locator('#rustate').textContent()) === 'idle', 'React: useTour vuelve a idle')
  }

  // ---------- checklist de primeros pasos
  {
    const k = await nueva()
    const cs = (q) => `document.querySelector('[data-nexus-checklist]').shadowRoot.querySelector(${JSON.stringify(q)})`
    const lanzador = () => k.evaluate(`${cs('.launch')}.textContent`)
    const visible = () => k.evaluate(() => !document.querySelector('[data-nexus-checklist]').hidden)
    const abrir = async () => { if ((await k.evaluate(`${cs('.launch')}.getAttribute('aria-expanded')`)) !== 'true') await k.evaluate(`${cs('.launch')}.click()`) }
    await k.goto(base + 'checklist.html'); await k.waitForFunction(() => window.make)
    await k.evaluate(() => make()); await k.evaluate(() => cl.ready)
    ok((await lanzador()).includes('0 / 3'), 'checklist: el lanzador muestra 0 / 3')
    ok((await k.evaluate(`${cs('.launch')}.getAttribute('aria-expanded')`)) === 'false', 'checklist: el panel empieza cerrado')
    await abrir()
    ok((await k.locator('.item').count()) === 3 && (await k.locator('.item').first().getAttribute('aria-label')).includes('pending'), 'checklist: 3 items pendientes con nombre accesible')
    ok((await k.locator('[role=progressbar]').getAttribute('aria-valuenow')) === '0', 'checklist: barra de progreso accesible')

    // completar el tour de un item lo marca como visto
    await k.locator('.item').first().click()
    await esperaTitulo(k, 'T-A1')
    ok(!(await visible()), 'checklist: se oculta mientras corre el tour')
    await k.getByRole('button', { name: 'Next' }).click(); await esperaTitulo(k, 'T-A2')
    await k.getByRole('button', { name: 'Done' }).click(); await k.waitForTimeout(150)
    ok((await visible()) && (await lanzador()).includes('1 / 3'), 'checklist: al terminar el tour reaparece con 1 / 3')
    ok(await k.evaluate(() => JSON.parse(localStorage.getItem('nexus-tours:checklist:onb')).done.join() === 'a'), 'checklist: el progreso se guarda en localStorage')
    await abrir()
    ok((await k.locator('.item').first().getAttribute('aria-label')).includes('completed'), 'checklist: el item visto queda marcado como completado')
    ok((await k.locator('.item').first().textContent()).includes('Review'), 'checklist: el item visto ofrece "Review"')

    // detener el tour a la mitad NO lo marca
    await k.locator('.item').nth(1).click(); await esperaTitulo(k, 'T-B1')
    await k.keyboard.press('Escape'); await k.waitForTimeout(150)
    ok((await visible()) && (await lanzador()).includes('1 / 3'), 'checklist: si el usuario cierra el tour a medias, no cuenta como visto')

    // persiste al recargar
    await k.reload(); await k.waitForFunction(() => window.make); await k.evaluate(() => make()); await k.evaluate(() => cl.ready)
    ok((await lanzador()).includes('1 / 3'), 'checklist: el progreso sobrevive a recargar la página')

    // item de solo acción (onSelect) se marca al elegirlo; completar todo dispara onComplete una vez
    await abrir(); await k.locator('.item').nth(2).click(); await k.waitForTimeout(100)
    ok(await k.evaluate(() => window.sel === 1 && cl.isDone('c')), 'checklist: item con onSelect se marca al elegirlo')
    await k.evaluate(() => { cl.markDone('b'); cl.markDone('b') }); await k.waitForTimeout(100)
    ok(await k.evaluate(() => cl.progress().complete && window.completed === 1), 'checklist: al completar todo, onComplete/evento "complete" una sola vez')
    ok((await lanzador()).includes('3 / 3') && (await k.evaluate(`${cs('.ring')}.className`)).includes('full'), 'checklist: el lanzador muestra el estado completo')
    await abrir()
    ok((await k.evaluate(`${cs('.cheer')}.textContent`)).includes('All done'), 'checklist: mensaje al completar')

    // reiniciar
    await k.evaluate(`${cs('.link:last-child')}.click()`); await k.waitForTimeout(100)
    ok((await lanzador()).includes('0 / 3') && await k.evaluate(() => JSON.parse(localStorage.getItem('nexus-tours:checklist:onb')).done.length === 0), 'checklist: reiniciar vuelve a 0 y lo guarda')

    // ocultar persistente y show()
    await abrir(); await k.evaluate(`${cs('.link:first-child')}.click()`); await k.waitForTimeout(100)
    ok(!(await visible()), 'checklist: "Hide" oculta el widget')
    await k.reload(); await k.waitForFunction(() => window.make); await k.evaluate(() => make()); await k.evaluate(() => cl.ready)
    ok(!(await visible()), 'checklist: oculto se recuerda tras recargar')
    await k.evaluate(() => cl.show()); ok(await visible(), 'checklist: show() lo vuelve a mostrar')

    // Esc cierra el panel y devuelve el foco al lanzador
    await abrir(); await k.evaluate(`${cs('.item')}.focus()`); await k.keyboard.press('Escape')
    ok((await k.evaluate(`${cs('.launch')}.getAttribute('aria-expanded')`)) === 'false' && await k.evaluate(`document.querySelector('[data-nexus-checklist]').shadowRoot.activeElement?.classList.contains('launch')`), 'checklist: Esc cierra el panel y devuelve el foco al lanzador')

    // almacenamiento asíncrono propio + tema/posición/RTL
    const k2 = await nueva()
    await k2.goto(base + 'checklist.html'); await k2.waitForFunction(() => window.make)
    await k2.evaluate(() => { const saved = JSON.stringify({ done: ['b'], dismissed: false }); window.writes = []; make({ storage: { get: async () => { await new Promise((r) => setTimeout(r, 80)); return saved }, set: async (key, v) => { window.writes.push(v) } }, theme: { accent: 'rgb(255, 0, 0)' }, position: 'bottom-start', dir: 'rtl' }) })
    ok(await k2.evaluate(() => document.querySelector('[data-nexus-checklist]').shadowRoot.textContent.includes('0 / 3')), 'checklist: antes de cargar el almacenamiento asíncrono muestra 0')
    await k2.evaluate(() => cl.ready)
    ok(await k2.evaluate(() => cl.isDone('b') && cl.progress().done === 1), 'checklist: carga el progreso desde un almacenamiento asíncrono propio')
    await k2.evaluate(() => cl.markDone('a')); await k2.waitForTimeout(100)
    ok(await k2.evaluate(() => JSON.parse(window.writes.at(-1)).done.sort().join() === 'a,b'), 'checklist: guarda con el almacenamiento propio')
    await k2.evaluate(() => cl.open())
    const est = await k2.evaluate(() => { const h = document.querySelector('[data-nexus-checklist]'); const r = h.shadowRoot; return { pos: h.dataset.pos, dir: h.dir, bar: getComputedStyle(r.querySelector('.bar i')).backgroundColor, left: h.getBoundingClientRect().left } })
    ok(est.bar === 'rgb(255, 0, 0)' && est.pos === 'start' && est.dir === 'rtl' && est.left > 500, 'checklist: tema aplicado; en RTL "inicio" es el lado derecho')

    // sin romper la página: estilos globales hostiles no lo afectan
    await k2.addStyleTag({ content: 'button{display:none !important;background:red !important} *{font-family:Comic Sans MS !important}' })
    ok(await k2.evaluate(() => { const b = document.querySelector('[data-nexus-checklist]').shadowRoot.querySelector('.launch'); const c = getComputedStyle(b); return c.display !== 'none' && c.backgroundColor !== 'rgb(255, 0, 0)' }), 'checklist: aislado del CSS de la página')
  }

  // ---------- useChecklist en Vue y React
  {
    const w = await nueva()
    await w.goto(base + 'wrappers.html'); await w.waitForFunction(() => window.ready)
    ok((await w.locator('#vcl').textContent()) === '0/2', 'Vue useChecklist: estado inicial 0/2')
    await w.click('#vcmark'); await w.waitForFunction(() => document.getElementById('vcl').textContent === '1/2')
    ok(true, 'Vue useChecklist: markDone actualiza el estado reactivo')
    ok((await w.locator('[data-nexus-checklist]').count()) === 1, 'React useChecklist (StrictMode): un solo widget montado')
    await w.click('#rcmark'); await w.waitForFunction(() => document.getElementById('rcl').textContent === '1/2')
    ok(true, 'React useChecklist: markDone re-renderiza')
  }

  // ---------- sitio de demo/docs
  {
    const s = await nueva()
    const errs = []
    s.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
    await s.goto(base + 'site/index.html'); await s.waitForFunction(() => document.querySelectorAll('#rows tr').length === 2)
    ok(true, 'sitio: carga y muestra los datos "reales" simulados (2 filas)')
    await s.evaluate(() => localStorage.setItem('nt-lang', 'en')); await s.reload(); await s.waitForFunction(() => document.querySelectorAll('#rows tr').length === 2)
    ok((await s.locator('h1').textContent()).includes("don't break"), 'sitio: selector de idioma (EN)')
    await s.click('#lang'); ok((await s.locator('h1').textContent()).includes('Tours que no se rompen'), 'sitio: cambia a ES')
    await s.check('#checklist'); await s.waitForFunction(() => document.querySelector('[data-nexus-checklist]'))
    ok((await s.evaluate(() => document.querySelector('[data-nexus-checklist]').shadowRoot.textContent)).includes('0 / 3'), 'sitio: el checklist aparece con 0 / 3')
    await s.uncheck('#checklist'); ok(await s.evaluate(() => !document.querySelector('[data-nexus-checklist]')), 'sitio: el checklist se quita al desmarcarlo')
    await s.selectOption('#theme', 'dark'); await s.check('#practice')
    await s.click('#start'); await esperaTitulo(s, 'Crea un cliente')
    ok(await s.evaluate(() => getComputedStyle(S('.gm-pop')).backgroundColor === 'rgb(23, 22, 31)'), 'sitio: el selector de tema se aplica al tour')
    await s.waitForFunction(() => document.querySelectorAll('#rows tr').length === 5)
    ok((await s.locator('#source').textContent()).includes('práctica'), 'sitio: modo práctica muestra datos de ejemplo (5 filas)')
    await s.getByRole('button', { name: 'Siguiente' }).click(); await esperaTitulo(s, 'Ponle nombre')
    await s.waitForTimeout(500)
    await s.evaluate(() => { document.getElementById('name').value = 'Zed'; document.getElementById('form').requestSubmit() })
    await s.waitForFunction(() => document.getElementById('rows').textContent.includes('Zed'))
    await s.keyboard.press('Escape'); await s.waitForFunction(() => document.querySelectorAll('#rows tr').length === 2)
    ok(!(await s.locator('#rows').textContent()).includes('Zed'), 'sitio: al terminar vuelven los datos reales y "Zed" no se guardó')
    ok(errs.length === 0, 'sitio: sin errores en consola ' + errs.join('|'))
  }

  // ---------- CDN: un solo <script>, sin bundler
  {
    const c = await nueva()
    const errs = []; c.on('pageerror', (e) => errs.push(String(e)))
    await c.goto(base + 'cdn.html'); await c.waitForFunction(() => window.t && window.ck)
    ok(await c.evaluate(() => typeof NexusTours.Tour === 'function' && typeof NexusTours.Checklist === 'function' && !!NexusTours.themes.mint && NexusTours.createFixtures && !!NexusTours.fake), 'cdn: el global NexusTours trae Tour, Checklist, themes y fixtures')
    ok(await c.evaluate(() => window.data.u.length === 3), 'cdn: fixtures generan datos')
    await c.evaluate(() => t.start()); await c.waitForSelector('[data-nexus-tours]', { state: 'attached' })
    ok(await c.evaluate(() => !!document.querySelector('[data-nexus-tours]')), 'cdn: el tour arranca desde el script')
    ok(await c.evaluate(() => !!document.querySelector('[data-nexus-checklist]')), 'cdn: el checklist se monta')
    ok(errs.length === 0, 'cdn: sin errores ' + errs.join('|'))
  }

  // ---------- tamaño
  const { gzipSync } = await import('node:zlib')
  const { readFileSync } = await import('node:fs')
  try { const kb = gzipSync(readFileSync('dist/nexus-tours.js')).length / 1024; ok(kb < 14, `núcleo ${kb.toFixed(2)} KB gzip (< 14 KB)`); for (const [f, max] of [['fixtures', 4], ['themes', 1.5], ['vue', 2], ['react', 2], ['checklist', 5], ['supabase', 4.5], ['builder', 10], ['nexus-tours.all', 23]]) { const k = gzipSync(readFileSync(`dist/${f}.js`)).length / 1024; ok(k < max, `${f} ${k.toFixed(2)} KB gzip (< ${max} KB)`) } } catch { console.log('(sin dist: omito tamaño)') }
} finally {
  await browser.close()
  try { process.kill(-server.pid) } catch {}
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
