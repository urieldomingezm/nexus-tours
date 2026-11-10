import { describe, expect, it } from 'vitest'
import { EDGE, GAP, arrowStyle, backdropPath, holeFor, isSheet, pickSide, placePopover } from '../../src/core/layout'

const v = { vw: 1000, vh: 700, ox: 0, oy: 0 }
const hole = (x: number, y: number, w = 100, h = 40) => ({ x, y, w, h })

describe('holeFor', () => {
  it('agrega el padding y corrige el desplazamiento del contenedor', () => {
    expect(holeFor({ left: 100, top: 50, width: 80, height: 30 }, 6, 10, 20)).toEqual({ x: 84, y: 24, w: 92, h: 42 })
  })
})

describe('pickSide', () => {
  it('abajo por defecto si cabe', () => {
    expect(pickSide('auto', hole(400, 100), 300, 150, v)).toBe('bottom')
  })
  it('respeta el lado pedido si cabe', () => {
    expect(pickSide('right', hole(100, 300), 300, 150, v)).toBe('right')
  })
  it('si el lado pedido no cabe, busca otro en orden', () => {
    expect(pickSide('top', hole(400, 20), 300, 150, v)).toBe('bottom')
    expect(pickSide('auto', hole(400, 600), 300, 150, v)).toBe('top')
  })
  it('si nada cabe, elige el de más espacio', () => {
    expect(pickSide('auto', hole(0, 0, 1000, 700), 300, 150, v)).toBe('bottom')
    expect(pickSide('auto', hole(10, 10, 980, 600), 300, 150, { ...v })).toBe('bottom')
  })
})

describe('placePopover', () => {
  it('sin objetivo: centrado', () => {
    expect(placePopover(null, 'auto', 300, 100, v)).toEqual({ x: 350, y: 300, side: 'center' })
  })
  it('debajo del objetivo, centrado horizontalmente, con separación GAP', () => {
    const p = placePopover(hole(400, 100), 'auto', 300, 150, v)
    expect(p).toEqual({ x: 400 + 50 - 150, y: 100 + 40 + GAP, side: 'bottom' })
  })
  it('nunca se sale de la pantalla (margen EDGE)', () => {
    const izq = placePopover(hole(0, 100, 20, 20), 'bottom', 300, 150, v)
    expect(izq.x).toBe(EDGE)
    const der = placePopover(hole(980, 100, 20, 20), 'bottom', 300, 150, v)
    expect(der.x).toBe(1000 - 300 - EDGE)
  })
  it('compensa el desplazamiento del contenedor', () => {
    const p = placePopover(null, 'auto', 300, 100, { ...v, ox: 50, oy: 30 })
    expect(p).toEqual({ x: 300, y: 270, side: 'center' })
  })
})

describe('arrowStyle', () => {
  it('apunta al centro del objetivo y no se sale de las esquinas', () => {
    expect(arrowStyle('bottom', hole(400, 100), 300, 152, 300, 150)).toEqual({ top: '-6px', bottom: '', left: '144px', right: '' })
    expect(arrowStyle('top', hole(0, 300, 10, 10), 300, 100, 300, 150).left).toBe('14px')
    expect(arrowStyle('right', hole(100, 100), 212, 50, 300, 150)).toMatchObject({ left: '-6px', top: '64px' })
    expect(arrowStyle('left', hole(500, 100), 188, 50, 300, 150)).toMatchObject({ right: '-6px' })
  })
})

describe('backdropPath', () => {
  it('pantalla completa con un hueco redondeado (radio limitado al tamaño)', () => {
    const p = backdropPath(hole(10, 20, 100, 40), 8, 1000, 700)
    expect(p.startsWith('path(evenodd,"M0 0H1000V700H0Z M18 20')).toBe(true)
    expect(backdropPath(hole(10, 20, 10, 10), 99, 1000, 700)).toContain('A5 5')
    expect(backdropPath(hole(10, 20, 10, 10), NaN, 1000, 700)).toContain('A0 0')
  })
})

describe('isSheet', () => {
  it("'auto' usa el ancho; 'always' y 'never' mandan", () => {
    expect(isSheet('auto', 390)).toBe(true)
    expect(isSheet(undefined, 1000)).toBe(false)
    expect(isSheet('auto', 700, 800)).toBe(true)
    expect(isSheet('always', 1400)).toBe(true)
    expect(isSheet('never', 300)).toBe(false)
  })
})

describe('placePopover con align', () => {
  const h = { x: 300, y: 100, w: 200, h: 40 }
  it('abajo/arriba: start alinea el borde izquierdo, end el derecho, center al medio', () => {
    expect(placePopover(h, 'bottom', 120, 80, v, 'start').x).toBe(300)
    expect(placePopover(h, 'bottom', 120, 80, v, 'end').x).toBe(300 + 200 - 120)
    expect(placePopover(h, 'bottom', 120, 80, v, 'center').x).toBe(300 + 100 - 60)
    expect(placePopover(h, 'top', 120, 80, { ...v, vh: 700 }, 'start').x).toBe(300)
  })
  it('en RTL start y end se reflejan en horizontal', () => {
    expect(placePopover(h, 'bottom', 120, 80, v, 'start', true).x).toBe(300 + 200 - 120)
    expect(placePopover(h, 'bottom', 120, 80, v, 'end', true).x).toBe(300)
  })
  it('izquierda/derecha: start alinea arriba, end abajo (sin reflejo en RTL)', () => {
    const alto = { x: 400, y: 200, w: 60, h: 300 }
    expect(placePopover(alto, 'right', 200, 100, v, 'start').y).toBe(200)
    expect(placePopover(alto, 'right', 200, 100, v, 'end').y).toBe(200 + 300 - 100)
    expect(placePopover(alto, 'left', 200, 100, v, 'end', true).y).toBe(200 + 300 - 100)
  })
  it('alineado sigue sin salirse de la pantalla', () => {
    expect(placePopover({ x: 950, y: 100, w: 40, h: 20 }, 'bottom', 300, 80, v, 'start').x).toBe(1000 - 300 - EDGE)
  })
})
