import { afterEach, describe, expect, it } from 'vitest'
import { isVisible, waitForElement } from '../../src/wait'

// happy-dom no calcula layout: simulamos el tamaño de los elementos "visibles".
const conTamano = (el: Element, w = 10, h = 10) => {
  el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON() {} }) as DOMRect
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isVisible', () => {
  it('desconectado, sin tamaño, display:none o visibility:hidden → no visible', () => {
    const suelto = conTamano(document.createElement('div'))
    expect(isVisible(suelto)).toBe(false)
    const vacio = document.body.appendChild(document.createElement('div'))
    expect(isVisible(vacio)).toBe(false)
    const oculto = conTamano(document.body.appendChild(document.createElement('div')))
    oculto.setAttribute('style', 'display:none')
    expect(isVisible(oculto)).toBe(false)
    oculto.setAttribute('style', 'visibility:hidden')
    expect(isVisible(oculto)).toBe(false)
    oculto.setAttribute('style', '')
    expect(isVisible(oculto)).toBe(true)
  })
})

describe('waitForElement', () => {
  it('resuelve en cuanto el elemento aparece y es visible', async () => {
    const promesa = waitForElement(() => document.querySelector('#tarde'), 2000, { aborted: false })
    setTimeout(() => {
      const el = conTamano(document.createElement('button'))
      el.id = 'tarde'
      document.body.appendChild(el)
    }, 50)
    const el = await promesa
    expect(el?.id).toBe('tarde')
  })

  it('espera a que un elemento oculto se muestre (modales animados)', async () => {
    const el = conTamano(document.body.appendChild(document.createElement('div')))
    el.id = 'modal'
    el.setAttribute('style', 'display:none')
    const promesa = waitForElement(() => document.getElementById('modal'), 2000, { aborted: false })
    setTimeout(() => el.setAttribute('style', ''), 50)
    expect(await promesa).toBe(el)
  })

  it('devuelve null al vencer el tiempo', async () => {
    const t0 = performance.now()
    expect(await waitForElement(() => null, 80, { aborted: false })).toBeNull()
    expect(performance.now() - t0).toBeGreaterThanOrEqual(70)
  })

  it('devuelve null si se aborta', async () => {
    const senal = { aborted: false }
    const promesa = waitForElement(() => null, 5000, senal)
    setTimeout(() => (senal.aborted = true), 30)
    expect(await promesa).toBeNull()
  })

  it('un find() que lanza no rompe la espera', async () => {
    let n = 0
    const el = conTamano(document.body.appendChild(document.createElement('p')))
    const r = await waitForElement(
      () => {
        if (n++ < 3) throw new Error('selector inválido por ahora')
        return el
      },
      2000,
      { aborted: false },
    )
    expect(r).toBe(el)
  })
})
