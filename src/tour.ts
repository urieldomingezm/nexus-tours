// Tour: ciclo de vida, navegación entre pasos, espera de objetivos y seguimiento en cada frame.
// El DOM, la posición, el teclado y el progreso guardado viven en ./core/*.
import type { AdvanceOn, Labels, Router, Step, StepContext, TourApi, TourEvent, TourOptions, TourStatus } from './types'
import { PracticeSession } from './practice'
import { isVisible, waitForElement } from './wait'
import { confetti } from './confetti'
import { resolveRouter, sameRoute } from './router'
import { clickAll, lower, modalHost, raise, reduceMotion, resolveRef } from './core/dom'
import { arrowStyle, backdropPath, holeFor, isSheet, placePopover } from './core/layout'
import type { Rect } from './core/layout'
import { createKeyHandler } from './core/keyboard'
import { Progress } from './core/progress'
import { createShell, DEFAULT_LABELS, renderPopover } from './core/render'
import type { Shell } from './core/render'

type Defaults = 'waitTimeout' | 'onMissing' | 'closeOnBackdrop' | 'closeOnEsc' | 'keyboard' | 'showProgress' | 'padding'

export class Tour implements TourApi {
  private opts: Required<Pick<TourOptions, Defaults>> & TourOptions
  private labels: Labels
  private listeners = new Map<TourEvent, Set<(ctx: StepContext) => void>>()

  private _index = -1
  private _active = false
  /** Navigation counter: every move bumps it so stale async work can tell it was superseded. */
  private nav = 0
  private busy = false
  private dir: 1 | -1 = 1
  private shown: Step | null = null
  private target: Element | null = null
  private lastKey = ''

  private ui: Shell | null = null
  private arrow: HTMLElement | null = null
  private raf = 0
  private session: PracticeSession | null = null
  private previousFocus: Element | null = null
  private router: Router | null
  private progress: Progress
  private disarm: (() => void) | null = null
  private untilFn: (() => void) | null = null
  private spacer: HTMLElement | null = null
  private onKey: (e: KeyboardEvent) => void

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
    this.progress = new Progress(options.persist)
    const self = this
    this.onKey = createKeyHandler({
      get active() {
        return self._active
      },
      get pop() {
        return self.ui?.pop ?? null
      },
      get shadow() {
        return self.ui?.shadow ?? null
      },
      get rtl() {
        return !!self.ui?.rtl
      },
      get closeOnEsc() {
        return self.opts.closeOnEsc
      },
      get keyboard() {
        return self.opts.keyboard
      },
      get locked() {
        return self.locked()
      },
      next: () => void self.next(),
      previous: () => void self.previous(),
      stop: () => self.stop(),
    })
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
        console.error('[nexus-tours]', e)
      }
    })
  }

  private ctx(): StepContext {
    return { index: this._index, step: this.opts.steps[this._index] as Step, element: this.target, tour: this }
  }

  /** The current step only moves on with the user's action. */
  private locked() {
    return !!(this.shown?.hideNext && this.shown.advanceOn)
  }

  // ---------------------------------------------------------------- saved progress

  async status(): Promise<TourStatus> {
    return (await this.progress.load())?.status ?? 'new'
  }

  async startIfNeeded() {
    if (this._active || !this.opts.steps.length) return false
    const s = await this.progress.load()
    if (s && s.status !== 'in-progress') return false
    await this.start(Math.min(Math.max(0, s?.index ?? 0), this.opts.steps.length - 1))
    return true
  }

  async reset() {
    await this.progress.reset()
  }

  // ---------------------------------------------------------------- lifecycle

  async start(index = 0) {
    if (this._active || !this.opts.steps.length) return
    this._active = true
    this.previousFocus = document.activeElement
    if (this.progress.enabled) {
      this.progress.saved = await this.progress.load()
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
    this.progress.write('completed', this.opts.steps.length - 1, true)
    this.emit('end')
    this.teardown()
    if (this.opts.celebrate) confetti(this.opts.theme?.accent)
  }

  private async leave() {
    this.clearAdvance()
    const step = this.shown
    if (!step) return
    const ctx = this.ctx()
    this.shown = null
    try {
      clickAll(step.afterClick)
      await step.after?.(ctx)
    } catch (e) {
      console.error('[nexus-tours] after()', e)
    }
  }

  private async show(i: number, runBefore: boolean, my: number): Promise<void> {
    const ui = this.ui!
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
    ui.ring.style.display = 'none'
    this.clearAdvance()
    this.spacer?.remove()
    this.spacer = null
    try {
      const router = this.router
      if (step.route && router && !sameRoute(router.current(), step.route)) {
        if (router.reloads) {
          // The page is about to unload: save the step so the next page resumes here (startIfNeeded).
          this.progress.write('in-progress', i, true)
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
          const now = step.element !== undefined ? resolveRef(step.element) : null
          if (!now || !isVisible(now)) clickAll(step.beforeClick)
          await step.before?.({ index: i, step, element: null, tour: this })
        } catch (e) {
          console.error('[nexus-tours] before()', e)
        }
        if (aborted.aborted) return
      }

      let el: Element | null = null
      if (step.element !== undefined) {
        el = await waitForElement(() => resolveRef(step.element), step.waitTimeout ?? this.opts.waitTimeout, aborted)
        if (aborted.aborted) return
        if (!el) return this.missing(i, step, my)
      }

      this.target = el
      this.shown = step
      this.mount(el)
      this.arrow = renderPopover(ui.pop, ui.live, step, i, this.opts, this.labels, {
        next: () => void this.next(),
        previous: () => void this.previous(),
        stop: () => this.stop(),
        dismiss: () => {
          this.progress.write('dismissed', this._index, true)
          this.stop()
        },
      })
      this.reposition(true)
      if (el) {
        this.reveal(el) // after the first layout: on phones it needs the sheet's height
        this.reposition(true)
      }
      ui.pop.focus({ preventScroll: true })
      this.emit('step')
      this.progress.write('in-progress', i)
      this.armAdvance(step)
    } finally {
      if (this.nav === my) this.busy = false
    }
  }

  /** The target never showed up: stop, or skip in the current direction. */
  private async missing(i: number, step: Step, my: number): Promise<void> {
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

  /** Scrolls only when needed: centered if it is off-screen, minimal if it is clipped by a scroll container. */
  private reveal(el: Element) {
    const pop = this.ui!.pop
    if (pop.dataset.mode === 'sheet') {
      // Phone: bring it into view, then a bit more so it ends up above the bottom sheet.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
      const rect = el.getBoundingClientRect()
      const over = Math.min(rect.bottom - (window.innerHeight - pop.offsetHeight - 24), rect.top - 8)
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
    el.scrollIntoView({ block: inView ? 'nearest' : 'center', inline: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' })
  }

  // ---------------------------------------------------------------- interactive steps

  private clearAdvance() {
    this.disarm?.()
    this.disarm = null
    this.untilFn = null
  }

  /** `advanceOn`: move on by itself when the user does the action. */
  private armAdvance(step: Step) {
    this.clearAdvance()
    const raw = step.advanceOn
    if (!raw) return
    const a: AdvanceOn = typeof raw === 'string' ? { event: raw } : raw
    const idx = this._index
    const go = () => {
      this.clearAdvance()
      // The user already did it: still move on if the step was only re-shown meanwhile (e.g. the action closed
      // the modal that held the target). Pressing Next / Back or stopping the tour in the meantime wins.
      setTimeout(() => {
        if (this._active && this._index === idx) void this.next()
      }, a.delay ?? 0)
    }
    if (a.event) {
      const ev = a.event
      const h = (e: Event) => {
        const path = e.composedPath()
        if (this.ui && path.includes(this.ui.host)) return // the tour's own buttons
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

  // ---------------------------------------------------------------- DOM

  private build() {
    const ui = createShell(this.opts, this.labels)
    ui.backdrop.addEventListener('click', () => this.opts.closeOnBackdrop && this.stop())
    // Phone: swipe the sheet sideways to move between steps.
    let sx = 0
    let sy = 0
    ui.pop.addEventListener('touchstart', (e) => ((sx = e.touches[0]!.clientX), (sy = e.touches[0]!.clientY)), { passive: true })
    ui.pop.addEventListener('touchend', (e) => {
      if (ui.pop.dataset.mode !== 'sheet') return
      const t = e.changedTouches[0]!
      const dx = t.clientX - sx
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(t.clientY - sy) * 1.5) return
      if (ui.rtl ? dx > 0 : dx < 0) {
        if (!this.locked()) void this.next()
      } else void this.previous()
    })
    this.ui = ui
  }

  private mount(target: Element | null) {
    const root = this.ui!.host
    const host = modalHost(target) ?? this.opts.container ?? document.body
    if (root.parentElement !== host) host.appendChild(root)
    // Re-showing puts the tour on top of anything opened after it (new dialogs, popovers).
    raise(root)
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
      console.error('[nexus-tours] advanceOn.until()', e)
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
    const ui = this.ui
    if (!step || !ui) return
    const { host, pop, ring, backdrop } = ui
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const sheet = isSheet(this.opts.mobile, vw, this.opts.mobileBreakpoint)
    const vv = window.visualViewport
    const kb = sheet && vv ? Math.max(0, Math.round(vh - vv.height - vv.offsetTop)) : 0 // on-screen keyboard
    const r = this.target?.getBoundingClientRect()
    const key = `${sheet}|${kb}|${vw}|${vh}|${r ? `${r.left}|${r.top}|${r.width}|${r.height}` : 'c'}|${pop.offsetWidth}|${pop.offsetHeight}`
    if (!force && key === this.lastKey) return
    this.lastKey = key

    // If an ancestor has a transform the "fixed" root is not at 0,0: correct for it.
    const o = host.getBoundingClientRect()
    const v = { vw, vh, ox: o.left, oy: o.top }
    const hole: Rect | null = r ? holeFor(r, step.padding ?? this.opts.padding, v.ox, v.oy) : null

    pop.toggleAttribute('data-welcome', !hole)
    ring.toggleAttribute('data-pulse', !!step.advanceOn && !!hole)
    if (hole) {
      const rs = ring.style
      rs.display = 'block'
      rs.left = `${hole.x}px`
      rs.top = `${hole.y}px`
      rs.width = `${hole.w}px`
      rs.height = `${hole.h}px`
      rs.pointerEvents = step.allowTargetClick || step.advanceOn ? 'none' : 'auto'
      // The hole follows the ring's border radius so rounded themes don't show square corners.
      backdrop.style.clipPath = backdropPath(hole, parseFloat(getComputedStyle(ring).borderTopLeftRadius), vw, vh)
    } else {
      ring.style.display = 'none'
      backdrop.style.clipPath = ''
    }

    const ps = pop.style
    const wasSheet = pop.dataset.mode === 'sheet'
    pop.dataset.mode = sheet ? 'sheet' : 'float'
    if (sheet) {
      ps.left = ps.right = '12px'
      ps.top = 'auto'
      ps.width = 'auto'
      ps.maxWidth = 'none'
      ps.bottom = `calc(max(12px, env(safe-area-inset-bottom, 0px)) + ${kb}px)`
      pop.dataset.side = 'center'
      return
    }
    if (wasSheet) ps.right = ps.bottom = ps.width = ps.maxWidth = ''
    const pw = pop.offsetWidth
    const ph = pop.offsetHeight
    const at = placePopover(hole, step.side ?? 'auto', pw, ph, v)
    if (hole && at.side !== 'center') {
      pop.dataset.side = this.arrow ? at.side : 'center'
      if (this.arrow) Object.assign(this.arrow.style, arrowStyle(at.side, hole, at.x, at.y, pw, ph))
    } else pop.dataset.side = 'center'
    ps.left = `${at.x}px`
    ps.top = `${at.y}px`
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
    if (this.ui) {
      lower(this.ui.host)
      this.ui.host.remove()
      this.ui = null
    }
    this.arrow = null
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
