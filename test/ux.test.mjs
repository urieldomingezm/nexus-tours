// Móvil, pasos interactivos (advanceOn), progreso guardado y cambio de página.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = 5197
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
const base = `http://localhost:${PORT}/`
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(base)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 250))
}
let fallos = 0
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ FALLO ') + m); if (!c) fallos++ }
const browser = await chromium.launch()
const S = (q) => `document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(${JSON.stringify(q)})`
const nueva = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...opts })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
  return p
}
const titulo = (p) => p.evaluate(`${S('.gm-title')}?.textContent ?? null`)
const espera = (p, t) => p.waitForFunction(`${S('.gm-title')}?.textContent === ${JSON.stringify(t)}`, null, { timeout: 4000 })
const abre = async (p, url = 'features.html') => { await p.goto(base + url); await p.waitForFunction(() => window.ready) }

try {
  // ================= pasos que avanzan solos
  {
    const p = await nueva(); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ steps: [
        { element: '#go', title: 'Haz clic', hint: 'Pulsa el botón para continuar', advanceOn: 'click', hideNext: true },
        { element: '#other', title: 'Segundo' },
      ] })
      return t.start()
    })
    await espera(p, 'Haz clic')
    ok(await p.evaluate(`!${S('.gm-primary')}`), 'hideNext: no hay botón Siguiente')
    ok((await p.evaluate(`${S('.gm-hint')}.textContent`)).includes('Pulsa'), 'se muestra la pista (hint)')
    ok((await p.evaluate(`getComputedStyle(${S('.gm-ring')}).pointerEvents`)) === 'none', 'el elemento resaltado se puede pulsar')
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150)
    ok((await titulo(p)) === 'Haz clic', 'hideNext también bloquea el teclado')
    await p.click('#go')
    await espera(p, 'Segundo')
    ok(await p.evaluate(() => hits.go === 1), 'el clic llegó al botón de la página (no se bloquea)')
  }
  {
    const p = await nueva(); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ steps: [
        { element: '#go', title: 'Uno', advanceOn: 'click' },
        { element: '#other', title: 'Dos' },
        { element: '#go', title: 'Tres' },
      ] })
      return t.start()
    })
    await espera(p, 'Uno')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'Dos'); await p.waitForTimeout(250)
    ok((await titulo(p)) === 'Dos', 'los botones del propio tour no disparan advanceOn dos veces')
    ok(await p.evaluate(() => t.index === 1), 'avanza exactamente un paso')
  }
  {
    const p = await nueva(); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ steps: [
        { element: '#go', title: 'Otro botón', advanceOn: { event: 'click', target: '#other' } },
        { element: '#other', title: 'Siguiente' },
      ] })
      return t.start()
    })
    await espera(p, 'Otro botón')
    await p.evaluate(() => document.getElementById('go').click()); await p.waitForTimeout(200)
    ok((await titulo(p)) === 'Otro botón', 'advanceOn.target: un clic en otro lado no avanza')
    await p.evaluate(() => document.getElementById('other').click()); await espera(p, 'Siguiente')
    ok(true, 'advanceOn.target: el clic en su elemento sí avanza')
  }
  {
    const p = await nueva(); await abre(p, 'features.html')
    await p.evaluate(() => { history.pushState({}, '', '/clients'); dispatchEvent(new PopStateEvent('popstate')) })
    await p.waitForSelector('#name')
    await p.evaluate(() => {
      window.t = new Tour({ steps: [
        { element: '#name', title: 'Escribe', advanceOn: { event: 'input', when: (e) => e.target.value.length >= 3, delay: 150 } },
        { element: '#save', title: 'Guarda', advanceOn: { until: () => window.listo === true } },
        { element: '#name', title: 'Fin' },
      ] })
      return t.start()
    })
    await espera(p, 'Escribe')
    await p.type('#name', 'ab'); await p.waitForTimeout(300)
    ok((await titulo(p)) === 'Escribe', 'when: con 2 letras no avanza')
    await p.type('#name', 'c')
    await p.waitForTimeout(40)
    ok((await titulo(p)) === 'Escribe', 'delay: espera antes de avanzar')
    await espera(p, 'Guarda')
    ok(true, 'when + delay: con 3 letras avanza')
    await p.waitForTimeout(250)
    ok((await titulo(p)) === 'Guarda', 'until: sigue en el paso mientras no se cumpla')
    await p.evaluate(() => (window.listo = true)); await espera(p, 'Fin')
    ok(true, 'until: avanza cuando la condición se cumple')
  }

  // ================= aspecto: puntos, Omitir, bienvenida, pulso, confeti
  {
    const p = await nueva(); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ celebrate: true, steps: [
        { title: 'Bienvenido', description: 'Un recorrido corto', icon: '👋', image: 'javascript:alert(1)' },
        { element: '#go', title: 'Pulsa', advanceOn: 'click' },
        { element: '#other', title: 'Normal' },
        { title: 'Listo', icon: '🎉' },
      ] })
      return t.start()
    })
    await espera(p, 'Bienvenido')
    ok(await p.evaluate(`${S('.gm-pop')}.hasAttribute('data-welcome')`), 'paso sin elemento: aspecto de bienvenida')
    ok((await p.evaluate(`${S('.gm-pop')}.getBoundingClientRect().width`)) > 400, 'la bienvenida es más ancha')
    ok((await p.evaluate(`${S('.gm-icon')}.textContent`)) === '👋', 'muestra el icono')
    ok(await p.evaluate(`!${S('.gm-img')}`), 'una imagen con javascript: se rechaza')
    ok((await p.evaluate(`${S('.gm-dots')}.children.length`)) === 4 && (await p.evaluate(`${S('.gm-dot[data-state=current]')}`)) !== null, '4 puntos de progreso, uno activo')
    ok(await p.evaluate(`!!${S('.gm-skip')} && !${S('.gm-x')}`), 'hay "Skip" y no hay × mientras exista Skip')
    ok(await p.evaluate(`${S('.gm-progress')}.classList.contains('gm-sr')`), 'el texto "1 / 4" queda solo para lectores de pantalla')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'Pulsa'); await p.waitForTimeout(300)
    ok(await p.evaluate(`${S('.gm-ring')}.hasAttribute('data-pulse')`), 'paso interactivo: el recuadro pulsa')
    ok(await p.evaluate(`!${S('.gm-pop')}.hasAttribute('data-welcome')`), 'paso con elemento: ya no es bienvenida')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'Normal'); await p.waitForTimeout(100)
    ok(await p.evaluate(`!${S('.gm-ring')}.hasAttribute('data-pulse')`), 'paso normal: sin pulso')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'Listo')
    ok(await p.evaluate(`!${S('.gm-skip')} && !!${S('.gm-x')}`), 'último paso: sin Skip, con ×')
    ok(!(await p.evaluate(() => !!document.querySelector('[data-nexus-confetti]'))), 'sin confeti antes de terminar')
    await p.evaluate(`${S('.gm-primary')}.click()`); await p.waitForTimeout(300)
    ok(await p.evaluate(() => !!document.querySelector('[data-nexus-confetti]')), 'celebrate: confeti al terminar')
    await p.waitForTimeout(3000)
    ok(await p.evaluate(() => !document.querySelector('[data-nexus-confetti]')), 'el confeti se retira solo')
    // omitir cierra sin celebrar
    await p.evaluate(() => { window.t = new Tour({ celebrate: true, steps: [{ element: '#go', title: 'Uno' }, { element: '#other', title: 'Dos' }] }); return t.start() })
    await espera(p, 'Uno'); await p.evaluate(`${S('.gm-skip')}.click()`); await p.waitForTimeout(250)
    ok(await p.evaluate(() => !t.active && !document.querySelector('[data-nexus-confetti]')), 'Skip cierra el tour sin confeti')
    // opciones
    await p.evaluate(() => { window.t = new Tour({ progress: 'text', skip: false, steps: [{ element: '#go', title: 'Uno' }, { element: '#other', title: 'Dos' }] }); return t.start() })
    await espera(p, 'Uno')
    ok(await p.evaluate(`!${S('.gm-dots')} && ${S('.gm-progress')}.textContent === '1 / 2' && !${S('.gm-progress')}.classList.contains('gm-sr')`), "progress:'text' muestra '1 / 2' y no hay puntos")
    ok(await p.evaluate(`!${S('.gm-skip')} && !!${S('.gm-x')}`), 'skip:false deja la ×')
    await p.evaluate(() => t.destroy())
    await p.evaluate(() => { window.t = new Tour({ steps: Array.from({ length: 12 }, (_, i) => ({ element: '#go', title: 'P' + i })) }); return t.start() })
    await espera(p, 'P0')
    ok(await p.evaluate(`!!${S('.gm-bar')} && !${S('.gm-dots')}`), 'más de 10 pasos: barra de progreso en vez de puntos')
    await p.evaluate(() => t.destroy())
    const r = await nueva({ reducedMotion: 'reduce' }); await abre(r)
    await r.evaluate(() => { window.t = new Tour({ celebrate: true, steps: [{ element: '#go', title: 'Solo' }] }); return t.start() })
    await espera(r, 'Solo'); await r.evaluate(`${S('.gm-primary')}.click()`); await r.waitForTimeout(300)
    ok(await r.evaluate(() => !document.querySelector('[data-nexus-confetti]')), 'movimiento reducido: no hay confeti')
  }

  // ================= móvil
  {
    const p = await nueva({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true }); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ steps: [
        { element: '#go', title: 'Uno', description: 'Texto del primer paso' },
        { element: '#lejos', title: 'Lejos', description: 'Está muy abajo en la página' },
        { element: '#other', title: 'Tres', advanceOn: 'click', hideNext: true },
        { element: '#go', title: 'Cuatro' },
      ] })
      return t.start()
    })
    await espera(p, 'Uno'); await p.waitForTimeout(450)
    ok((await p.evaluate(`${S('.gm-pop')}.dataset.mode`)) === 'sheet', 'pantalla angosta: panel inferior')
    const r = await p.evaluate(`(() => { const b = ${S('.gm-pop')}.getBoundingClientRect(); return { l: b.left, r: innerWidth - b.right, bottom: innerHeight - b.bottom, w: b.width } })()`)
    ok(Math.abs(r.l - 12) < 1 && Math.abs(r.r - 12) < 1, `panel con márgenes de 12px a los lados (${r.l}, ${r.r})`)
    ok(r.bottom >= 11 && r.bottom < 40, `panel pegado abajo (${r.bottom}px)`)
    ok((await p.evaluate(`getComputedStyle(${S('.gm-arrow')}).display`)) === 'none', 'sin flecha en el panel')
    ok((await p.evaluate(`${S('.gm-foot .gm-btn.gm-primary')}.getBoundingClientRect().height`)) >= 43.5, 'botones táctiles de al menos 44px')
    // deslizar a la izquierda = siguiente
    const swipe = (dx) => p.evaluate(`(() => { const el = ${S('.gm-pop')}; const mk = (type, x) => { const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 }); el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] })) }; mk('touchstart', 200); mk('touchend', ${200}+(${dx})) })()`)
    await swipe(-120); await espera(p, 'Lejos')
    ok(true, 'deslizar a la izquierda avanza')
    await p.waitForTimeout(1800)
    const vis = await p.evaluate(`(() => { const t = document.getElementById('lejos').getBoundingClientRect(); const s = ${S('.gm-pop')}.getBoundingClientRect(); return { bottom: t.bottom, top: t.top, sheetTop: s.top } })()`)
    ok(vis.bottom <= vis.sheetTop && vis.top >= 0, `el elemento queda visible por encima del panel (bottom ${Math.round(vis.bottom)} ≤ panel ${Math.round(vis.sheetTop)})`)
    await swipe(120); await espera(p, 'Uno')
    ok(true, 'deslizar a la derecha retrocede')
    await swipe(-120); await espera(p, 'Lejos'); await swipe(-120); await espera(p, 'Tres')
    await swipe(-120); await p.waitForTimeout(250)
    ok((await titulo(p)) === 'Tres', 'con hideNext el deslizar no se salta el paso')
    // cerrar: el espacio temporal se retira
    const antes = await p.evaluate(() => document.documentElement.scrollHeight)
    await p.evaluate(() => t.destroy())
    const despues = await p.evaluate(() => document.documentElement.scrollHeight)
    ok(despues <= antes && !(await p.evaluate(() => [...document.body.children].some((c) => c.getAttribute('aria-hidden') === 'true' && c.style.flex))), `al cerrar se retira el espacio temporal (${antes} → ${despues})`)
    const d = await nueva(); await abre(d)
    await d.evaluate(() => { window.t = new Tour({ steps: [{ element: '#go', title: 'Hola' }] }); return t.start() })
    await espera(d, 'Hola')
    ok((await d.evaluate(`${S('.gm-pop')}.dataset.mode`)) === 'float', 'escritorio: popover flotante')
    await d.setViewportSize({ width: 400, height: 700 }); await d.waitForTimeout(250)
    ok((await d.evaluate(`${S('.gm-pop')}.dataset.mode`)) === 'sheet', 'al estrechar la ventana pasa a panel inferior')
    await d.setViewportSize({ width: 1000, height: 700 }); await d.waitForTimeout(250)
    ok((await d.evaluate(`${S('.gm-pop')}.dataset.mode`)) === 'float' && (await d.evaluate(`${S('.gm-pop')}.style.bottom`)) === '', 'al ensanchar vuelve a flotante y limpia estilos')
    const n = await nueva({ viewport: { width: 390, height: 700 } }); await abre(n)
    await n.evaluate(() => { window.t = new Tour({ mobile: 'never', steps: [{ element: '#go', title: 'Hola' }] }); return t.start() })
    await espera(n, 'Hola')
    ok((await n.evaluate(`${S('.gm-pop')}.dataset.mode`)) === 'float', "mobile: 'never' mantiene el popover flotante")
  }

  // ================= progreso guardado
  {
    const p = await nueva(); await abre(p)
    const mk = `window.mk = (extra = {}) => new Tour({ persist: { id: 'bienvenida', dontShowAgain: true, ...extra }, steps: [{ element: '#go', title: 'A' }, { element: '#other', title: 'B' }, { element: '#go', title: 'C' }] })`
    await p.evaluate(mk)
    ok((await p.evaluate(() => mk().status())) === 'new', 'status: new al principio')
    await p.evaluate(() => { window.t = mk(); return t.startIfNeeded() })
    await espera(p, 'A'); await p.evaluate(() => t.next()); await espera(p, 'B')
    ok((await p.evaluate(() => mk().status())) === 'in-progress', 'status: in-progress a la mitad')
    await p.evaluate(() => t.stop())
    await p.evaluate(() => { window.t = mk(); return t.startIfNeeded() })
    await espera(p, 'B')
    ok(true, 'startIfNeeded reanuda donde se quedó (paso B)')
    await p.evaluate(() => t.next()); await espera(p, 'C'); await p.evaluate(() => t.next()); await p.waitForTimeout(150)
    ok((await p.evaluate(() => mk().status())) === 'completed', 'status: completed al terminar')
    ok((await p.evaluate(() => mk().startIfNeeded())) === false, 'startIfNeeded no vuelve a mostrar un tour terminado')
    await p.evaluate(() => { window.t = mk(); return t.start() }); await espera(p, 'A'); await p.evaluate(() => t.next()); await espera(p, 'B'); await p.evaluate(() => t.stop())
    ok((await p.evaluate(() => mk().status())) === 'completed', 'repetir el tour a mano y cerrarlo no lo vuelve a "en progreso"')
    ok((await p.evaluate(() => mk({ version: 2 }).status())) === 'new', 'cambiar version lo vuelve a mostrar a todos')
    await p.evaluate(() => mk().reset())
    ok((await p.evaluate(() => mk().status())) === 'new', 'reset borra el progreso')
    // no volver a mostrar
    await p.evaluate(() => { window.t = mk(); return t.startIfNeeded() }); await espera(p, 'A')
    await p.evaluate(`${S('.gm-never')}.click()`); await p.waitForTimeout(150)
    ok(await p.evaluate(() => !t.active), 'no volver a mostrar: cierra el tour')
    ok((await p.evaluate(() => mk().status())) === 'dismissed' && (await p.evaluate(() => mk().startIfNeeded())) === false, "no volver a mostrar: queda 'dismissed' y no reaparece")
    await p.evaluate(() => mk().reset())
    // almacenamiento propio (asíncrono, p. ej. tu base de datos)
    await p.evaluate(() => {
      window.db = {}
      window.store = { get: async (k) => db[k] ?? null, set: async (k, v) => { await new Promise((r) => setTimeout(r, 30)); db[k] = v } }
      window.t = mk({ storage: store }); return t.startIfNeeded()
    })
    await espera(p, 'A'); await p.waitForTimeout(150)
    ok(await p.evaluate(() => Object.keys(db).includes('nexus-tours:tour:bienvenida')), 'storage propio asíncrono: guarda con la clave nexus-tours:tour:<id>')
    await p.evaluate(() => t.stop())
  }

  // ================= cambio de página: SPA
  {
    const p = await nueva(); await abre(p)
    await p.evaluate(() => {
      window.t = new Tour({ router: 'history', steps: [
        { element: '#go', title: 'En inicio', route: '/features.html' },
        { element: '#name', title: 'En clientes', route: '/clients' },
        { element: '#go', title: 'De regreso', route: '/features.html' },
      ] })
      return t.start()
    })
    await espera(p, 'En inicio')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'En clientes')
    ok((await p.evaluate(() => location.pathname)) === '/clients', 'router history: navega a /clients y espera a que cargue')
    ok((await p.evaluate(`${S('.gm-ring')}.style.display`)) === 'block', 'resalta el elemento de la nueva página')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'De regreso')
    ok((await p.evaluate(() => location.pathname)) === '/features.html', 'router history: también regresa')
    await p.evaluate(() => t.destroy())
    // router propio (como Vue Router / React Router)
    const q = await nueva(); await abre(q)
    await q.evaluate(() => {
      window.log = []
      const mem = { path: '/features.html' }
      window.t = new Tour({
        router: { current: () => mem.path, go: (p) => { log.push(p); mem.path = p; history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')) } },
        steps: [{ element: '#name', title: 'Con router propio', route: '/clients' }],
      })
      return t.start()
    })
    await espera(q, 'Con router propio')
    ok(await q.evaluate(() => log.length === 1 && log[0] === '/clients'), 'router propio: llama a go() una vez')
  }

  // ================= cambio de página: sitio de varias páginas
  {
    const p = await nueva(); await abre(p, 'mpa-a.html')
    await p.evaluate(() => t.startIfNeeded()); await espera(p, 'Paso en A')
    await Promise.all([p.waitForURL('**/mpa-b.html'), p.evaluate(`${S('.gm-primary')}.click()`)])
    await p.waitForFunction(() => window.ready)
    ok((await p.evaluate(() => t.status())) === 'in-progress', 'multipágina: el progreso sobrevive a la recarga')
    await p.evaluate(() => t.startIfNeeded()); await espera(p, 'Paso en B')
    ok(true, 'multipágina: la página nueva continúa en el paso correcto')
    await p.evaluate(`${S('.gm-primary')}.click()`); await espera(p, 'Final en B')
    await p.evaluate(`${S('.gm-primary')}.click()`); await p.waitForTimeout(200)
    ok((await p.evaluate(() => t.status())) === 'completed', 'multipágina: termina y queda completado')
    ok((await p.evaluate(() => t.startIfNeeded())) === false, 'multipágina: ya no reaparece')
  }
} catch (e) {
  console.log('ERROR', e)
  fallos++
} finally {
  await browser.close()
  try { process.kill(-server.pid) } catch {}
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
