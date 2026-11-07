/**
 * Supabase / PostgREST adapter for practice mode.
 *
 * While a tour runs, `supabase-js` (or any PostgREST client) is answered from in-memory example data:
 * filters, order, pagination, `.single()`, counts, insert/update/delete/upsert, simple joins, `rpc()` and
 * edge functions. Nothing reaches your real database. Auth calls go through so the session keeps working.
 */
import { PASS } from './practice'
import type { Db, PracticeOptions, PracticeRequest, PracticeRoute, Row } from './practice'

/** Many-to-one (`from` on this table → `to` on the target, default its primary key) or, with `many`, one-to-many. */
export interface Relation {
  table: string
  from: string
  to?: string
  many?: boolean
}

export interface SupabasePracticeOptions extends Omit<PracticeOptions, 'rest'> {
  /** Your project URL. Optional: by default any host's `/rest/v1/` is handled. */
  url?: string
  /** Primary key per table. Default `id`. */
  primaryKeys?: Record<string, string>
  /**
   * Joins for `select('*, clients(name)')`, as `{ table: { embedName: Relation } }`, e.g.
   * `{ orders: { clients: { table: 'clients', from: 'client_id' } }, clients: { orders: { table: 'orders', from: 'id', to: 'client_id', many: true } } }`
   */
  relations?: Record<string, Record<string, Relation>>
  /** `supabase.rpc('name', args)` handlers. An rpc without a handler is blocked (it could write). */
  rpc?: Record<string, (ctx: { args: any; db: Db; req: PracticeRequest }) => unknown>
  /** `supabase.functions.invoke('name', …)` handlers. */
  functions?: Record<string, (ctx: { body: any; db: Db; req: PracticeRequest }) => unknown>
  /** Real rpc names that are read-only and may reach your database during practice. */
  allowRpc?: string[]
}

/** A fetch that always calls the *current* `window.fetch`. Pass it to clients created before the tour starts. */
export const liveFetch: typeof fetch = (...args) => globalThis.fetch(...args)

class Bad extends Error {
  constructor(message: string, public code = 'PGRST100') {
    super(message)
  }
}

const res = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined || status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-practice-mode': '1', ...headers },
  })
const fail = (status: number, code: string, message: string, details: string | null = null) => res({ code, details, hint: null, message }, status)

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Split on top-level commas (ignores commas inside parentheses and double quotes). */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let q = false
  let cur = ''
  for (const c of s) {
    if (c === '"') q = !q
    if (!q && c === '(') depth++
    if (!q && c === ')') depth--
    if (!q && depth === 0 && c === ',') (out.push(cur), (cur = ''))
    else cur += c
  }
  if (cur.trim()) out.push(cur)
  return out
}
const unquote = (s: string) => (s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/\\(.)/g, '$1') : s)
const list = (v: string) => splitTop(v.replace(/^\(|\)$/g, '')).map((x) => unquote(x.trim()))

const cmp = (a: unknown, b: unknown) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)
const coerce = (cell: unknown, v: string): unknown => (typeof cell === 'number' ? Number(v) : typeof cell === 'boolean' ? v === 'true' : v)

type Pred = (r: Row) => boolean

function likeRe(pattern: string, ci: boolean) {
  return new RegExp('^' + esc(pattern).replace(/\\\*|%/g, '.*').replace(/_/g, '.') + '$', ci ? 'is' : 's')
}

/** One condition: `col` + `eq.5` / `not.in.(1,2)` / `ilike.*ana*`. */
function atom(col: string, expr: string): Pred {
  let neg = false
  let s = expr
  if (s.startsWith('not.')) ((neg = true), (s = s.slice(4)))
  const i = s.indexOf('.')
  const op = i < 0 ? s : s.slice(0, i)
  const val = i < 0 ? '' : s.slice(i + 1)
  const has = (r: Row) => r[col] !== null && r[col] !== undefined
  let p: Pred
  switch (op) {
    case 'eq': p = (r) => has(r) && r[col] === coerce(r[col], val); break
    case 'neq': p = (r) => has(r) && r[col] !== coerce(r[col], val); break
    case 'gt': p = (r) => has(r) && cmp(r[col], coerce(r[col], val)) > 0; break
    case 'gte': p = (r) => has(r) && cmp(r[col], coerce(r[col], val)) >= 0; break
    case 'lt': p = (r) => has(r) && cmp(r[col], coerce(r[col], val)) < 0; break
    case 'lte': p = (r) => has(r) && cmp(r[col], coerce(r[col], val)) <= 0; break
    case 'like': case 'ilike': { const re = likeRe(val, op === 'ilike'); p = (r) => has(r) && re.test(String(r[col])); break }
    case 'is': p = val === 'null' ? (r) => !has(r) : (r) => r[col] === (val === 'true'); break
    case 'in': { const l = list(val); p = (r) => has(r) && l.includes(String(r[col])); break }
    default: throw new Bad(`Operator "${op}" is not supported in practice mode`)
  }
  return neg ? (r) => !p(r) : p
}

function logic(kind: 'and' | 'or', inner: string): Pred {
  const parts = splitTop(inner).map((item) => {
    const t = item.trim()
    const m = /^(not\.)?(and|or)\((.*)\)$/s.exec(t)
    if (m) { const q = logic(m[2] as 'and' | 'or', m[3]!); return m[1] ? (r: Row) => !q(r) : q }
    const dot = t.indexOf('.')
    if (dot < 0) throw new Bad(`Invalid filter "${t}"`)
    return atom(t.slice(0, dot), t.slice(dot + 1))
  })
  return kind === 'and' ? (r) => parts.every((p) => p(r)) : (r) => parts.some((p) => p(r))
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

function predicate(sp: URLSearchParams): Pred {
  const ps: Pred[] = []
  for (const [k, v] of sp.entries()) {
    if (RESERVED.has(k)) continue
    if (k === 'or' || k === 'and') ps.push(logic(k, v.replace(/^\(|\)$/g, '')))
    else ps.push(atom(k, v))
  }
  return (r) => ps.every((p) => p(r))
}

function sorter(order: string | null): ((a: Row, b: Row) => number) | null {
  if (!order) return null
  const keys = order.split(',').map((x) => {
    const [col = '', ...mods] = x.trim().split('.')
    const desc = mods.includes('desc')
    return { col, desc, nullsFirst: mods.includes('nullsfirst') ? true : mods.includes('nullslast') ? false : desc }
  })
  return (a, b) => {
    for (const k of keys) {
      const x = a[k.col]
      const y = b[k.col]
      const nx = x === null || x === undefined
      const ny = y === null || y === undefined
      if (nx && ny) continue
      if (nx || ny) return nx ? (k.nullsFirst ? -1 : 1) : k.nullsFirst ? 1 : -1
      const c = cmp(x, y)
      if (c) return k.desc ? -c : c
    }
    return 0
  }
}

export function supabasePractice(o: SupabasePracticeOptions): PracticeOptions {
  const { url, primaryKeys = {}, relations = {}, rpc = {}, functions = {}, allowRpc = [], routes = [], allow, ...rest } = o
  const pk = (t: string) => primaryKeys[t] ?? 'id'
  const base = url ? esc(url.replace(/\/$/, '')) : ''
  const origin = url ? new URL(url).origin : null

  function project(rows: Row[], select: string | null, table: string, db: Db): Row[] {
    if (!select || select.trim() === '*') return rows
    const tokens = splitTop(select).map((t) => t.trim()).filter(Boolean)
    const out: Row[] = []
    for (const row of rows) {
      const o2: Row = {}
      let drop = false
      for (const t of tokens) {
        if (t === '*') { Object.assign(o2, row); continue }
        const em = /^(?:(\w+):)?(\w+)((?:![\w.]+)*)\((.*)\)$/s.exec(t)
        if (em) {
          const [, alias, name = '', hint = '', inner = ''] = em
          const rel = relations[table]?.[name]
          if (!rel) throw new Bad(`Could not find a relationship between '${table}' and '${name}'. In practice mode declare it in "relations".`, 'PGRST200')
          const target = db[rel.table] ?? []
          const to = rel.to ?? pk(rel.table)
          const hit = rel.many ? target.filter((r) => String(r[to]) === String(row[rel.from])) : target.find((r) => String(r[to]) === String(row[rel.from]))
          const val = rel.many ? project(hit as Row[], inner || '*', rel.table, db) : hit ? project([hit as Row], inner || '*', rel.table, db)[0]! : null
          if (hint.includes('inner') && (rel.many ? !(val as Row[]).length : !val)) drop = true
          o2[alias ?? name] = val
          continue
        }
        const cm = /^(?:(\w+):)?(\w+)(?:::\w+)?$/.exec(t)
        if (cm) o2[cm[1] ?? cm[2]!] = row[cm[2]!]
      }
      if (!drop) out.push(o2)
    }
    return out
  }

  const nextId = (rows: Row[], key: string): unknown => {
    const ids = rows.map((r) => r[key])
    if (ids.some((i) => typeof i === 'string')) return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    const nums = ids.map(Number).filter((n) => !Number.isNaN(n))
    return (nums.length ? Math.max(...nums) : 0) + 1
  }

  function table(req: PracticeRequest, name: string): Response | typeof PASS {
    const rows = req.db[name]
    if (!rows) return PASS
    const sp = req.url.searchParams
    const prefer = req.headers.get('prefer') ?? ''
    const wantsRep = /return=representation/.test(prefer)
    const single = (req.headers.get('accept') ?? '').includes('vnd.pgrst.object')
    const select = sp.get('select')
    const out = (data: Row[], status: number, extra: Record<string, string> = {}) => {
      const shaped = project(data, select, name, req.db)
      if (!single) return res(shaped, status, extra)
      if (shaped.length !== 1) return fail(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', `The result contains ${shaped.length} rows`)
      return res(shaped[0], status, extra)
    }

    switch (req.method) {
      case 'GET':
      case 'HEAD': {
        let found = rows.filter(predicate(sp))
        const total = found.length
        const sort = sorter(sp.get('order'))
        if (sort) found = [...found].sort(sort)
        const range = /^(\d+)-(\d*)$/.exec(req.headers.get('range') ?? '')
        const off = sp.has('offset') ? Number(sp.get('offset')) : range ? Number(range[1]) : 0
        const lim = sp.has('limit') ? Number(sp.get('limit')) : range && range[2] ? Number(range[2]) - off + 1 : undefined
        found = found.slice(off, lim === undefined ? undefined : off + lim)
        const crange = `${found.length ? `${off}-${off + found.length - 1}` : '*'}/${/count=/.test(prefer) ? total : '*'}`
        if (req.method === 'HEAD') return res(undefined, 200, { 'content-range': crange })
        return out(found, 200, { 'content-range': crange })
      }
      case 'POST': {
        const items = Array.isArray(req.body) ? req.body : [req.body]
        if (items.some((x) => !x || typeof x !== 'object')) return fail(400, 'PGRST102', 'Empty or invalid json')
        const key = pk(name)
        const cols = (sp.get('on_conflict') ?? key).split(',')
        const merge = /resolution=merge-duplicates/.test(prefer)
        const ignore = /resolution=ignore-duplicates/.test(prefer)
        const made: Row[] = []
        for (const item of items as Row[]) {
          const row = { ...item }
          const at = cols.every((c) => row[c] !== undefined) ? rows.findIndex((r) => cols.every((c) => String(r[c]) === String(row[c]))) : -1
          if (at >= 0) {
            if (merge) (rows[at] = { ...rows[at], ...row }, made.push(rows[at]!))
            else if (!ignore) return fail(409, '23505', `duplicate key value violates unique constraint "${name}_pkey"`, `Key (${cols.join(', ')})=(${cols.map((c) => row[c]).join(', ')}) already exists.`)
            continue
          }
          if (row[key] === undefined) row[key] = nextId(rows, key)
          rows.push(row)
          made.push(row)
        }
        return wantsRep ? out(made, 201) : res(undefined, 201)
      }
      case 'PATCH': {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return fail(400, 'PGRST102', 'Empty or invalid json')
        const match = predicate(sp)
        const hit: Row[] = []
        rows.forEach((r, i) => {
          if (match(r)) (rows[i] = { ...r, ...(req.body as Row) }, hit.push(rows[i]!))
        })
        return wantsRep ? out(hit, 200) : res(undefined, 204)
      }
      case 'DELETE': {
        const match = predicate(sp)
        const gone: Row[] = []
        for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i]!)) gone.unshift(...rows.splice(i, 1))
        return wantsRep ? out(gone, 200) : res(undefined, 204)
      }
    }
    return PASS
  }

  const wrap = (fn: (req: PracticeRequest) => Response | typeof PASS | unknown) => (req: PracticeRequest) => {
    try {
      return fn(req)
    } catch (e) {
      if (e instanceof Bad) return fail(400, e.code, e.message)
      throw e
    }
  }
  const nameOf = (req: PracticeRequest, marker: string) => decodeURIComponent(req.url.pathname.split(marker)[1]!.split('/')[0]!)

  const mine: PracticeRoute[] = [
    {
      url: new RegExp(`${base}/rest/v1/rpc/[^/?#]+`),
      respond: wrap((req) => {
        const fn = rpc[nameOf(req, '/rest/v1/rpc/')]
        if (!fn) return PASS
        const args = req.method === 'GET' ? Object.fromEntries(req.url.searchParams) : (req.body ?? {})
        return res((fn({ args, db: req.db, req }) ?? null) as unknown)
      }),
    },
    {
      url: new RegExp(`${base}/functions/v1/[^/?#]+`),
      respond: wrap((req) => {
        const fn = functions[nameOf(req, '/functions/v1/')]
        return fn ? res((fn({ body: req.body, db: req.db, req }) ?? null) as unknown) : PASS
      }),
    },
    { url: new RegExp(`${base}/rest/v1/(?!rpc/)[^/?#]+`), respond: wrap((req) => table(req, nameOf(req, '/rest/v1/'))) },
  ]

  return {
    ...rest,
    routes: [...routes, ...mine],
    allow: (r) =>
      (!origin || r.url.origin === origin) &&
      (r.url.pathname.startsWith('/auth/v1/') || allowRpc.some((n) => r.url.pathname === `/rest/v1/rpc/${n}`))
        ? true
        : (allow?.(r) ?? false),
  }
}
