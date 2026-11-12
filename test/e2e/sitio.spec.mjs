// Sitio de documentación compilado (site-dist): páginas, menú de celular, guía y el tour de la portada.
import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { test, expect, SITIO } from './utilidades.mjs'

test.skip(!existsSync('site-dist/index.html'), 'sin site-dist: corre antes `npm run build` y `npm run build:site`')

const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const PAGINAS = [
  ['index.html', /nexus-tours/],
  ['primeros-pasos.html', /Primeros pasos/],
  ['guia.html', /Guía/],
  ['novedades.html', /Novedades/],
  ['demo.html', /Demo/],
  ['pruebas.html', /Pruebas/],
]

/** La cifra de descargas de la portada la pide a npm: en las pruebas se responde sin salir a la red. */
const sinRed = (ctx) =>
  ctx.route('https://api.npmjs.org/**', (r) =>
    r.fulfill({ json: { downloads: 1234, package: 'nexus-tours' }, headers: { 'access-control-allow-origin': '*' } }),
  )

for (const [pagina, titulo] of PAGINAS) {
  test(`${pagina}: carga, sin marcadores sin resolver ni errores`, async ({ nuevoContexto, vigilar }) => {
    const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
    await sinRed(ctx)
    const p = vigilar(await ctx.newPage())
    await p.goto(SITIO + pagina)
    await expect(p).toHaveTitle(titulo)
    await expect(p.locator('header.cabecera nav a[aria-current="page"]')).toHaveCount(1)
    expect(await p.content()).not.toContain('<!--@')
    await expect(p.locator('footer.pie')).toContainText('MIT')
  })
}

test('portada: el botón abre un tour real sobre la página', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  await p.locator('#b-tour').click()
  await expect(p.locator('[data-nexus-tours]')).toBeAttached()
  await p.waitForFunction(
    () => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title')?.textContent === 'Esto es nexus-tours',
  )
})

test('guía: README con índice lateral y código resaltado', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO + 'guia.html')
  await expect(p.locator('[id="1-instalación"]')).toBeAttached()
  expect(await p.locator('[data-toc] a').count()).toBeGreaterThan(20)
  await expect(p.locator('pre .tk-k').first()).toBeAttached()
})

test('celular: el menú se abre y se cierra con Esc', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 390, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const boton = p.locator('.menu-btn')
  await expect(p.locator('#menu-principal')).toBeHidden()
  await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
  await p.locator('header.cabecera').getByRole('button', { name: 'Probar' }).click()
  await expect(p.locator('#menu-principal a', { hasText: 'Demo' })).toBeVisible()
  await p.keyboard.press('Escape') // el primer Esc cierra el submenú
  await expect(p.locator('#menu-principal a', { hasText: 'Demo' })).toBeHidden()
  await p.keyboard.press('Escape') // el segundo cierra el menú
  await expect(p.locator('#menu-principal')).toBeHidden()
})

test('accesibilidad: las páginas no tienen violaciones de axe (WCAG 2.2 AA)', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  // La entrada de la portada anima la opacidad: sin movimiento el contraste se mide en el estado final.
  await p.emulateMedia({ reducedMotion: 'reduce' })
  for (const [pagina] of PAGINAS) {
    for (const tema of ['claro', 'oscuro']) {
      await p.goto(SITIO + pagina)
      await p.evaluate((t) => (document.documentElement.dataset.tema = t), tema)
      // Sin transiciones ni animaciones de ningún tipo: axe mide el contraste en el estado final (WebKit lo medía a medias).
      await p.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important }' })
      const { violations } = await new AxeBuilder({ page: p }).withTags(REGLAS).analyze()
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        `${pagina} (${tema})`,
      ).toEqual([])
    }
  }
})

test('escritorio: los submenús abren con clic, uno a la vez, y se cierran con Esc o fuera', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1280, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO + 'demo.html')
  const cab = p.locator('header.cabecera')
  const probar = cab.getByRole('button', { name: 'Probar' })
  const empezar = cab.getByRole('button', { name: 'Empezar' })
  await expect(p.locator('.grupo.activo')).toHaveCount(1)
  await expect(p.locator('#sm-2 a')).toHaveCount(2)
  await expect(p.locator('#sm-2')).toBeHidden()
  await probar.click()
  await expect(p.locator('#sm-2')).toBeVisible()
  await empezar.click()
  await expect(probar).toHaveAttribute('aria-expanded', 'false')
  await expect(p.locator('#sm-1')).toBeVisible()
  await p.keyboard.press('Escape')
  await expect(p.locator('#sm-1')).toBeHidden()
  await expect(empezar).toBeFocused()
  await probar.click()
  await p.mouse.click(1200, 600) // fuera del submenú, que queda a la izquierda
  await expect(p.locator('#sm-2')).toBeHidden()
})

test('pie: columnas de enlaces y firma', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  for (const c of ['Documentación', 'Referencia', 'Proyecto']) await expect(p.locator(`footer.pie nav[aria-label="${c}"]`)).toBeVisible()
  await expect(p.locator('footer.pie')).toContainText('DevMedina')
})

test('portada: muestra las descargas semanales de npm', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  await p.locator('#n-descargas').scrollIntoViewIfNeeded() // la cifra cuenta hasta su valor al aparecer en pantalla
  await expect(p.locator('#n-descargas')).toHaveText(/1[.,\s]?234/)
})

test('al ir a otra página aparece la barra de carga; un ancla de la misma página no la activa', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const barra = p.locator('.carga-pagina')
  await expect(barra).not.toHaveClass(/activa/)
  await p.keyboard.press('Tab') // el enlace «Saltar al contenido» (ancla de la misma página)
  await p.keyboard.press('Enter')
  await expect(barra).not.toHaveClass(/activa/)
  // Se anota cómo estaba la barra justo al salir de la página (después de ella ya no existe ese documento).
  await p.evaluate(() =>
    window.addEventListener('beforeunload', () => sessionStorage.setItem('barra', document.querySelector('.carga-pagina').className)),
  )
  await p.locator('header.cabecera').getByRole('button', { name: 'Empezar' }).click()
  await p.locator('header.cabecera nav a[href="guia"]').click()
  await expect(p).toHaveURL(/\/guia/)
  expect(await p.evaluate(() => sessionStorage.getItem('barra'))).toContain('activa')
  await expect(p.locator('.carga-pagina')).not.toHaveClass(/activa/)
})

test('enlaces limpios: el sitio publicado no usa «.html» en sus propias páginas', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const conHtml = await p.locator('a[href]').evaluateAll((a) => a.map((x) => x.getAttribute('href')).filter((h) => /^[\w-]+\.html/.test(h)))
  expect(conHtml).toEqual([])
  await p.goto(SITIO + 'guia') // la dirección limpia abre la página
  await expect(p).toHaveTitle(/Guía/)
})

// ── Portada viva: maqueta del tour, buscador, insignias y animaciones ───────────────────────────────────────────────────────────

const conNpm = (ctx, version = '9.9.9', demora = 0) =>
  Promise.all([
    ctx.route('https://registry.npmjs.org/**', (r) => r.fulfill({ json: { version }, headers: { 'access-control-allow-origin': '*' } })),
    ctx.route('https://api.npmjs.org/**', async (r) => {
      if (demora) await new Promise((ok) => setTimeout(ok, demora))
      await r.fulfill({ json: { downloads: 1234 }, headers: { 'access-control-allow-origin': '*' } })
    }),
  ])

test('maqueta: con movimiento reducido el tour espera y se lleva paso a paso, con «Anterior» y «Salir»', async ({
  nuevoContexto,
  vigilar,
}) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const pantalla = p.locator('.mira-pantalla')
  await pantalla.scrollIntoViewIfNeeded()
  await expect(pantalla.locator('.mira-n')).toHaveText('Paso 1 de 3')
  await expect(pantalla.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await expect(pantalla.locator('#mira-modal')).not.toHaveClass(/abierto/)
  await pantalla.getByRole('button', { name: 'Siguiente' }).click()
  await expect(pantalla.locator('.mira-t')).toHaveText('Ponle nombre')
  await expect(pantalla.locator('#mira-modal')).toHaveClass(/abierto/)
  await pantalla.getByRole('button', { name: 'Anterior' }).click()
  await expect(pantalla.locator('#mira-modal')).not.toHaveClass(/abierto/)
  await pantalla.getByRole('button', { name: 'Siguiente' }).click()
  await pantalla.getByRole('button', { name: 'Siguiente' }).click()
  await expect(pantalla.getByRole('button', { name: 'Terminar' })).toBeVisible()
  await pantalla.getByRole('button', { name: 'Terminar' }).click()
  await expect(pantalla.locator('.mira-toast')).toContainText('el modal se cerró solo')
  await expect(pantalla.locator('.mira-paso')).toBeHidden()
  await pantalla.getByRole('button', { name: 'Repetir el tour' }).click()
  await expect(pantalla.locator('.mira-n')).toHaveText('Paso 1 de 3')
  await pantalla.getByRole('button', { name: 'Salir' }).click()
  await expect(pantalla.locator('.mira-paso')).toBeHidden()
  await expect(pantalla.locator('.mira-foco')).toBeHidden()
})

test('maqueta: la lista de primeros pasos se va marcando, y «Ver código» sigue a la escena', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const pantalla = p.locator('.mira-pantalla')
  const codigo = p.locator('.mira-codigo')
  await pantalla.scrollIntoViewIfNeeded()
  await expect(codigo.locator('code')).toContainText('abrirModal')
  await codigo.locator('summary').click()
  await p.locator('button[data-escena=checklist]').click()
  await expect(codigo.locator('code')).toContainText('Checklist')
  await expect(codigo.locator('button.copiar')).toHaveCount(1)
  await expect(p.locator('button[data-escena=checklist]')).toHaveAttribute('aria-pressed', 'true')
  await pantalla.getByRole('button', { name: 'Siguiente' }).click()
  await expect(pantalla.locator('.mira-item.hecho')).toHaveCount(1)
  await pantalla.getByRole('button', { name: 'Siguiente' }).click()
  await pantalla.getByRole('button', { name: 'Terminar' }).click()
  await expect(pantalla.locator('.mira-item.hecho')).toHaveCount(3)
  await expect(pantalla.locator('.mira-toast')).toContainText('Primeros pasos completos')
  await p.locator('button[data-escena=practica]').click()
  await expect(codigo.locator('code')).toContainText('practice')
  await expect(pantalla.locator('.mira-t')).toHaveText('Modo práctica')
})

test('maqueta: se recorre sola al cargar y en cuanto se toca queda quieta en manos de quien la usa', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 900 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const pantalla = p.locator('.mira-pantalla')
  await pantalla.scrollIntoViewIfNeeded()
  await expect(pantalla.locator('.mira-n')).toHaveText('Paso 2 de 3', { timeout: 15000 })
  await pantalla.locator('.mira-paso').click({ position: { x: 4, y: 4 } })
  const antes = await pantalla.locator('.mira-n').textContent()
  await p.waitForTimeout(3500)
  expect(await pantalla.locator('.mira-n').textContent()).toBe(antes)
  await pantalla.getByRole('button', { name: /Siguiente|Terminar/ }).click()
  await expect(pantalla.locator('.mira-n')).not.toHaveText(antes ?? '')
})

test('maqueta y sección de piezas: sin violaciones de axe, en claro y en oscuro', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  for (const tema of ['claro', 'oscuro']) {
    await p.evaluate((t) => (document.documentElement.dataset.tema = t), tema)
    for (const escena of ['modal', 'practica', 'checklist']) {
      await p.locator(`button[data-escena=${escena}]`).click()
      await p.locator('.mira-pantalla').getByRole('button', { name: 'Siguiente' }).click()
      const r = await new AxeBuilder({ page: p })
        .include('.mira')
        .include('section[aria-labelledby=piezas]')
        .include('.insignias.en-vivo')
        .withTags(REGLAS)
        .analyze()
      expect(r.violations.map((v) => `${tema}/${escena}: ${v.id}`)).toEqual([])
    }
  }
})

test('portada: la insignia de versión se confirma con npm y la cifra muestra un esqueleto mientras carga', async ({
  nuevoContexto,
  vigilar,
}) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await conNpm(ctx, '9.9.9', 800)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  await expect(p.locator('#n-descargas')).toHaveClass(/esqueleto/)
  await expect(p.locator('#n-descargas')).not.toHaveClass(/esqueleto/)
  await expect(p.locator('#i-version')).toHaveText('v9.9.9')
  await expect(p.locator('.insignias.en-vivo')).toContainText('MIT')
  await expect(p.locator('section[aria-labelledby=piezas] tbody tr')).toHaveCount(6)
})

test('portada: sin respuesta de npm la insignia conserva la versión de la construcción y el esqueleto se quita', async ({
  nuevoContexto,
  vigilar,
}) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await ctx.route('https://registry.npmjs.org/**', (r) => r.abort())
  await ctx.route('https://api.npmjs.org/**', (r) => r.abort())
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  await expect(p.locator('#n-descargas')).not.toHaveClass(/esqueleto/)
  await expect(p.locator('#i-version')).toHaveText(/^v\d+\.\d+\.\d+/)
  await expect(p.locator('#i-version')).not.toHaveText('v9.9.9')
})

test('buscador: «/» lo abre, encuentra una sección y Esc lo cierra; no se abre mientras se escribe', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO + 'guia.html')
  await p.keyboard.press('/')
  const buscador = p.locator('dialog.buscador')
  await expect(buscador).toBeVisible()
  await p.keyboard.type('checklist')
  await expect(buscador.getByRole('option').first()).toBeVisible()
  await expect(buscador.getByRole('option').first()).toContainText(/checklist/i)
  await p.keyboard.press('Escape')
  await expect(buscador).toBeHidden()
  await p.locator('[data-buscar]').click()
  await expect(buscador).toBeVisible()
})

test('cabecera: «buscar», «github», «npm» y «tema» miden lo mismo; en celular angosto no parten la marca', async ({
  nuevoContexto,
  vigilar,
}) => {
  const ctx = await nuevoContexto({ viewport: { width: 1280, height: 700 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  const altos = await p.evaluate(() => [...document.querySelectorAll('.herr > *')].map((e) => Math.round(e.getBoundingClientRect().height)))
  expect(altos.length).toBe(4)
  expect(new Set(altos).size).toBe(1)
  await p.setViewportSize({ width: 360, height: 700 })
  const marca = await p.locator('.marca').boundingBox()
  expect(marca.height).toBeLessThan(50)
})

test('volver arriba aparece al bajar y regresa al inicio', async ({ nuevoContexto, vigilar }) => {
  const ctx = await nuevoContexto({ viewport: { width: 1200, height: 800 } })
  await sinRed(ctx)
  const p = vigilar(await ctx.newPage())
  await p.goto(SITIO)
  await expect(p.getByRole('button', { name: 'Volver arriba' })).toBeHidden()
  await p.evaluate(() => scrollTo(0, 1600))
  await p.getByRole('button', { name: 'Volver arriba' }).click()
  await expect.poll(() => p.evaluate(() => scrollY)).toBeLessThan(5)
})
