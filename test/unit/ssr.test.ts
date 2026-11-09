// @vitest-environment node
// SSR (Nuxt, Next…): importar y construir en el servidor no debe tronar; start() no hace nada sin DOM.
import { describe, expect, it } from 'vitest'

describe('SSR: sin window ni document', () => {
  it('el entorno de esta prueba no tiene DOM', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
  })

  it('todos los puntos de entrada se importan', async () => {
    const mods = await Promise.all([
      import('../../src/index'),
      import('../../src/global'),
      import('../../src/fixtures'),
      import('../../src/themes'),
      import('../../src/checklist'),
      import('../../src/builder'),
      import('../../src/supabase'),
      import('../../src/vue'),
      import('../../src/react'),
    ])
    for (const m of mods) expect(Object.keys(m).length).toBeGreaterThan(0)
  })

  it('Tour: se construye, start() no hace nada y status() funciona con memoria', async () => {
    const { Tour } = await import('../../src/index')
    const t = new Tour({ persist: { id: 'ssr' }, steps: [{ element: '#a', title: 'Hola' }] })
    await t.start()
    expect(t.active).toBe(false)
    expect(await t.status()).toBe('new')
    expect(await t.startIfNeeded()).toBe(false)
    t.stop()
    t.destroy()
  })

  it('Checklist y TourBuilder se construyen sin DOM', async () => {
    const { Checklist } = await import('../../src/checklist')
    const { TourBuilder } = await import('../../src/builder')
    const c = new Checklist({ id: 'ssr', items: [{ id: 'a', title: 'A' }] })
    await c.ready
    expect(c.progress().total).toBe(1)
    const b = new TourBuilder({ storage: null })
    await b.ready
    expect(b.toJSON().steps).toEqual([])
  })

  it('Vue: useTour fuera de un componente no truena (React se valida al importar)', async () => {
    const vue = await import('../../src/vue')
    const api = vue.useTour({ steps: [{ title: 'x' }] })
    await api.start()
    expect(api.active.value).toBe(false)
  })
})
