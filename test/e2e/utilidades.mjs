// Utilidades compartidas por las pruebas de punta a punta (Playwright Test).
import { test as base, expect } from '@playwright/test'

export { expect }

/** Servidor de desarrollo (vite) y demo compilada (vite preview); ver playwright.config.mjs. */
export const BASE = 'http://localhost:5199/'
export const DEMO = 'http://localhost:5195/'

/** Verificación suave: si falla, la prueba sigue y reporta todas las fallas juntas. */
export const ok = (condicion, mensaje) => expect.soft(condicion, mensaje).toBeTruthy()
export const eq = (actual, esperado, mensaje) => expect.soft(actual, mensaje).toEqual(esperado)

/** Selectores dentro del shadow root del tour, del constructor y del checklist (como texto para evaluate). */
export const S = (q) => `document.querySelector('[data-nexus-tours]')?.shadowRoot.querySelector(${JSON.stringify(q)})`

/** Espera a que terminen las transiciones/animaciones dentro de los shadow roots de la librería (Safari anima al insertar). */
export const sinAnimaciones = (p) =>
  p.waitForFunction(() => [...document.querySelectorAll('[data-nexus-tours],[data-nexus-checklist],[data-nexus-builder]')]
    .every((h) => !h.shadowRoot || h.shadowRoot.getAnimations().every((a) => a.playState !== 'running')), null, { timeout: 3000 }).catch(() => {})

export const test = base.extend({
  /** Errores de JavaScript de las páginas: al final de cada prueba debe estar vacío. */
  erroresPagina: async ({}, use) => {
    const errores = []
    await use(errores)
    expect(errores, 'errores de JavaScript en la página').toEqual([])
  },
  /** Registra la página para que sus errores de JavaScript hagan fallar la prueba. */
  vigilar: async ({ erroresPagina }, use) => {
    await use((p) => {
      p.on('pageerror', (e) => erroresPagina.push(e.message))
      return p
    })
  },
  /** Igual que browser.newContext, pero adapta opciones por navegador y cierra todo al terminar. */
  nuevoContexto: async ({ browser, browserName }, use) => {
    const abiertos = []
    await use(async (opciones = {}) => {
      const o = { ...opciones }
      // Firefox no soporta isMobile; el resto (viewport, touch) sí.
      if (browserName === 'firefox') delete o.isMobile
      const ctx = await browser.newContext(o)
      abiertos.push(ctx)
      return ctx
    })
    for (const c of abiertos) await c.close().catch(() => {})
  },
})
