import { CSS } from './styles'
import type { Labels, Side, Step, StepContext, TargetRef, TourApi, TourEvent, TourOptions } from './types'
import { isVisible, waitForElement } from './wait'

const DEFAULT_LABELS: Labels = {
  next: 'Next',
  previous: 'Back',
  done: 'Done',
  close: 'Close tour',
  progress: '{current} / {total}',
}

const GAP = 12
const EDGE = 8
let styleCount = 0

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

  private styleEl: HTMLStyleElement | null = null
  private root: HTMLElement | null = null
  private backdrop!: HTMLElement
  private ring!: HTMLElement
  private pop!: HTMLElement
  private live!: HTMLElement
  private raf = 0
  private previousFocus: Element | null = null

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
  }

  get index() {
    return this._index
  }
  get active() {
    return this._active
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

  async start(index = 0) {
    if (this._active || !this.opts.steps.length) return
    this._active = true
    this.previousFocus = document.activeElement
    this.build()
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
    this.emit('end')
    this.teardown()
  }

  private async leave() {
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
    try {
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
      if (el) this.reveal(el)
      this.reposition(true)
      this.pop.focus({ preventScroll: true })
      this.emit('step')
    } finally {
      if (this.nav === my) this.busy = false
    }
  }

  /** Scrolls only when needed: centered if it is off-screen, minimal if it is clipped by a scroll container. */
  private reveal(el: Element) {
    const r = el.getBoundingClientRect()
    const inView = r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= document.documentElement.clientWidth
    el.scrollIntoView({ block: inView ? 'nearest' : 'center', inline: 'nearest', behavior: this.reduceMotion() ? 'auto' : 'smooth' })
  }

  private reduceMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  // ---------------------------------------------------------------- DOM

  private build() {
    if (!document.querySelector('style[data-guiame]')) {
      const s = document.createElement('style')
      s.dataset.guiame = ''
      if (this.opts.nonce) s.nonce = this.opts.nonce
      s.textContent = CSS
      document.head.appendChild(s)
      this.styleEl = s
    }
    styleCount++

    const root = document.createElement('div')
    root.className = 'gm-root'
    if ('showPopover' in root) root.setAttribute('popover', 'manual')

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'gm-backdrop'
    this.backdrop.addEventListener('click', () => this.opts.closeOnBackdrop && this.stop())

    this.ring = document.createElement('div')
    this.ring.className = 'gm-ring'

    this.pop = document.createElement('div')
    this.pop.className = 'gm-pop'
    this.pop.tabIndex = -1
    this.pop.setAttribute('role', 'dialog')
    this.pop.setAttribute('aria-modal', 'false')

    this.live = document.createElement('div')
    this.live.className = 'gm-sr'
    this.live.setAttribute('aria-live', 'polite')

    root.append(this.backdrop, this.ring, this.pop, this.live)
    this.root = root
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
    pop.removeAttribute('aria-labelledby')
    pop.removeAttribute('aria-describedby')
    pop.setAttribute('aria-label', step.title ? step.title : 'Tour')

    if (step.title) {
      const h = document.createElement('p')
      h.className = 'gm-title'
      h.id = `${id}-t`
      h.textContent = step.title
      pop.appendChild(h)
      pop.setAttribute('aria-labelledby', h.id)
      pop.removeAttribute('aria-label')
    }
    if (step.description) {
      const d = document.createElement('p')
      d.className = 'gm-desc'
      d.id = `${id}-d`
      d.textContent = step.description
      pop.appendChild(d)
      pop.setAttribute('aria-describedby', d.id)
    }

    const x = this.button('×', 'gm-btn gm-x', () => this.stop())
    x.setAttribute('aria-label', this.labels.close)
    pop.appendChild(x)

    const foot = document.createElement('div')
    foot.className = 'gm-foot'
    if (this.opts.showProgress && total > 1) {
      const p = document.createElement('span')
      p.className = 'gm-progress'
      p.textContent = this.labels.progress.replace('{current}', String(i + 1)).replace('{total}', String(total))
      foot.appendChild(p)
    }
    if (i > 0) foot.appendChild(this.button(this.labels.previous, 'gm-btn', () => void this.previous()))
    const last = i === total - 1
    foot.appendChild(this.button(last ? this.labels.done : this.labels.next, 'gm-btn gm-primary', () => void this.next()))
    pop.appendChild(foot)

    this.live.textContent = [this.labels.progress.replace('{current}', String(i + 1)).replace('{total}', String(total)), step.title]
      .filter(Boolean)
      .join(': ')
  }

  private button(text: string, cls: string, onClick: () => void) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = cls
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
    const el = this.target
    const r = el?.getBoundingClientRect()
    const key = `${vw}|${vh}|${r ? `${r.left}|${r.top}|${r.width}|${r.height}` : 'c'}|${this.pop.offsetWidth}|${this.pop.offsetHeight}`
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
      rs.pointerEvents = step.allowTargetClick ? 'none' : 'auto'
      const { x, y, w, h } = hole
      this.backdrop.style.clipPath = `path(evenodd,"M0 0H${vw}V${vh}H0Z M${x} ${y}H${x + w}V${y + h}H${x}Z")`
    } else {
      this.ring.style.display = 'none'
      this.backdrop.style.clipPath = ''
    }

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
    }
    this.pop.style.left = `${px}px`
    this.pop.style.top = `${py}px`
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
    const t = e.target as HTMLElement | null
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
      const activeEl = document.activeElement
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
    if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(t instanceof HTMLButtonElement))) {
      e.preventDefault()
      void this.next()
    } else if (e.key === 'ArrowLeft') {
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
    if (this.root) {
      try {
        if ('hidePopover' in this.root && this.root.matches(':popover-open')) this.root.hidePopover()
      } catch {
        /* ignore */
      }
      this.root.remove()
      this.root = null
    }
    styleCount = Math.max(0, styleCount - 1)
    if (styleCount === 0) document.querySelector('style[data-guiame]')?.remove()
    this.styleEl = null
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
