import { Tour, themeVars } from 'nexus-tours'
import type { Step, Theme, TourOptions } from 'nexus-tours'

/** Where progress is kept. Default: localStorage. Any async store works (your API, Supabase…). */
export interface ChecklistStorage {
  get(key: string): string | null | undefined | Promise<string | null | undefined>
  set(key: string, value: string): void | Promise<void>
  remove?(key: string): void | Promise<void>
}

export interface ChecklistItem {
  id: string
  title: string
  description?: string
  /** Steps (or a function returning a Tour). The item is checked off when the user finishes the tour. */
  tour?: Step[] | (() => Tour)
  /** Runs when the user picks the item (before its tour). */
  onSelect?: () => void
}

export interface ChecklistLabels {
  title: string
  /** {done} and {total} are replaced. */
  progress: string
  start: string
  review: string
  reset: string
  hide: string
  complete: string
  open: string
  close: string
  completed: string
  pending: string
}

export interface ChecklistOptions {
  /** Identifies this checklist in storage (e.g. "onboarding"). Use a new id to show it again to everyone. */
  id: string
  items: ChecklistItem[]
  /** Shared options for the tours of items that give `steps` (theme, practice, labels…). */
  tourOptions?: Omit<TourOptions, 'steps'>
  theme?: Theme
  font?: string
  css?: string
  className?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  position?: 'bottom-end' | 'bottom-start'
  storage?: ChecklistStorage | null
  storageKey?: string
  labels?: Partial<ChecklistLabels>
  /** Open the panel the first time (nothing done yet). Default false. */
  autoOpen?: boolean
  onComplete?: () => void
  container?: HTMLElement
}

export interface ChecklistProgress {
  done: number
  total: number
  complete: boolean
}
type Listener = () => void

const LABELS: ChecklistLabels = {
  title: 'Getting started',
  progress: '{done} / {total}',
  start: 'Start',
  review: 'Review',
  reset: 'Reset',
  hide: 'Hide',
  complete: 'All done! You have seen everything.',
  open: 'Open checklist',
  close: 'Close',
  completed: 'completed',
  pending: 'pending',
}

const CSS = `
:host{all:initial;position:fixed;inset-block-end:20px;inset-inline-end:20px;z-index:var(--gm-z,2147482000);color:var(--gm-fg,#1c1b22);font:var(--gm-font-size,15px)/1.4 var(--gm-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif)}
:host([data-pos=start]){inset-inline-end:auto;inset-inline-start:20px}
:host([hidden]){display:none}
*,*::before,*::after{box-sizing:border-box}
button{font:inherit;color:inherit;cursor:pointer}
.launch{display:flex;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:999px;border:1px solid var(--gm-border,transparent);background:var(--gm-bg,#fff);box-shadow:0 8px 28px rgba(0,0,0,.22);font-weight:700}
.sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.launch:focus-visible,.item:focus-visible,.link:focus-visible,.x:focus-visible{outline:2px solid var(--gm-accent,#4263eb);outline-offset:2px}
.ring{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;color:var(--gm-accent-fg,#fff);background:conic-gradient(var(--gm-accent,#4263eb) calc(var(--p,0)*1%),rgba(128,128,150,.28) 0)}
.ring span{width:20px;height:20px;border-radius:50%;background:var(--gm-bg,#fff);display:grid;place-items:center;color:var(--gm-fg,#1c1b22);font-size:10px;font-weight:800}
.ring.full{background:var(--gm-accent,#4263eb)}
.ring.full span{background:transparent;color:var(--gm-accent-fg,#fff);font-size:13px}
.panel{position:absolute;inset-block-end:58px;inset-inline-end:0;width:min(340px,calc(100vw - 24px));background:var(--gm-bg,#fff);border-radius:var(--gm-radius,10px);border:1px solid var(--gm-border,transparent);box-shadow:0 14px 44px rgba(0,0,0,.28);padding:14px;animation:in .16s ease-out}
:host([data-pos=start]) .panel{inset-inline-end:auto;inset-inline-start:0}
@keyframes in{from{opacity:0;transform:translateY(6px)}}
.head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.head h2{margin:0;font-size:1.05em}
.x{border:0;background:transparent;width:28px;height:28px;border-radius:50%;font-size:18px;line-height:1;opacity:.65}
.x:hover{opacity:1}
.bar{height:6px;border-radius:99px;background:rgba(128,128,150,.25);margin:10px 0 4px;overflow:hidden}
.bar i{display:block;height:100%;width:calc(var(--p,0)*1%);background:var(--gm-accent,#4263eb);border-radius:99px;transition:width .3s}
.meta{margin:0 0 8px;font-size:.86em;color:var(--gm-muted,#4a4958)}
ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.item{display:flex;align-items:center;gap:12px;width:100%;text-align:start;border:0;background:transparent;border-radius:calc(var(--gm-radius,10px) - 2px);padding:9px 8px}
.item:hover{background:rgba(66,99,235,.08);background:color-mix(in srgb,var(--gm-accent,#4263eb) 9%,transparent)}
.tick{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid var(--gm-muted,#4a4958);display:grid;place-items:center;font-size:12px;font-weight:800;color:transparent;opacity:.8}
.done .tick{background:var(--gm-accent,#4263eb);border-color:var(--gm-accent,#4263eb);color:var(--gm-accent-fg,#fff);opacity:1}
.txt{flex:1;min-width:0}
.txt b{display:block;font-weight:650}
.done .txt b{text-decoration:line-through;text-decoration-thickness:1px;opacity:.7}
.txt small{display:block;color:var(--gm-muted,#4a4958);font-size:.86em}
.act{flex:none;font-size:.82em;font-weight:700;color:var(--gm-accent,#4263eb)}
.foot{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid rgba(128,128,150,.22)}
.link{border:0;background:transparent;font-size:.84em;color:var(--gm-muted,#4a4958);text-decoration:underline;padding:2px}
.cheer{margin:6px 0 4px;font-weight:650;color:var(--gm-accent,#4263eb)}
@media (prefers-reduced-motion:reduce){.panel{animation:none}.bar i{transition:none}}
`

function memoryStorage(): ChecklistStorage {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) }
}
function localStore(): ChecklistStorage {
  try {
    const k = '__nexus_tours_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return { get: (key) => localStorage.getItem(key), set: (key, v) => localStorage.setItem(key, v), remove: (key) => localStorage.removeItem(key) }
  } catch {
    return memoryStorage() // private mode, blocked storage…
  }
}

/** Onboarding checklist: remembers which tours/tips each user has already seen. */
export class Checklist {
  /** Resolves once saved progress has been loaded (instant for localStorage). */
  readonly ready: Promise<void>
  private o: ChecklistOptions
  private labels: ChecklistLabels
  private store: ChecklistStorage
  private key: string
  private doneIds = new Set<string>()
  private dismissed = false
  private loaded = false
  private listeners = new Map<string, Set<Listener>>()
  private host: HTMLElement | null = null
  private shadow: ShadowRoot | null = null
  private isOpen = false
  private tour: Tour | null = null
  private mountedTo: HTMLElement | null = null

  constructor(options: ChecklistOptions) {
    this.o = options
    this.labels = { ...LABELS, ...options.labels }
    this.store = options.storage ?? (options.storage === null ? memoryStorage() : localStore())
    this.key = options.storageKey ?? `nexus-tours:checklist:${options.id}`
    this.ready = Promise.resolve()
      .then(() => this.store.get(this.key))
      .then((raw) => {
        if (raw) {
          try {
            const s = JSON.parse(raw) as { done?: string[]; dismissed?: boolean }
            this.doneIds = new Set(Array.isArray(s.done) ? s.done : [])
            this.dismissed = !!s.dismissed
          } catch {
            /* corrupt value: start fresh */
          }
        }
      })
      .catch(() => undefined)
      .then(() => {
        this.loaded = true
        this.emit('change')
        this.render()
        if (this.o.autoOpen && this.host && !this.doneIds.size && !this.dismissed) this.open()
      })
  }

  // ------------------------------------------------------------ state
  get items() {
    return this.o.items.map((i) => ({ ...i, done: this.doneIds.has(i.id) }))
  }
  get dismissedState() {
    return this.dismissed
  }
  isDone(id: string) {
    return this.doneIds.has(id)
  }
  progress(): ChecklistProgress {
    const total = this.o.items.length
    const done = this.o.items.filter((i) => this.doneIds.has(i.id)).length
    return { done, total, complete: total > 0 && done === total }
  }
  markDone(id: string) {
    if (this.doneIds.has(id) || !this.o.items.some((i) => i.id === id)) return
    const before = this.progress().complete
    this.doneIds.add(id)
    this.changed()
    if (!before && this.progress().complete) {
      this.emit('complete')
      this.o.onComplete?.()
    }
  }
  unmark(id: string) {
    if (this.doneIds.delete(id)) this.changed()
  }
  reset() {
    this.doneIds.clear()
    this.dismissed = false
    this.changed()
  }
  on(event: 'change' | 'complete', fn: Listener) {
    let set = this.listeners.get(event)
    if (!set) this.listeners.set(event, (set = new Set()))
    set.add(fn)
    return () => void set!.delete(fn)
  }
  private emit(event: string) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn()
      } catch (e) {
        console.error('[nexus-tours checklist]', e)
      }
    })
  }
  private changed() {
    void this.save()
    this.emit('change')
    this.render()
  }
  private async save() {
    if (!this.loaded) await this.ready
    try {
      await this.store.set(this.key, JSON.stringify({ done: [...this.doneIds], dismissed: this.dismissed }))
    } catch (e) {
      console.error('[nexus-tours checklist] could not save progress', e)
    }
  }

  // ------------------------------------------------------------ actions
  /** Runs the item's tour; the item is checked off when the user reaches the end. */
  async start(id: string) {
    const item = this.o.items.find((i) => i.id === id)
    if (!item) return
    this.close()
    item.onSelect?.()
    if (!item.tour) return this.markDone(id) // an action without a tour counts as done once picked
    this.tour?.destroy()
    const tour = typeof item.tour === 'function' ? item.tour() : new Tour({ ...this.o.tourOptions, steps: item.tour })
    this.tour = tour
    if (this.host) this.host.hidden = true
    const back = () => {
      if (this.tour === tour) this.tour = null
      if (this.host) this.host.hidden = this.dismissed
    }
    tour.on('end', () => this.markDone(id))
    tour.on('end', back)
    tour.on('stop', back)
    await tour.start()
  }
  open() {
    this.isOpen = true
    this.render()
  }
  close() {
    this.isOpen = false
    this.render()
  }
  toggle() {
    this.isOpen ? this.close() : this.open()
  }
  hide() {
    this.dismissed = true
    this.isOpen = false
    this.changed()
  }
  show() {
    this.dismissed = false
    this.changed()
  }

  // ------------------------------------------------------------ UI
  mount(container: HTMLElement = this.o.container ?? document.body) {
    if (this.host) return this
    const host = document.createElement('div')
    host.setAttribute('data-nexus-checklist', '')
    if (this.o.className) host.className = this.o.className
    host.dataset.pos = this.o.position === 'bottom-start' ? 'start' : 'end'
    for (const [k, v] of Object.entries(themeVars({ ...this.o.theme, ...(this.o.font ? { font: this.o.font } : {}) }))) host.style.setProperty(k, v)
    const d = this.o.dir ?? 'auto'
    host.dir = d === 'auto' ? (getComputedStyle(document.body).direction === 'rtl' ? 'rtl' : 'ltr') : d
    const shadow = host.attachShadow({ mode: 'open' })
    if ('adoptedStyleSheets' in shadow && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(CSS + (this.o.css ?? ''))
      shadow.adoptedStyleSheets = [sheet]
    } else {
      const s = document.createElement('style')
      s.textContent = CSS + (this.o.css ?? '')
      shadow.appendChild(s)
    }
    shadow.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.isOpen) {
        e.stopPropagation()
        this.close()
        ;(this.shadow?.querySelector('.launch') as HTMLElement | null)?.focus()
      }
    })
    this.host = host
    this.shadow = shadow
    this.mountedTo = container
    container.appendChild(host)
    this.render()
    if (this.loaded && this.o.autoOpen && !this.doneIds.size && !this.dismissed) this.open()
    return this
  }

  unmount() {
    this.tour?.destroy()
    this.tour = null
    this.host?.remove()
    this.host = this.shadow = this.mountedTo = null
    this.isOpen = false
  }

  private fmt(s: string, p: ChecklistProgress) {
    return s.replace('{done}', String(p.done)).replace('{total}', String(p.total))
  }

  private render() {
    const shadow = this.shadow
    const host = this.host
    if (!shadow || !host) return
    host.hidden = this.dismissed || !!this.tour
    const keepFocus = shadow.activeElement?.getAttribute('data-k')
    const p = this.progress()
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
    const L = this.labels
    const sheets = Array.from(shadow.children).filter((n) => n.tagName === 'STYLE')
    shadow.replaceChildren(...sheets)

    const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
      const el = document.createElement(tag)
      if (cls) el.className = cls
      if (text !== undefined) el.textContent = text
      return el
    }

    const launch = mk('button', 'launch')
    launch.type = 'button'
    launch.dataset.k = 'launch'
    launch.setAttribute('aria-expanded', String(this.isOpen))
    // Sin aria-label: el nombre accesible es el texto visible (WCAG 2.5.3) y aria-expanded indica si está abierto.
    launch.title = this.isOpen ? L.close : L.open
    const ring = mk('div', p.complete ? 'ring full' : 'ring')
    ring.style.setProperty('--p', String(pct))
    ring.appendChild(mk('span', undefined, p.complete ? '✓' : String(p.done)))
    launch.append(ring, mk('span', undefined, `${L.title} · ${this.fmt(L.progress, p)}`))
    launch.addEventListener('click', () => this.toggle())

    if (this.isOpen) {
      const panel = mk('div', 'panel')
      panel.setAttribute('role', 'region')
      panel.setAttribute('aria-label', L.title)
      const head = mk('div', 'head')
      head.appendChild(mk('h2', undefined, L.title))
      const x = mk('button', 'x', '×')
      x.type = 'button'
      x.setAttribute('aria-label', L.close)
      x.addEventListener('click', () => (this.close(), launch.focus()))
      head.appendChild(x)
      const bar = mk('div', 'bar')
      bar.style.setProperty('--p', String(pct))
      bar.setAttribute('role', 'progressbar')
      bar.setAttribute('aria-valuemin', '0')
      bar.setAttribute('aria-valuemax', String(p.total))
      bar.setAttribute('aria-valuenow', String(p.done))
      bar.setAttribute('aria-label', L.title)
      bar.setAttribute('aria-valuetext', this.fmt(L.progress, p))
      bar.appendChild(document.createElement('i'))
      panel.append(head, bar, mk('p', 'meta', this.fmt(L.progress, p)))
      if (p.complete) panel.appendChild(mk('p', 'cheer', L.complete))

      const ul = mk('ul')
      for (const it of this.o.items) {
        const done = this.doneIds.has(it.id)
        const li = mk('li')
        const b = mk('button', done ? 'item done' : 'item')
        b.type = 'button'
        b.dataset.k = `item:${it.id}`
        // El nombre accesible sale del texto visible + el estado oculto para lectores de pantalla (WCAG 2.5.3).
        const txt = mk('span', 'txt')
        txt.append(mk('b', undefined, it.title), mk('span', 'sr', `, ${done ? L.completed : L.pending}`))
        if (it.description) txt.appendChild(mk('small', undefined, it.description))
        const tick = mk('span', 'tick', '✓')
        tick.setAttribute('aria-hidden', 'true')
        b.append(tick, txt)
        if (it.tour || it.onSelect) b.appendChild(mk('span', 'act', done ? L.review : L.start))
        b.addEventListener('click', () => (it.tour || it.onSelect ? void this.start(it.id) : this.markDone(it.id)))
        li.appendChild(b)
        ul.appendChild(li)
      }
      panel.appendChild(ul)

      const foot = mk('div', 'foot')
      const hide = mk('button', 'link', L.hide)
      hide.type = 'button'
      hide.addEventListener('click', () => this.hide())
      const reset = mk('button', 'link', L.reset)
      reset.type = 'button'
      reset.addEventListener('click', () => this.reset())
      foot.append(hide, reset)
      panel.appendChild(foot)
      shadow.append(panel)
    }
    shadow.append(launch)
    if (keepFocus) (shadow.querySelector(`[data-k="${keepFocus}"]`) as HTMLElement | null)?.focus({ preventScroll: true })
  }
}

export function createChecklist(options: ChecklistOptions) {
  return new Checklist(options)
}
