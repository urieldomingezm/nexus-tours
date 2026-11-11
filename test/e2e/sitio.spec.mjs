// Sitio de documentación compilado (site-dist): páginas, menú de celular, guía y el tour de la portada.
import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { test, expect, SITIO } from './utilidades.mjs'

test.skip(!existsSync('site-dist/index.html'), 'sin site-dist: corre antes `npm run build` y `npm run build:site`')

const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const [pagina, titulo] of [
  ['index.html', /nexus-tours/],
  ['guia.html', /Guía/],
  ['demo.html', /Demo/],
]) {
  test(`${pagina}: carga, sin marcadores sin resolver ni errores`, async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.goto(SITIO + pagina)
    await expect(p).toHaveTitle(titulo)
    await expect(p.locator('header.cabecera nav a[aria-current="page"]')).toHaveCount(1)
    expect(await p.content()).not.toContain('<!--@')
    await expect(p.locator('footer.pie')).toContainText('MIT')
  })
}

test('portada: el botón abre un tour real sobre la página', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
  await p.goto(SITIO)
  await p.locator('#b-tour').click()
  await expect(p.locator('[data-nexus-tours]')).toBeAttached()
  await p.waitForFunction(
    () => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title')?.textContent === 'Esto es nexus-tours',
  )
})

test('guía: README con índice lateral y código resaltado', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
  await p.goto(SITIO + 'guia.html')
  await expect(p.locator('[id="1-instalación"]')).toBeAttached()
  expect(await p.locator('[data-toc] a').count()).toBeGreaterThan(20)
  await expect(p.locator('pre .tk-k').first()).toBeAttached()
})

test('celular: el menú se abre y se cierra con Esc', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 390, height: 800 } })).newPage())
  await p.goto(SITIO)
  const boton = p.locator('.menu-btn')
  await expect(p.locator('#menu-principal')).toBeHidden()
  await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
  await expect(p.locator('#menu-principal a', { hasText: 'Demo' })).toBeVisible()
  await p.keyboard.press('Escape')
  await expect(p.locator('#menu-principal')).toBeHidden()
})

test('accesibilidad: las páginas no tienen violaciones de axe (WCAG 2.2 AA)', async ({ nuevoContexto, vigilar }) => {
  const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
  // La entrada de la portada anima la opacidad: sin movimiento el contraste se mide en el estado final.
  await p.emulateMedia({ reducedMotion: 'reduce' })
  for (const pagina of ['index.html', 'guia.html', 'demo.html']) {
    for (const tema of ['claro', 'oscuro']) {
      await p.goto(SITIO + pagina)
      await p.evaluate((t) => (document.documentElement.dataset.tema = t), tema)
      const { violations } = await new AxeBuilder({ page: p }).withTags(REGLAS).analyze()
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        `${pagina} (${tema})`,
      ).toEqual([])
    }
  }
})
