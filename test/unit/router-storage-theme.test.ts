import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveRouter, routers, sameRoute } from '../../src/router'
import { localStore, memoryStore } from '../../src/storage'
import { themeVars } from '../../src/theme'

describe('sameRoute', () => {
  it('ignora la "/" final y el #hash', () => {
    expect(sameRoute('/clientes/', '/clientes')).toBe(true)
    expect(sameRoute('/clientes#tabla', '/clientes')).toBe(true)
    expect(sameRoute('/', '')).toBe(true)
  })
  it('solo compara la query si la ruta del paso la tiene', () => {
    expect(sameRoute('/lista?page=2', '/lista')).toBe(true)
    expect(sameRoute('/lista?page=2', '/lista?page=2')).toBe(true)
    expect(sameRoute('/lista?page=1', '/lista?page=2')).toBe(false)
  })
  it('distingue rutas diferentes', () => {
    expect(sameRoute('/a', '/b')).toBe(false)
    expect(sameRoute('/a/b', '/a')).toBe(false)
  })
})

describe('routers', () => {
  it('resolveRouter acepta nombre, objeto o nada', () => {
    expect(resolveRouter(undefined)).toBeNull()
    const propio = { current: () => '/', go: () => {} }
    expect(resolveRouter(propio)).toBe(propio)
    expect(resolveRouter('location')?.reloads).toBe(true)
    expect(resolveRouter('history')?.reloads).toBeUndefined()
  })
  it('history: pushState + popstate', () => {
    const r = routers.history()
    const visto = vi.fn()
    addEventListener('popstate', visto)
    r.go('/nueva?x=1')
    removeEventListener('popstate', visto)
    expect(location.pathname).toBe('/nueva')
    expect(r.current()).toBe('/nueva?x=1')
    expect(visto).toHaveBeenCalledTimes(1)
  })
})

describe('almacenamiento', () => {
  afterEach(() => vi.restoreAllMocks())

  it('memoryStore guarda, lee y borra', () => {
    const s = memoryStore()
    expect(s.get('k')).toBeNull()
    s.set('k', 'v')
    expect(s.get('k')).toBe('v')
    s.remove?.('k')
    expect(s.get('k')).toBeNull()
  })
  it('localStore usa localStorage cuando funciona', () => {
    const s = localStore()
    s.set('nt:prueba', '1')
    expect(localStorage.getItem('nt:prueba')).toBe('1')
    s.remove?.('nt:prueba')
    expect(localStorage.getItem('nt:prueba')).toBeNull()
  })
  it('localStore cae a memoria si localStorage lanza (modo privado / bloqueado)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const s = localStore()
    s.set('k', 'v')
    expect(s.get('k')).toBe('v')
  })
})

describe('themeVars', () => {
  it('convierte el tema en variables CSS y omite lo indefinido', () => {
    expect(themeVars({ accent: '#f00', radius: '4px', zIndex: 10 })).toEqual({
      '--gm-accent': '#f00',
      '--gm-radius': '4px',
      '--gm-z': '10',
    })
    expect(themeVars()).toEqual({})
  })
  it("font: 'inherit' toma la fuente del body", () => {
    document.body.style.fontFamily = 'Courier New'
    expect(themeVars({ font: 'inherit' })['--gm-font']).toContain('Courier New')
  })
})
