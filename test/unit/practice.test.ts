import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PASS, PracticeSession } from '../../src/practice'
import type { PracticeOptions } from '../../src/practice'
import { supabasePractice } from '../../src/supabase'

let real: ReturnType<typeof vi.fn>
let sesion: PracticeSession | null = null

beforeEach(() => {
  real = vi.fn(async () => new Response('"real"', { status: 200, headers: { 'content-type': 'application/json' } }))
  window.fetch = real as unknown as typeof fetch
})
afterEach(() => {
  sesion?.stop()
  sesion = null
})

const iniciar = (o: PracticeOptions) => {
  sesion = new PracticeSession({ latency: 0, banner: false, ...o })
  sesion.start()
  return sesion
}
const json = async (r: Response) => (r.status === 204 ? null : r.json())

describe('PracticeSession (fetch)', () => {
  const datos = () => ({
    clients: [
      { id: 1, name: 'Ana', status: 'a' },
      { id: 2, name: 'Bruno', status: 'b' },
    ],
  })

  it('CRUD automático con rest', async () => {
    iniciar({ data: datos(), rest: { clients: '/api/clients' } })
    expect(await json(await fetch('/api/clients'))).toHaveLength(2)
    expect(await json(await fetch('/api/clients?status=b'))).toEqual([{ id: 2, name: 'Bruno', status: 'b' }])
    const creado = await fetch('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'Eli' }) })
    expect(creado.status).toBe(201)
    expect(creado.headers.get('x-practice-mode')).toBe('1')
    expect(await json(await fetch('/api/clients/3'))).toMatchObject({ id: 3, name: 'Eli' })
    expect(await json(await fetch('/api/clients/1', { method: 'PATCH', body: JSON.stringify({ name: 'Ana B' }) }))).toMatchObject({
      name: 'Ana B',
    })
    expect((await fetch('/api/clients/2', { method: 'DELETE' })).status).toBe(204)
    expect((await fetch('/api/clients/2')).status).toBe(404)
    expect(real).not.toHaveBeenCalled()
  })

  it('no muta los datos que le pasas', async () => {
    const d = datos()
    iniciar({ data: d, rest: { clients: '/api/clients' } })
    await fetch('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'X' }) })
    expect(d.clients).toHaveLength(2)
  })

  it('rutas propias con :params, PASS y Response a la medida', async () => {
    iniciar({
      data: datos(),
      routes: [
        { url: '/api/clients/:id/resumen', respond: ({ params, db }) => ({ id: params.id, total: db.clients!.length }) },
        { url: '/api/teapot', respond: () => new Response('no', { status: 418 }) },
        { url: '/api/paso', respond: () => PASS },
      ],
    })
    expect(await json(await fetch('/api/clients/7/resumen'))).toEqual({ id: '7', total: 2 })
    expect((await fetch('/api/teapot')).status).toBe(418)
    await fetch('/api/paso')
    expect(real).toHaveBeenCalledTimes(1)
  })

  it('bloquea escrituras sin ruta, deja pasar lecturas y respeta allow', async () => {
    const onBlocked = vi.fn()
    iniciar({ onBlocked, allow: ({ url }) => url.pathname === '/auth/token' })
    const r = await fetch('/api/otra', { method: 'DELETE' })
    expect(r.status).toBe(403)
    expect(await r.json()).toMatchObject({ error: 'practice-mode' })
    expect(onBlocked).toHaveBeenCalledWith({ method: 'DELETE', url: expect.stringContaining('/api/otra') })
    await fetch('/api/lectura')
    await fetch('/auth/token', { method: 'POST' })
    expect(real).toHaveBeenCalledTimes(2)
  })

  it('blockWrites: false deja pasar las escrituras', async () => {
    iniciar({ blockWrites: false })
    await fetch('/api/x', { method: 'POST' })
    expect(real).toHaveBeenCalledTimes(1)
  })

  it('acepta objetos Request', async () => {
    iniciar({ data: datos(), rest: { clients: '/api/clients' } })
    expect(await json(await fetch(new Request(new URL('/api/clients/1', location.href))))).toMatchObject({ id: 1 })
  })

  it('stop() restaura fetch, vacía los datos y llama onStart/onEnd en orden', () => {
    const ev: string[] = []
    const s = iniciar({ data: datos(), onStart: () => ev.push('start'), onEnd: () => ev.push('end') })
    expect(window.fetch).not.toBe(real)
    s.stop()
    sesion = null
    expect(window.fetch).toBe(real)
    expect(s.db).toEqual({})
    expect(ev).toEqual(['start', 'end'])
  })

  it('stop() no pisa a quien envolvió fetch después', () => {
    const s = iniciar({})
    const envoltura = vi.fn() as unknown as typeof fetch
    window.fetch = envoltura
    s.stop()
    sesion = null
    expect(window.fetch).toBe(envoltura)
  })
})

describe('supabasePractice (PostgREST sin cliente)', () => {
  const URL_SB = 'https://demo.supabase.co'
  const rest = (ruta: string, init?: RequestInit) => fetch(`${URL_SB}/rest/v1/${ruta}`, init)
  const opciones = () =>
    supabasePractice({
      url: URL_SB,
      data: {
        clients: [
          { id: 1, name: 'Ana', age: 30, status: 'active' },
          { id: 2, name: 'Bruno', age: null, status: 'pending' },
          { id: 3, name: 'Carla', age: 41, status: 'active' },
        ],
        orders: [{ id: 10, client_id: 1, total: 5 }],
      },
      relations: { orders: { clients: { table: 'clients', from: 'client_id' } } },
      defaults: { orders: { status: 'pending', folio: ({ db }) => `P-${db.orders!.length + 1}` } },
      rpc: { suma: ({ args }) => args.a + args.b },
    })

  it('filtros, orden con nulos y paginación', async () => {
    iniciar(opciones())
    expect(await json(await rest('clients?select=id&status=eq.active'))).toEqual([{ id: 1 }, { id: 3 }])
    expect(await json(await rest('clients?select=id&age=gt.35'))).toEqual([{ id: 3 }])
    expect(await json(await rest('clients?select=id&or=(status.eq.pending,age.gt.40)'))).toEqual([{ id: 2 }, { id: 3 }])
    expect(await json(await rest('clients?select=id&order=age.desc'))).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }])
    expect(await json(await rest('clients?select=id&order=id&limit=1&offset=1'))).toEqual([{ id: 2 }])
    expect(await json(await rest('clients?select=id&name=ilike.*AN*'))).toEqual([{ id: 1 }])
  })

  it('count exacto en content-range y single()', async () => {
    iniciar(opciones())
    const r = await rest('clients?select=id&limit=2', { headers: { prefer: 'count=exact' } })
    expect(r.headers.get('content-range')).toBe('0-1/3')
    const uno = await rest('clients?select=name&id=eq.2', { headers: { accept: 'application/vnd.pgrst.object+json' } })
    expect(await uno.json()).toEqual({ name: 'Bruno' })
    const varios = await rest('clients?select=*', { headers: { accept: 'application/vnd.pgrst.object+json' } })
    expect(varios.status).toBe(406)
    expect((await varios.json()).code).toBe('PGRST116')
  })

  it('joins declarados y error claro si no existe la relación', async () => {
    iniciar(opciones())
    expect(await json(await rest('orders?select=id,clients(name)'))).toEqual([{ id: 10, clients: { name: 'Ana' } }])
    const r = await rest('orders?select=id,facturas(x)')
    expect((await r.json()).code).toBe('PGRST200')
  })

  it('insert con defaults, conflicto 23505 y upsert', async () => {
    iniciar(opciones())
    const ins = await rest('orders?select=*', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ client_id: 3 }),
    })
    expect(await ins.json()).toEqual([{ id: 11, client_id: 3, status: 'pending', folio: 'P-2' }])
    const dup = await rest('clients', { method: 'POST', body: JSON.stringify({ id: 1, name: 'Dup' }) })
    expect((await dup.json()).code).toBe('23505')
    const up = await rest('clients?select=name,age', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id: 1, name: 'Ana 2' }),
    })
    expect(await up.json()).toEqual([{ name: 'Ana 2', age: 30 }])
  })

  it('rpc con handler; rpc sin handler y tablas no sembradas se bloquean al escribir', async () => {
    iniciar(opciones())
    expect(await json(await rest('rpc/suma', { method: 'POST', body: JSON.stringify({ a: 2, b: 3 }) }))).toBe(5)
    expect((await rest('rpc/borrar', { method: 'POST' })).status).toBe(403)
    expect((await rest('otra_tabla', { method: 'POST', body: '{}' })).status).toBe(403)
  })

  it('las llamadas de auth pasan al backend real', async () => {
    iniciar(opciones())
    await fetch(`${URL_SB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', body: '{}' })
    expect(real).toHaveBeenCalledTimes(1)
  })
})

describe('supabasePractice sin crypto.randomUUID (HTTP sin TLS, navegadores viejos)', () => {
  it("'uuid()' y los ids de texto siguen generando UUID v4", async () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      iniciar(supabasePractice({ data: { t: [{ id: 'a' }] }, defaults: { t: { token: 'uuid()' } } }))
      const r = await fetch('https://x.supabase.co/rest/v1/t?select=*', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: '{}',
      })
      const [fila] = await r.json()
      const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      expect(fila.id).toMatch(v4)
      expect(fila.token).toMatch(v4)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})

describe('PracticeSession (XMLHttpRequest)', () => {
  const xhr = (method: string, url: string, body?: string, responseType: XMLHttpRequestResponseType = '') =>
    new Promise<{ x: XMLHttpRequest; ev: string[] }>((res) => {
      const x = new XMLHttpRequest()
      const ev: string[] = []
      x.responseType = responseType
      x.onreadystatechange = () => ev.push('rs' + x.readyState)
      x.onload = () => ev.push('load')
      x.onloadend = () => res({ x, ev: [...ev, 'end'] })
      x.open(method, url)
      if (body) x.setRequestHeader('content-type', 'application/json')
      x.send(body)
    })

  it('responde GET/POST desde memoria con estado, cabeceras, responseURL y eventos en orden', async () => {
    iniciar({ data: { clients: [{ id: 1, name: 'Ana' }] }, rest: { clients: '/api/clients' } })
    const g = await xhr('GET', '/api/clients')
    expect(g.x.status).toBe(200)
    expect(JSON.parse(g.x.responseText)).toEqual([{ id: 1, name: 'Ana' }])
    expect(g.x.getResponseHeader('x-practice-mode')).toBe('1')
    expect(g.x.getAllResponseHeaders()).toContain('content-type: application/json')
    expect(g.x.responseURL).toMatch(/\/api\/clients$/)
    expect(g.ev).toEqual(['rs2', 'rs4', 'load', 'end'])
    const p = await xhr('POST', '/api/clients', JSON.stringify({ name: 'Zed' }), 'json')
    expect(p.x.status).toBe(201)
    expect(p.x.response).toMatchObject({ id: 2, name: 'Zed' })
  })

  it('bloquea escrituras sin ruta (403) y abort() cancela sin load', async () => {
    const onBlocked = vi.fn()
    iniciar({ onBlocked })
    const b = await xhr('DELETE', '/api/otra/1')
    expect(b.x.status).toBe(403)
    expect(onBlocked).toHaveBeenCalled()
    iniciar({ data: { c: [] }, rest: { c: '/api/c' }, latency: 50 })
    const ev = await new Promise<string[]>((res) => {
      const x = new XMLHttpRequest()
      const e: string[] = []
      x.onabort = () => e.push('abort')
      x.onload = () => e.push('load')
      x.onloadend = () => res([...e, 'end'])
      x.open('GET', '/api/c')
      x.send()
      x.abort()
    })
    expect(ev).toEqual(['abort', 'end'])
  })

  it('xhr: false no parchea XMLHttpRequest; stop() restaura el prototipo', () => {
    const send = XMLHttpRequest.prototype.send
    const s = iniciar({ xhr: false })
    expect(XMLHttpRequest.prototype.send).toBe(send)
    s.stop()
    const s2 = iniciar({})
    expect(XMLHttpRequest.prototype.send).not.toBe(send)
    s2.stop()
    sesion = null
    expect(XMLHttpRequest.prototype.send).toBe(send)
  })
})

describe('supabasePractice: más operadores', () => {
  const rest = (ruta: string, init?: RequestInit) => fetch(`https://p.supabase.co/rest/v1/${ruta}`, init)
  const ops = () =>
    supabasePractice({
      data: {
        t: [
          { id: 1, n: 'Ana', e: 'ana@x.com', d: null, k: 5 },
          { id: 2, n: 'Bea', e: 'bea@y.com', d: '2026-01-01', k: 7 },
          { id: 3, n: 'Cris', e: 'cris@y.com', d: null, k: 9 },
        ],
      },
      functions: { hola: ({ body }) => ({ hola: body?.n ?? 'nadie' }) },
    })
  const ids = async (r: Response) => ((await r.json()) as { id: number }[]).map((x) => x.id)

  it('in, is, neq, gte/lte, like, not y and', async () => {
    iniciar(ops())
    expect(await ids(await rest('t?select=id&id=in.(1,3,9)'))).toEqual([1, 3])
    expect(await ids(await rest('t?select=id&d=is.null'))).toEqual([1, 3])
    expect(await ids(await rest('t?select=id&n=neq.Ana'))).toEqual([2, 3])
    expect(await ids(await rest('t?select=id&k=gte.6&k=lte.8'))).toEqual([2])
    expect(await ids(await rest('t?select=id&e=like.*@y.com'))).toEqual([2, 3])
    expect(await ids(await rest('t?select=id&n=not.eq.Ana'))).toEqual([2, 3])
    expect(await ids(await rest('t?select=id&and=(k.gt.5,d.is.null)'))).toEqual([3])
  })

  it('HEAD cuenta, Range pagina, PATCH y DELETE con y sin representación', async () => {
    iniciar(ops())
    const h = await rest('t?select=*', { method: 'HEAD', headers: { prefer: 'count=exact' } })
    expect(h.headers.get('content-range')).toBe('0-2/3')
    expect(await ids(await rest('t?select=id&order=id', { headers: { range: '1-2' } }))).toEqual([2, 3])
    const pa = await rest('t?id=eq.1', { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ k: 0 }) })
    expect(await pa.json()).toMatchObject([{ id: 1, k: 0 }])
    expect((await rest('t?id=eq.2', { method: 'PATCH', body: JSON.stringify({ k: 1 }) })).status).toBe(204)
    expect((await rest('t?id=eq.3', { method: 'PATCH', body: '[]' })).status).toBe(400)
    expect((await rest('t?id=eq.3', { method: 'DELETE' })).status).toBe(204)
    const del = await rest('t?id=eq.2', { method: 'DELETE', headers: { prefer: 'return=representation' } })
    expect(await ids(del)).toEqual([2])
    expect(await ids(await rest('t?select=id'))).toEqual([1])
  })

  it('insert inválido, ignore-duplicates y funciones edge', async () => {
    iniciar(ops())
    expect((await rest('t', { method: 'POST', body: '"texto"' })).status).toBe(400)
    const ig = await rest('t', {
      method: 'POST',
      headers: { prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ id: 1, n: 'X' }),
    })
    expect(ig.status).toBe(201)
    expect((await (await rest('t?select=n&id=eq.1')).json())[0].n).toBe('Ana')
    const f = await fetch('https://p.supabase.co/functions/v1/hola', { method: 'POST', body: JSON.stringify({ n: 'Uri' }) })
    expect(await f.json()).toEqual({ hola: 'Uri' })
  })
})
