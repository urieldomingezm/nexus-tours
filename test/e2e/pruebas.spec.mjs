// Mesa de pruebas (site/pruebas.html del sitio compilado): tema y tours reales, lista que se guarda y resumen para reportar.
import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { test, expect, SITIO } from './utilidades.mjs'

test.skip(!existsSync('site-dist/index.html'), 'sin site-dist: corre antes `npm run build` y `npm run build:site`')

const titulo = (p) =>
  p.evaluate(() => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title')?.textContent ?? null)

test.describe('Mesa de pruebas', () => {
  test('el tema elegido llega al tour y «Sigue la página» acompaña el modo de la página', async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.goto(SITIO + 'pruebas')
    await p.getByRole('button', { name: 'Oscuro', exact: true }).click()
    await p.locator('#caso-pagina').click()
    await p.waitForFunction(() => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title'))
    const fondo = await p.evaluate(() => getComputedStyle(document.querySelector('[data-nexus-tours]')).getPropertyValue('--gm-bg').trim())
    expect(fondo).toBe('#17161f')
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Claro', exact: true }).click()
    await p.locator('#caso-pagina').click()
    await p.waitForFunction(() => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title'))
    expect(await p.evaluate(() => getComputedStyle(document.querySelector('[data-nexus-tours]')).getPropertyValue('--gm-bg').trim())).toBe(
      '#ffffff',
    )
    await p.keyboard.press('Escape')
    // «Sigue la página»: con la página en oscuro, el tour sale oscuro.
    await p.getByRole('button', { name: 'Sigue la página' }).click()
    await p.evaluate(() => (document.documentElement.dataset.tema = 'oscuro'))
    await p.locator('#caso-pagina').click()
    await p.waitForFunction(() => document.querySelector('[data-nexus-tours]')?.shadowRoot?.querySelector('.gm-title'))
    expect(await p.evaluate(() => getComputedStyle(document.querySelector('[data-nexus-tours]')).getPropertyValue('--gm-bg').trim())).toBe(
      '#17161f',
    )
  })

  test('el tour con un modal espera al formulario que carga tarde y cierra el modal al terminar', async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.goto(SITIO + 'pruebas')
    await p.locator('#caso-modal').click()
    await expect.poll(() => titulo(p)).toBe('Empieza aquí')
    await p.keyboard.press('ArrowRight')
    await expect.poll(() => titulo(p), { timeout: 8000 }).toBe('Ponle nombre')
    await expect(p.locator('#modal-prueba')).toHaveAttribute('open', '')
    await expect(p.locator('#prueba-nombre')).toBeVisible()
    await p.keyboard.press('ArrowRight')
    await expect.poll(() => titulo(p)).toBe('Guarda')
    await p.keyboard.press('Enter') // último paso: termina
    await expect(p.locator('#resultado')).toContainText('Tour con un modal: terminó')
    await expect(p.locator('#modal-prueba')).not.toHaveAttribute('open', '')
  })

  test('el paso que no existe se omite y el modo práctica bloquea la escritura', async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.goto(SITIO + 'pruebas')
    await p.locator('#caso-falta').click()
    await expect.poll(() => titulo(p)).toBe('Paso 1')
    await p.keyboard.press('ArrowRight')
    await expect.poll(() => titulo(p), { timeout: 8000 }).toBe('Paso 3')
    await p.keyboard.press('Enter')
    await expect(p.locator('#resultado')).toContainText('el paso 2 se omitió')

    await p.locator('#caso-practica').click()
    await expect(p.locator('#resultado')).toContainText('6 filas de ejemplo')
    await expect(p.locator('#resultado')).toContainText('403')
    await p.keyboard.press('ArrowRight')
    await p.keyboard.press('Enter')
    await expect(p.locator('#resultado')).toContainText('fetch quedó restaurado')
  })

  test('la lista se guarda y el resumen refleja la versión y la apariencia', async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.goto(SITIO + 'pruebas')
    await p.getByRole('button', { name: 'Bootstrap' }).click()
    await p.getByRole('button', { name: 'De derecha a izquierda' }).click()
    await p.check('#rev-teclado')
    await p.fill('#notas', 'Se ve bien en móvil')
    const resumen = p.locator('#resumen')
    await expect(resumen).toHaveValue(/nexus-tours \d+\.\d+\.\d+/)
    await expect(resumen).toHaveValue(/tema Bootstrap/)
    await expect(resumen).toHaveValue(/derecha a izquierda/)
    await expect(resumen).toHaveValue(/\[x\] Con el teclado/)
    await expect(resumen).toHaveValue(/Se ve bien en móvil/)
    await p.reload()
    await expect(p.locator('#rev-teclado')).toBeChecked()
    await expect(p.locator('#notas')).toHaveValue('Se ve bien en móvil')
    await expect(p.locator('#reportar-error')).toHaveAttribute('href', /template=error\.yml&version=/)
    await expect(p.locator('#reportar-ok')).toHaveAttribute('href', /template=adopcion\.yml&version=/)
  })

  test('accesibilidad: sin violaciones axe, con el submenú y el modal abiertos', async ({ nuevoContexto, vigilar }) => {
    const p = vigilar(await (await nuevoContexto({ viewport: { width: 1200, height: 800 } })).newPage())
    await p.emulateMedia({ reducedMotion: 'reduce' })
    await p.goto(SITIO + 'pruebas')
    await p.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important }' })
    await p.locator('header.cabecera').getByRole('button', { name: 'Empezar' }).click()
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([])
  })
})
