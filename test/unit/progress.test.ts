import { describe, expect, it } from 'vitest'
import { Progress } from '../../src/core/progress'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('Progress (persist)', () => {
  it('sin persist no guarda nada', async () => {
    const p = new Progress(undefined)
    expect(p.enabled).toBe(false)
    p.write('completed', 2)
    expect(await p.load()).toBeNull()
    await p.reset()
  })

  it('guarda y carga con la clave nexus-tours:tour:<id> y la versión', async () => {
    const db: Record<string, string> = {}
    const storage = { get: (k: string) => db[k] ?? null, set: (k: string, v: string) => void (db[k] = v) }
    const p = new Progress({ id: 'bienvenida', version: 2, storage })
    p.write('in-progress', 1)
    await tick()
    expect(JSON.parse(db['nexus-tours:tour:bienvenida']!)).toEqual({ status: 'in-progress', index: 1, v: 2 })
    expect(await p.load()).toEqual({ status: 'in-progress', index: 1 })
    expect(await new Progress({ id: 'bienvenida', version: 3, storage }).load()).toBeNull()
  })

  it('repetir un tour terminado no lo vuelve a "en progreso" (salvo force)', async () => {
    const p = new Progress({ id: 'x', storage: null })
    p.write('completed', 3, true)
    p.write('in-progress', 1)
    expect(p.saved).toEqual({ status: 'completed', index: 3 })
    p.write('in-progress', 1, true)
    expect(p.saved).toEqual({ status: 'in-progress', index: 1 })
  })

  it('storage: null usa memoria; reset borra con remove o con set vacío', async () => {
    const mem = new Progress({ id: 'm', storage: null })
    mem.write('dismissed', 0, true)
    await tick()
    expect((await mem.load())?.status).toBe('dismissed')
    await mem.reset()
    expect(await mem.load()).toBeNull()

    const db: Record<string, string> = {}
    const sinRemove = new Progress({ id: 's', storage: { get: async (k) => db[k] ?? null, set: async (k, v) => void (db[k] = v) } })
    sinRemove.write('completed', 1, true)
    await tick()
    await sinRemove.reset()
    expect(db['nexus-tours:tour:s']).toBe('')
    expect(await sinRemove.load()).toBeNull()
  })

  it('un storage que falla o datos corruptos no rompen nada', async () => {
    const roto = new Progress({
      id: 'r',
      storage: {
        get: () => '{no json',
        set: () => {
          throw new Error('lleno')
        },
        remove: async () => {
          throw new Error('x')
        },
      },
    })
    expect(await roto.load()).toBeNull()
    expect(() => roto.write('completed', 0, true)).not.toThrow()
    await expect(roto.reset()).resolves.toBeUndefined()
    const asincRoto = new Progress({
      id: 'a',
      storage: {
        get: async () => {
          throw new Error('red')
        },
        set: async () => {
          throw new Error('red')
        },
      },
    })
    expect(await asincRoto.load()).toBeNull()
    asincRoto.write('completed', 0, true)
    await tick()
  })
})
