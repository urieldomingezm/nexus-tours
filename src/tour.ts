import { CSS } from './styles'
import type { AdvanceOn, Labels, PersistStorage, Router, Side, Step, StepContext, TargetRef, Theme, TourApi, TourEvent, TourOptions, TourStatus } from './types'
import { PracticeSession } from './practice'
import { themeVars } from './theme'
import { isVisible, waitForElement } from './wait'
import { localStore, memoryStore } from './storage'
import { resolveRouter, sameRoute } from './router'

const DEFAULT_LABELS: Labels = {
  next: 'Next',
  previous: 'Back',
  done: 'Done',
  close: 'Close tour',
  progress: '{current} / {total}',
  practice: 'Practice mode · nothing is saved',
  never: "Don't show again",
}

const GAP = 12
const EDGE = 8

function resolveRef(ref: TargetRef | undefined): Element | null {
  if (!ref) return null
  if (typeof ref === 'string') return document.querySelector(ref)
  if (typeof ref === 'function') return ref() ?? null
  return ref
}

function isModalDialog(d: Element): boolean {
  try {
    return d.matches(':modal')
  } catch {
    return false
  }
}

/** Closest ancestor that acts as a modal: native <dialog>, aria-modal or role=dialog. */
function modalHost(el: Element | null): HTMLElement | null {
  const own = el?.closest('dialog[open], [aria-modal="true"], [role="dialog"], [role="alertdialog"]')
  if (own instanceof HTMLElement) return own
  // A modal <dialog> makes everything outside it inert: stay inside the open one.
  const open = Array.from(document.querySelectorAll('dialog[open]')).filter(isModalDialog)
  return (open[open.length - 1] as HTMLElement | undefined) ?? null
}

export class Tour implements TourApi {
  private opts: Required<Pick<TourOptions, 'waitTimeout' | 'onMissing' | 'closeOnBackdrop' | 'closeOnEsc' | 'keyboard' | 'showProgress' | 'padding'>> &
    TourOptions
  private labels: Labels
  private listeners = new Map<TourEvent, Set<(ctx: StepContext) => void>>()

  private _index = -1
  private _active = false
  private nav = 0
  private busy = false
  private dir: 1 | -1 = 1
  private shown: Step | null = null
  private target: Element | null = null
  private lastKey = ''

  private root: HTMLElement | null = null
  private shadow!: ShadowRoot
  private backdrop!: HTMLElement
  private ring!: HTMLElement
  private pop!: HTMLElement
  private live!: HTMLElement
  private arrow: HTMLElement | null = null
  private raf = 0
  private session: PracticeSession | null = null
  private rtl = false
  private previousFocus: Element | null = null
  private router: Router | null
  private store: PersistStorage | null = null
  private saved: { status: Exclude<TourStatus, 'new'>; index: number } | null = null
  private disarm: (() => void) | null = null
  private untilFn: (() => void) | null = null
  private spacer: HTMLElement | null = null

  constructor(options: TourOptions) {
    this.opts = {
      waitTimeout: 5000,
      onMissing: 'skip',
      closeOnBackdrop: false,
      closeOnEsc: true,
      keyboard: true,
      showProgress: true,
      padding: 6,
      ...options,
    }
    this.labels = { ...DEFAULT_LABELS, ...options.labels }
    this.router = resolveRouter(options.router)
    const p = options.persist
    if (p) this.store = p.storage ?? (p.storage === null ? memoryStore() : localStore())
  }

  get index() {
    return this._index
  }
  get active() {
    return this._active
  }
  get practiceData() {
    return this.session?.db
  }

  on(event: TourEvent, fn: (ctx: StepContext) => void) {
    let set = this.listeners.get(event)
    if (!set) this.listeners.set(event, (set = new Set()))
    set.add(fn)
    return () => void set!.delete(fn)
  }

  private emit(event: TourEvent) {
    const ctx = this.ctx()
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(ctx)
      } catch (e) {
        console.error('[guiame]', e)
      }
    })
  }

  private ctx(): StepContext {
    return { index: this._index, step: this.opts.steps[this._index] as Step, element: this.target, tour: this }
  }

  // ---------------------------------------------------------------- saved progress

  private key() {
    return `nexus-tours:tour:${this.opts.persist!.id}`
  }

  private async load() {
    if (!this.store) return null
    try {
      const raw = await this.store.get(this.key())
      if (!raw) return null
      const s = JSON.parse(raw) as { status: Exclude<TourStatus, 'new'>; index: number; v?: unknown }
      return s.v === (this.opts.persist!.version ?? null) ? { status: s.status, index: s.index } : null
    } catch {
      return null
    }
  }

  private write(status: Exclude<TourStatus, 'new'>, index: number, force = false) {
    if (!this.store) return
    // Replaying a finished tour must not turn it back into "in progress".
    if (!force && status === 'in-progress' && this.saved && this.saved.status !== 'in-progress') return
    this.saved = { status, index }
    try {
      void Promise.resolve(this.store.set(this.key(), JSON.stringify({ status, index, v: this.opts.persist!.version ?? null }))).catch(() => {})
    } catch {
      /* storage unavailable: progress just isn't saved */
    }
  }

  async status(): Promise<TourStatus> {
    return (await this.load())?.status ?? 'new'
  }

  async startIfNeeded() {
    if (this._active || !this.opts.steps.length) return false
    const s = await this.load()
    if (s && s.status !== 'in-progress') return false
    await this.start(Math.min(Math.max(0, s?.index ?? 0), this.opts.steps.length - 1))
    return true
  }

  async reset() {
    this.saved = null
    if (!this.store) return
    try {
      await (this.store.remove ? this.store.remove(this.key()) : this.store.set(this.key(), ''))
    } catch {
      /* ignore */
    }
  }

  async start(index = 0) {
    if (this._active || !this.opts.steps.length) return
    this._active = true
    this.previousFocus = document.activeElement
    if (this.store) {
      this.saved = await this.load()
      if (!this._active) return
    }
    this.build()
    if (this.opts.practice) {
      this.session = new PracticeSession(this.opts.practice)
      this.session.start()
    }
    document.addEventListener('keydown', this.onKey, true)
    this.emit('start')
    this.tick()
    await this.goTo(index)
  }

  async next() {
    this.dir = 1
    return this.goTo(this._index + 1)
  }

  async previous() {
    this.dir = -1
    return this.goTo(Math.max(0, this._index - 1))
  }

  async goTo(index: number) {
    if (!this._active) return
    if (index !== this._index) this.dir = index > this._index ? 1 : -1
    const my = ++this.nav
    await this.leave()
    if (my !== this.nav) return
    if (index >= this.opts.steps.length) return this.finish()
    this._index = Math.max(0, index)
    await this.show(this._index, true, my)
  }

  stop() {
    if (!this._active) return
    this.emit('stop')
    void this.leave()
    this.teardown()
  }

  destroy() {
    this.stop()
    this.listeners.clear()
  }

  private finish() {
    this.write('completed', this.opts.steps.length - 1, true)
    this.emit('end')
    this.teardown()
  }

  private async leave() {
    this.clearAdvance()
    const step = this.shown
    if (!step) return
    const ctx = this.ctx()
    this.shown = null
    try {
      await step.after?.(ctx)
    } catch (e) {
      console.error('[guiame] after()', e)
    }
  }

  private async show(i: number, runBefore: boolean, my: number): Promise<void> {
    const step = this.opts.steps[i] as Step
    const self = this
    const aborted = {
      get aborted() {
        return !self._active || self.nav !== my
      },
    }
    this.busy = true
    this.target = null
    this.lastKey = ''
    this.ring.style.display = 'none'
    this.clearAdvance()
    this.spacer?.remove()
    this.spacer = null
    try {
      const router = this.router
      if (step.route && router && !sameRoute(router.current(), step.route)) {
        if (router.reloads) {
          // The page is about to unload: save the step so the next page resumes here (startIfNeeded).
          this.write('in-progress', i, true)
          await router.go(step.route)
          return
        }
        await router.go(step.route)
        const end = Date.now() + (step.waitTimeout ?? this.opts.waitTimeout)
        while (!sameRoute(router.current(), step.route) && Date.now() < end) {
          await new Promise((r) => setTimeout(r, 40))
          if (aborted.aborted) return
        }
        if (aborted.aborted) return
      }
      if (runBefore) {
        try {
          await step.before?.({ index: i, step, element: null, tour: this })
        } catch (e) {
          console.error('[guiame] before()', e)
        }
        if (aborted.aborted) return
      }

      let el: Element | null = null
      if (step.element !== undefined) {
        el = await waitForElement(() => resolveRef(step.element), step.waitTimeout ?? this.opts.waitTimeout, aborted)
        if (aborted.aborted) return
        if (!el) {
          this.target = null
          this.emit('missing')
          if ((step.onMissing ?? this.opts.onMissing) === 'stop') return this.stop()
          let n = i + this.dir
          if (n < 0) {
            this.dir = 1
            n = i + 1
          }
          this.busy = false
          this.shown = null
          this._index = Math.min(n, this.opts.steps.length)
          if (n >= this.opts.steps.length) return this.finish()
          return await this.show(n, true, my)
        }
      }

      this.target = el
      this.shown = step
      this.mount(el)
      this.renderPopover(step, i)
      this.reposition(true)
      if (el) {
        this.reveal(el) // after the first layout: on phones it needs the sheet's height
        this.reposition(true)
      }
      this.pop.focus({ preventScroll: true })
      this.emit('step')
      this.write('in-progress', i)
      this.armAdvance(step, my)
    } finally {
      if (this.nav === my) this.busy = false
    }
  }

  /** Scrolls only when needed: centered if it is off-screen, minimal if it is clipped by a scroll container. */
  private reveal(el: Element) {
    const behavior = this.reduceMotion() ? 'auto' : 'smooth'
    if (this.pop.dataset.mode === 'sheet') {
      // Phone: bring it into view, then a bit more so it ends up above the bottom sheet.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
      const rect = el.getBoundingClientRect()
      const over = Math.min(rect.bottom - (window.innerHeight - this.pop.offsetHeight - 24), rect.top - 8)
      if (over > 0) {
        let s: Element | null = el.parentElement
        while (s && !(s.scrollHeight > s.clientHeight && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement
        const scroller = s ?? document.scrollingElement
        if (scroller) {
          const from = scroller.scrollTop
          scroller.scrollBy({ top: over, behavior: 'auto' })
          const missing = over - (scroller.scrollTop - from)
          if (missing > 1) {
            // The target is at the very end of the page: add temporary room below it so it can rise above the sheet.
            const sp = document.createElement('div')
            sp.setAttribute('aria-hidden', 'true')
            sp.style.cssText = `height:${Math.ceil(missing)}px;width:1px;flex:none;pointer-events:none`
            ;(s ?? document.body).appendChild(sp)
            this.spacer = sp
            scroller.scrollBy({ top: missing, behavior: 'auto' })
          }
        }
      }
      return
    }
    const r = el.getBoundingClientRect()
    const inView = r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= document.documentElement.clientWidth
    el.scrollIntoView({ block: inView ? 'nearest' : 'center', inline: 'nearest', behavior })
  }

  // ---------------------------------------------------------------- interactive steps

  private clearAdvance() {
    this.disarm?.()
    this.disarm = null
    this.untilFn = null
  }

  /** `advanceOn`: move on by itself when the user does the action. */
  private armAdvance(step: Step, my: number) {
    this.clearAdvance()
    const raw = step.advanceOn
    if (!raw) return
    const a: AdvanceOn = typeof raw === 'string' ? { event: raw } : raw
    const go = () => {
      this.clearAdvance()
      setTimeout(() => {
        if (this._active && this.nav === my && this.shown === step) void this.next()
      }, a.delay ?? 0)
    }
    if (a.event) {
      const ev = a.event
      const h = (e: Event) => {
        const path = e.composedPath()
        if (this.root && path.includes(this.root)) return // the tour's own buttons
        const t = a.target !== undefined ? resolveRef(a.target) : this.target
        if (a.target !== undefined && !t) return
        if (t && !path.includes(t)) return
        if (a.when && !a.when(e, this.ctx())) return
        go()
      }
      document.addEventListener(ev, h, true)
      this.disarm = () => document.removeEventListener(ev, h, true)
    }
    if (a.until) {
      const f = a.until
      this.untilFn = () => {
        if (f(this.ctx())) go()
      }
    }
  }

  private isSheet(vw: number) {
    const m = this.opts.mobile ?? 'auto'
    return m === 'always' || (m === 'auto' && vw <= (this.opts.mobileBreakpoint ?? 600))
  }

  private reduceMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  // ---------------------------------------------------------------- DOM

  private build() {
    this.injectFonts()
    const host = document.createElement('div')
    host.setAttribute('data-nexus-tours', '')
    if (this.opts.className) host.className = this.opts.className
    if ('showPopover' in host) host.setAttribute('popover', 'manual')
    this.applyTheme(host)
    const dirOpt = this.opts.dir ?? 'auto'
    this.rtl = dirOpt === 'rtl' || (dirOpt === 'auto' && getComputedStyle(document.body).direction === 'rtl')
    host.dir = this.rtl ? 'rtl' : 'ltr'

    // Shadow DOM: the page's CSS can't break the tour and the tour's CSS can't leak into the page.
    const shadow = host.attachShadow({ mode: 'open' })
    const css = CSS + (this.opts.css ?? '')
    if ('adoptedStyleSheets' in shadow && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      shadow.adoptedStyleSheets = [sheet]
    } else {
      const s = document.createElement('style')
      if (this.opts.nonce) s.nonce = this.opts.nonce
      s.textContent = css
      shadow.appendChild(s)
    }

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'gm-backdrop'
    this.backdrop.setAttribute('part', 'backdrop')
    this.backdrop.addEventListener('click', () => this.opts.closeOnBackdrop && this.stop())

    this.ring = document.createElement('div')
    this.ring.className = 'gm-ring'
    this.ring.setAttribute('part', 'ring')

    this.pop = document.createElement('div')
    this.pop.className = 'gm-pop'
    this.pop.setAttribute('part', 'popover')
    this.pop.tabIndex = -1
    this.pop.setAttribute('role', 'dialog')
    this.pop.setAttribute('aria-modal', 'false')
    // Phone: swipe the sheet sideways to move between steps.
    let sx = 0
    let sy = 0
    this.pop.addEventListener('touchstart', (e) => ((sx = e.touches[0]!.clientX), (sy = e.touches[0]!.clientY)), { passive: true })
    this.pop.addEventListener('touchend', (e) => {
      if (this.pop.dataset.mode !== 'sheet') return
      const t = e.changedTouches[0]!
      const dx = t.clientX - sx
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(t.clientY - sy) * 1.5) return
      if (this.rtl ? dx > 0 : dx < 0) {
        if (!(this.shown?.hideNext && this.shown.advanceOn)) void this.next()
      } else void this.previous()
    })

    this.live = document.createElement('div')
    this.live.className = 'gm-sr'
    this.live.setAttribute('aria-live', 'polite')

    shadow.append(this.backdrop, this.ring, this.pop, this.live)
    if (this.opts.practice && this.opts.practice.banner !== false) {
      const b = document.createElement('div')
      b.className = 'gm-banner'
      b.setAttribute('part', 'banner')
      b.textContent = this.labels.practice
      shadow.appendChild(b)
    }
    this.root = host
    this.shadow = shadow
  }

  private applyTheme(host: HTMLElement) {
    const th: Theme = { ...this.opts.theme }
    if (this.opts.font) th.font = this.opts.font
    if (!th.font && this.opts.fonts?.length) th.font = `"${this.opts.fonts[0]!.family.replace(/"/g, '')}", system-ui, sans-serif`
    for (const [k, v] of Object.entries(themeVars(th))) host.style.setProperty(k, v)
  }

  /** @font-face rules must live in the page (not in a shadow root); they are added once. */
  private injectFonts() {
    for (const f of this.opts.fonts ?? []) {
      const key = `${f.family}|${f.src}|${f.weight ?? ''}|${f.style ?? ''}`
      if (Array.from(document.querySelectorAll('style[data-nexus-tours-font]')).some((n) => (n as HTMLElement).dataset.nexusToursFont === key)) continue
      const s = document.createElement('style')
      s.dataset.nexusToursFont = key
      if (this.opts.nonce) s.nonce = this.opts.nonce
      const q = (v: string) => v.replace(/["\\\n]/g, '')
      s.textContent = `@font-face{font-family:"${q(f.family)}";src:url("${q(f.src)}");font-weight:${q(String(f.weight ?? 'normal'))};font-style:${f.style ?? 'normal'};font-display:swap}`
      document.head.appendChild(s)
    }
  }

  private mount(target: Element | null) {
    const root = this.root!
    const host = modalHost(target) ?? this.opts.container ?? document.body
    const moved = root.parentElement !== host
    if (moved) host.appendChild(root)
    // Re-showing puts the tour on top of anything opened after it (new dialogs, popovers).
    if ('showPopover' in root) {
      try {
        if (root.matches(':popover-open')) root.hidePopover()
        root.showPopover()
      } catch {
        /* not connected yet / unsupported */
      }
    }
  }

  private renderPopover(step: Step, i: number) {
    const total = this.opts.steps.length
    const id = `gm-${Math.random().toString(36).slice(2, 8)}`
    const pop = this.pop
    pop.replaceChildren()
    this.arrow = null
    if (this.opts.arrow !== false) {
      const a = document.createElement('div')
      a.className = 'gm-arrow'
      a.setAttribute('part', 'arrow')
      pop.appendChild(a)
      this.arrow = a
    }
    pop.removeAttribute('aria-labelledby')
    pop.removeAttribute('aria-describedby')
    pop.setAttribute('aria-label', step.title ? step.title : 'Tour')

    if (step.title) {
      const h = document.createElement('p')
      h.className = 'gm-title'
      h.setAttribute('part', 'title')
      h.id = `${id}-t`
      h.textContent = step.title
      pop.appendChild(h)
      pop.setAttribute('aria-labelledby', h.id)
      pop.removeAttribute('aria-label')
    }
    if (step.description) {
      const d = document.createElement('p')
      d.className = 'gm-desc'
      d.setAttribute('part', 'description')
      d.id = `${id}-d`
      d.textContent = step.description
      pop.appendChild(d)
      pop.setAttribute('aria-describedby', d.id)
    }

    if (step.hint) {
      const h = document.createElement('p')
      h.className = 'gm-hint'
      h.setAttribute('part', 'hint')
      h.id = `${id}-h`
      h.textContent = step.hint
      pop.appendChild(h)
      pop.setAttribute('aria-describedby', [pop.getAttribute('aria-describedby'), h.id].filter(Boolean).join(' '))
    }

    const x = this.button('×', 'gm-btn gm-x', 'close', () => this.stop())
    x.setAttribute('aria-label', this.labels.close)
    pop.appendChild(x)

    const foot = document.createElement('div')
    foot.className = 'gm-foot'
    foot.setAttribute('part', 'footer')
    if (this.opts.showProgress && total > 1) {
      const p = document.createElement('span')
      p.className = 'gm-progress'
      p.setAttribute('part', 'progress')
      p.textContent = this.labels.progress.replace('{current}', String(i + 1)).replace('{total}', String(total))
      foot.appendChild(p)
    }
    if (i > 0) foot.appendChild(this.button(this.labels.previous, 'gm-btn', 'button button-secondary', () => void this.previous()))
    const last = i === total - 1
    if (!(step.hideNext && step.advanceOn)) foot.appendChild(this.button(last ? this.labels.done : this.labels.next, 'gm-btn gm-primary', 'button button-primary', () => void this.next()))
    pop.appendChild(foot)
    if (this.opts.persist?.dontShowAgain) {
      pop.appendChild(
        this.button(this.labels.never, 'gm-never', 'never', () => {
          this.write('dismissed', this._index, true)
          this.stop()
        }),
      )
    }

    this.live.textContent = [this.labels.progress.replace('{current}', String(i + 1)).replace('{total}', String(total)), step.title]
      .filter(Boolean)
      .join(': ')
  }

  private button(text: string, cls: string, part: string, onClick: () => void) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = cls
    b.setAttribute('part', part)
    b.textContent = text
    b.addEventListener('click', onClick)
    return b
  }

  // ---------------------------------------------------------------- layout

  /** Frame loop: follows animated / moving targets and notices when the target disappears. */
  private tick = () => {
    if (!this._active) return
    this.raf = requestAnimationFrame(this.tick)
    if (this.busy || !this.shown) return
    try {
      this.untilFn?.()
    } catch (e) {
      console.error('[guiame] advanceOn.until()', e)
    }
    const el = this.target
    if (el && !isVisible(el)) {
      // The target went away (modal closed, route changed…): wait for it again.
      const my = ++this.nav
      void this.show(this._index, false, my)
      return
    }
    this.reposition(false)
  }

  private reposition(force: boolean) {
    const step = this.shown
    const root = this.root
    if (!step || !root) return
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const sheet = this.isSheet(vw)
    const vv = window.visualViewport
    const kb = sheet && vv ? Math.max(0, Math.round(vh - vv.height - vv.offsetTop)) : 0 // on-screen keyboard
    const el = this.target
    const r = el?.getBoundingClientRect()
    const key = `${sheet}|${kb}|${vw}|${vh}|${r ? `${r.left}|${r.top}|${r.width}|${r.height}` : 'c'}|${this.pop.offsetWidth}|${this.pop.offsetHeight}`
    if (!force && key === this.lastKey) return
    this.lastKey = key

    // If an ancestor has a transform the "fixed" root is not at 0,0: correct for it.
    const o = root.getBoundingClientRect()
    const ox = o.left
    const oy = o.top

    let hole: { x: number; y: number; w: number; h: number } | null = null
    if (r) {
      const pad = step.padding ?? this.opts.padding
      hole = { x: r.left - pad - ox, y: r.top - pad - oy, w: r.width + pad * 2, h: r.height + pad * 2 }
    }

    if (hole) {
      this.ring.style.display = 'block'
      const rs = this.ring.style
      rs.left = `${hole.x}px`
      rs.top = `${hole.y}px`
      rs.width = `${hole.w}px`
      rs.height = `${hole.h}px`
      rs.pointerEvents = step.allowTargetClick || step.advanceOn ? 'none' : 'auto'
      const { x, y, w, h } = hole
      // The hole follows the ring's border radius so rounded themes don't show square corners.
      const r = Math.max(0, Math.min(parseFloat(getComputedStyle(this.ring).borderTopLeftRadius) || 0, w / 2, h / 2))
      const d = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
      this.backdrop.style.clipPath = `path(evenodd,"M0 0H${vw}V${vh}H0Z ${d}")`
    } else {
      this.ring.style.display = 'none'
      this.backdrop.style.clipPath = ''
    }

    const ps = this.pop.style
    const wasSheet = this.pop.dataset.mode === 'sheet'
    this.pop.dataset.mode = sheet ? 'sheet' : 'float'
    if (sheet) {
      ps.left = ps.right = '12px'
      ps.top = 'auto'
      ps.width = 'auto'
      ps.maxWidth = 'none'
      ps.bottom = `calc(max(12px, env(safe-area-inset-bottom, 0px)) + ${kb}px)`
      this.pop.dataset.side = 'center'
      return
    }
    if (wasSheet) ps.right = ps.bottom = ps.width = ps.maxWidth = ''
    const pw = this.pop.offsetWidth
    const ph = this.pop.offsetHeight
    let px = (vw - pw) / 2 - ox
    let py = (vh - ph) / 2 - oy
    if (hole) {
      const side = this.pickSide(step.side ?? 'auto', hole, pw, ph, vw, vh, ox, oy)
      if (side === 'bottom') [px, py] = [hole.x + hole.w / 2 - pw / 2, hole.y + hole.h + GAP]
      else if (side === 'top') [px, py] = [hole.x + hole.w / 2 - pw / 2, hole.y - ph - GAP]
      else if (side === 'right') [px, py] = [hole.x + hole.w + GAP, hole.y + hole.h / 2 - ph / 2]
      else [px, py] = [hole.x - pw - GAP, hole.y + hole.h / 2 - ph / 2]
      px = Math.min(Math.max(px, EDGE - ox), vw - pw - EDGE - ox)
      py = Math.min(Math.max(py, EDGE - oy), vh - ph - EDGE - oy)
      this.placeArrow(side, hole, px, py, pw, ph)
    } else this.pop.dataset.side = 'center'
    this.pop.style.left = `${px}px`
    this.pop.style.top = `${py}px`
  }

  private placeArrow(side: Exclude<Side, 'auto'>, h: { x: number; y: number; w: number; h: number }, px: number, py: number, pw: number, ph: number) {
    const a = this.arrow
    this.pop.dataset.side = a ? side : 'center'
    if (!a) return
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 14), Math.max(14, max - 26))
    const st = a.style
    st.top = st.bottom = st.left = st.right = ''
    if (side === 'bottom') [st.top, st.left] = ['-6px', `${clamp(h.x + h.w / 2 - px - 6, pw)}px`]
    else if (side === 'top') [st.bottom, st.left] = ['-6px', `${clamp(h.x + h.w / 2 - px - 6, pw)}px`]
    else if (side === 'right') [st.left, st.top] = ['-6px', `${clamp(h.y + h.h / 2 - py - 6, ph)}px`]
    else [st.right, st.top] = ['-6px', `${clamp(h.y + h.h / 2 - py - 6, ph)}px`]
  }

  private pickSide(side: Side, h: { x: number; y: number; w: number; h: number }, pw: number, ph: number, vw: number, vh: number, ox: number, oy: number): Exclude<Side, 'auto'> {
    const space = {
      bottom: vh - (h.y + h.h + oy) - GAP - EDGE,
      top: h.y + oy - GAP - EDGE,
      right: vw - (h.x + h.w + ox) - GAP - EDGE,
      left: h.x + ox - GAP - EDGE,
    }
    const need = { bottom: ph, top: ph, right: pw, left: pw }
    if (side !== 'auto' && space[side] >= need[side]) return side
    const order: Exclude<Side, 'auto'>[] = ['bottom', 'top', 'right', 'left']
    const fit = order.find((s) => space[s] >= need[s])
    if (fit) return fit
    return order.reduce((a, b) => (space[b] - need[b] > space[a] - need[a] ? b : a))
  }

  // ---------------------------------------------------------------- keyboard

  private onKey = (e: KeyboardEvent) => {
    if (!this._active || !this.pop) return
    // Events from inside the shadow root are retargeted to the host: use the real origin.
    const t = (e.composedPath()[0] ?? e.target) as HTMLElement | null
    const inPop = !!t && this.pop.contains(t)

    if (e.key === 'Escape' && this.opts.closeOnEsc) {
      e.preventDefault()
      e.stopPropagation() // do not also close the modal underneath
      this.stop()
      return
    }

    if (e.key === 'Tab' && (inPop || !t || t === document.body)) {
      const items = Array.from(this.pop.querySelectorAll<HTMLButtonElement>('button')).filter((b) => !b.disabled)
      if (!items.length) return
      const first = items[0] as HTMLElement
      const lastEl = items[items.length - 1] as HTMLElement
      const activeEl = this.shadow.activeElement
      if (e.shiftKey && (activeEl === first || activeEl === this.pop || !inPop)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (activeEl === lastEl || !inPop)) {
        e.preventDefault()
        first.focus()
      }
      return
    }

    if (!this.opts.keyboard) return
    const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    if (typing) return
    const fwd = this.rtl ? 'ArrowLeft' : 'ArrowRight'
    const back = this.rtl ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === fwd || (e.key === 'Enter' && !(t instanceof HTMLButtonElement))) {
      e.preventDefault()
      if (this.shown?.hideNext && this.shown.advanceOn) return
      void this.next()
    } else if (e.key === back) {
      e.preventDefault()
      void this.previous()
    }
  }

  // ---------------------------------------------------------------- cleanup

  private teardown() {
    this._active = false
    this.nav++
    this.busy = false
    cancelAnimationFrame(this.raf)
    document.removeEventListener('keydown', this.onKey, true)
    this.clearAdvance()
    this.spacer?.remove()
    this.spacer = null
    this.session?.stop()
    this.session = null
    if (this.root) {
      try {
        if ('hidePopover' in this.root && this.root.matches(':popover-open')) this.root.hidePopover()
      } catch {
        /* ignore */
      }
      this.root.remove()
      this.root = null
    }
    this.target = null
    this.shown = null
    this._index = -1
    const prev = this.previousFocus
    this.previousFocus = null
    if (prev instanceof HTMLElement && prev.isConnected) prev.focus({ preventScroll: true })
  }
}

/** Shorthand: guide(steps).start() */
export function guide(steps: Step[], options: Omit<TourOptions, 'steps'> = {}) {
  return new Tour({ ...options, steps })
}
