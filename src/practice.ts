/**
 * Practice mode: while a tour runs, `fetch` is answered from in-memory example data so new users can
 * click around safely. Writes that no route handles are blocked instead of reaching the real backend.
 */
export type Row = Record<string, unknown>
export type Db = Record<string, Row[]>

export interface PracticeRequest {
  method: string
  url: URL
  /** Parsed JSON body (or the raw text / undefined). */
  body: unknown
  /** `:name` segments of a string route. */
  params: Record<string, string>
  /** The in-memory data (a copy: the original `data` is never modified). */
  db: Db
}

export interface PracticeRoute {
  /** Default: any method. */
  method?: string | string[]
  /** Pathname with optional `:params` ("/api/clients/:id/notes") or a RegExp tested against the full URL. */
  url: string | RegExp
  /** Return a value (sent as JSON, 200) or a `Response` for full control. */
  respond: (req: PracticeRequest) => unknown | Response | Promise<unknown | Response>
}

export interface PracticeOptions {
  /** Tables, e.g. from `createFixtures()`. Copied: the tour never mutates what you pass. */
  data?: Db
  /** Automatic CRUD over a table: `{ clients: '/api/clients' }` or `{ clients: { path, idField } }`. */
  rest?: Record<string, string | { path: string; idField?: string }>
  /** Custom routes; checked before `rest`. */
  routes?: PracticeRoute[]
  /** Simulated network delay in ms. Default 120. */
  latency?: number
  /** Block POST/PUT/PATCH/DELETE that no route handles. Default true. */
  blockWrites?: boolean
  /** Show the "practice mode" pill. Default true. */
  banner?: boolean
  /** Called right after interception starts (refresh your UI so it loads the example data). */
  onStart?: () => void
  /** Called after interception stops (refresh your UI so it shows the real data again). */
  onEnd?: () => void
  /** Called when a write was blocked. */
  onBlocked?: (info: { method: string; url: string }) => void
}

const WRITE = /^(POST|PUT|PATCH|DELETE)$/i
const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-practice-mode': '1' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pathRegex(pattern: string) {
  const src = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([A-Za-z_]\w*)/g, '(?<$1>[^/]+)')
  return new RegExp(`^${src}/?$`)
}

export class PracticeSession {
  db: Db
  private original: typeof fetch | null = null
  private patched: typeof fetch | null = null

  constructor(private o: PracticeOptions) {
    this.db = JSON.parse(JSON.stringify(o.data ?? {})) as Db
  }

  start() {
    if (this.original || typeof window === 'undefined') return
    this.original = window.fetch
    const original = this.original
    this.patched = (input: RequestInfo | URL, init?: RequestInit) => this.handle(original, input, init)
    window.fetch = this.patched
    this.o.onStart?.()
  }

  stop() {
    if (!this.original) return
    // Only restore if nobody wrapped fetch on top of ours in the meantime.
    if (window.fetch === this.patched) window.fetch = this.original
    this.original = this.patched = null
    this.db = {}
    this.o.onEnd?.()
  }

  private async handle(original: typeof fetch, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const isReq = typeof Request !== 'undefined' && input instanceof Request
    const method = (init?.method ?? (isReq ? (input as Request).method : 'GET')).toUpperCase()
    const url = new URL(isReq ? (input as Request).url : String(input instanceof URL ? input.href : input), location.href)

    let raw: string | undefined
    try {
      if (typeof init?.body === 'string') raw = init.body
      else if (isReq && !init?.body) raw = await (input as Request).clone().text()
    } catch {
      raw = undefined
    }
    let body: unknown = raw
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        /* keep raw text */
      }
    }

    const res = await this.route(method, url, body)
    if (res) {
      await sleep(this.o.latency ?? 120)
      return res
    }
    if (WRITE.test(method) && this.o.blockWrites !== false) {
      this.o.onBlocked?.({ method, url: url.href })
      return json({ error: 'practice-mode', message: 'Writes are disabled while the tour runs in practice mode.' }, 403)
    }
    return original(input as RequestInfo, init)
  }

  private async route(method: string, url: URL, body: unknown): Promise<Response | null> {
    for (const r of this.o.routes ?? []) {
      const methods = r.method === undefined ? null : ([] as string[]).concat(r.method).map((m) => m.toUpperCase())
      if (methods && !methods.includes(method)) continue
      let params: Record<string, string> | null = null
      if (typeof r.url === 'string') params = pathRegex(r.url).exec(url.pathname)?.groups ?? (pathRegex(r.url).test(url.pathname) ? {} : null)
      else if (r.url.test(url.href)) params = {}
      if (!params) continue
      const out = await r.respond({ method, url, body, params: { ...params }, db: this.db })
      return out instanceof Response ? out : json(out ?? {})
    }
    for (const [table, cfg] of Object.entries(this.o.rest ?? {})) {
      const path = (typeof cfg === 'string' ? cfg : cfg.path).replace(/\/$/, '')
      const idField = typeof cfg === 'string' ? 'id' : (cfg.idField ?? 'id')
      const rows = (this.db[table] ??= [])
      const isColl = url.pathname.replace(/\/$/, '') === path
      const m = !isColl && url.pathname.startsWith(path + '/') ? decodeURIComponent(url.pathname.slice(path.length + 1).replace(/\/$/, '')) : null
      if (!isColl && m === null) continue
      const find = () => rows.findIndex((r) => String(r[idField]) === m)

      if (isColl) {
        if (method === 'GET') {
          // ?field=value → equality filter
          const filters = [...url.searchParams.entries()]
          return json(rows.filter((r) => filters.every(([k, v]) => String(r[k]) === v)))
        }
        if (method === 'POST') {
          const row = { ...(body as Row) }
          if (row[idField] === undefined) {
            const nums = rows.map((r) => Number(r[idField])).filter((n) => !Number.isNaN(n))
            row[idField] = (nums.length ? Math.max(...nums) : 0) + 1
          }
          rows.push(row)
          return json(row, 201)
        }
        return null
      }
      const i = find()
      if (method === 'GET') return i < 0 ? json({ error: 'not found' }, 404) : json(rows[i])
      if (method === 'PATCH' || method === 'PUT') {
        if (i < 0) return json({ error: 'not found' }, 404)
        rows[i] = method === 'PUT' ? { ...(body as Row), [idField]: rows[i]![idField] } : { ...rows[i], ...(body as Row) }
        return json(rows[i])
      }
      if (method === 'DELETE') {
        if (i < 0) return json({ error: 'not found' }, 404)
        rows.splice(i, 1)
        return json(null, 204)
      }
    }
    return null
  }
}
