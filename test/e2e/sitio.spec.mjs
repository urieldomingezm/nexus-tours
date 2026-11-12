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
