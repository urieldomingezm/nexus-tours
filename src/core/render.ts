// Construcción del DOM del tour: host con shadow root y contenido del popover de cada paso.
import { CSS } from '../styles'
import { themeVars } from '../theme'
import type { Labels, Step, StepContext, Theme, TourOptions } from '../types'
import { adoptStyles, part } from './dom'

export const DEFAULT_LABELS: Labels = {
  next: 'Next',
  previous: 'Back',
  done: 'Done',
  close: 'Close tour',
  progress: '{current} / {total}',
  practice: 'Practice mode · nothing is saved',
  never: "Don't show again",
  skip: 'Skip',
}

export interface Shell {
  host: HTMLElement
  shadow: ShadowRoot
  backdrop: HTMLElement
  ring: HTMLElement
  pop: HTMLElement
  live: HTMLElement
  rtl: boolean
}

/** Host + shadow root (the page's CSS can't break the tour and the tour's CSS can't leak into the page). */
export function createShell(opts: TourOptions, labels: Labels): Shell {
  injectFonts(opts)
  const host = document.createElement('div')
  host.setAttribute('data-nexus-tours', '')
  if (opts.className) host.className = opts.className
  if ('showPopover' in host) host.setAttribute('popover', 'manual')
  applyTheme(host, opts)
  const dirOpt = opts.dir ?? 'auto'
  const rtl = dirOpt === 'rtl' || (dirOpt === 'auto' && getComputedStyle(document.body).direction === 'rtl')
  host.dir = rtl ? 'rtl' : 'ltr'

  const shadow = host.attachShadow({ mode: 'open' })
  adoptStyles(shadow, CSS + (opts.css ?? ''), opts.nonce)

  const backdrop = part('div', 'gm-backdrop', 'backdrop')
  const ring = part('div', 'gm-ring', 'ring')
  const pop = part('div', 'gm-pop', 'popover')
  pop.tabIndex = -1
  pop.setAttribute('role', 'dialog')
  pop.setAttribute('aria-modal', 'false')
  const live = part('div', 'gm-sr')
  live.setAttribute('aria-live', 'polite')

  shadow.append(backdrop, ring, pop, live)
  if (opts.practice && opts.practice.banner !== false) shadow.appendChild(part('div', 'gm-banner', 'banner', labels.practice))
  return { host, shadow, backdrop, ring, pop, live, rtl }
}

function applyTheme(host: HTMLElement, opts: TourOptions) {
  const th: Theme = { ...opts.theme }
  if (opts.font) th.font = opts.font
  if (!th.font && opts.fonts?.length) th.font = `"${opts.fonts[0]!.family.replace(/"/g, '')}", system-ui, sans-serif`
  for (const [k, v] of Object.entries(themeVars(th))) host.style.setProperty(k, v)
}

/** @font-face rules must live in the page (not in a shadow root); they are added once. */
function injectFonts(opts: TourOptions) {
  for (const f of opts.fonts ?? []) {
    const key = `${f.family}|${f.src}|${f.weight ?? ''}|${f.style ?? ''}`
    if (
      Array.from(document.querySelectorAll('style[data-nexus-tours-font]')).some((n) => (n as HTMLElement).dataset.nexusToursFont === key)
    )
      continue
    const s = document.createElement('style')
    s.dataset.nexusToursFont = key
    if (opts.nonce) s.nonce = opts.nonce
    const q = (v: string) => v.replace(/["\\\n]/g, '')
    s.textContent = `@font-face{font-family:"${q(f.family)}";src:url("${q(f.src)}");font-weight:${q(String(f.weight ?? 'normal'))};font-style:${f.style ?? 'normal'};font-display:swap}`
    document.head.appendChild(s)
  }
}

export interface PopoverActions {
  next: () => void
  previous: () => void
  skip: () => void
  close: () => void
  dismiss: () => void
}

const progressText = (labels: Labels, i: number, total: number) =>
  labels.progress.replace('{current}', String(i + 1)).replace('{total}', String(total))

/** Fills the popover for step `i`. Returns the arrow element (or null when `arrow: false`). */
export function renderPopover(
  pop: HTMLElement,
  live: HTMLElement,
  step: Step,
  i: number,
  opts: TourOptions,
  labels: Labels,
  act: PopoverActions,
  ctx: StepContext,
): HTMLElement | null {
  const total = opts.steps.length
  const showProgress = opts.showProgress ?? true
  const id = `gm-${Math.random().toString(36).slice(2, 8)}`
  pop.replaceChildren()
  let arrow: HTMLElement | null = null
  if (opts.arrow !== false) {
    arrow = part('div', 'gm-arrow', 'arrow')
    pop.appendChild(arrow)
  }
  const prog = opts.progress ?? 'dots'
  if (showProgress && total > 1 && prog !== 'text') {
    if (total > 10) {
      const bar = part('div', 'gm-bar', 'dots')
      bar.setAttribute('aria-hidden', 'true')
      const fill = document.createElement('i')
      fill.style.width = `${((i + 1) / total) * 100}%`
      bar.appendChild(fill)
      pop.appendChild(bar)
    } else {
      const dots = part('div', 'gm-dots', 'dots')
      dots.setAttribute('aria-hidden', 'true')
      for (let n = 0; n < total; n++) {
        const d = part('span', 'gm-dot')
        d.dataset.state = n < i ? 'done' : n === i ? 'current' : 'todo'
        dots.appendChild(d)
      }
      pop.appendChild(dots)
    }
  }
  // Only http(s), data:image and relative URLs: never `javascript:`.
  if (step.image && /^(https?:|data:image\/|\/|\.{1,2}\/)/i.test(step.image)) {
    const img = part('img', 'gm-img', 'image')
    img.alt = ''
    img.src = step.image
    pop.appendChild(img)
  }
  if (step.icon) {
    const ic = part('div', 'gm-icon', 'icon', step.icon)
    ic.setAttribute('aria-hidden', 'true')
    pop.appendChild(ic)
  }
  pop.removeAttribute('aria-labelledby')
  pop.removeAttribute('aria-describedby')
  pop.setAttribute('aria-label', step.title ? step.title : 'Tour')

  if (step.title) {
    const h = part('p', 'gm-title', 'title', step.title)
    h.id = `${id}-t`
    pop.appendChild(h)
    pop.setAttribute('aria-labelledby', h.id)
    pop.removeAttribute('aria-label')
  }
  if (step.description) {
    const d = part('p', 'gm-desc', 'description', step.description)
    d.id = `${id}-d`
    pop.appendChild(d)
    pop.setAttribute('aria-describedby', d.id)
  }
  if (step.content) {
    let c: Node | string | null | undefined = null
    try {
      c = step.content(ctx)
    } catch (e) {
      console.error('[nexus-tours] content()', e)
    }
    if (c !== null && c !== undefined && c !== '') {
      const box = part('div', 'gm-content', 'content')
      box.id = `${id}-c`
      box.append(c) // a string is inserted as text, never as HTML
      pop.appendChild(box)
      pop.setAttribute('aria-describedby', [pop.getAttribute('aria-describedby'), box.id].filter(Boolean).join(' '))
    }
  }
  if (step.hint) {
    const h = part('p', 'gm-hint', 'hint', step.hint)
    h.id = `${id}-h`
    pop.appendChild(h)
    pop.setAttribute('aria-describedby', [pop.getAttribute('aria-describedby'), h.id].filter(Boolean).join(' '))
  }

  const last = i === total - 1
  const skip = opts.skip !== false && total > 1 && !last
  if (opts.closeButton ?? !skip) {
    const x = button('×', 'gm-btn gm-x', 'close', act.close)
    x.setAttribute('aria-label', labels.close)
    pop.appendChild(x)
  }

  const foot = part('div', 'gm-foot', 'footer')
  if (skip) foot.appendChild(button(labels.skip, 'gm-skip', 'skip', act.skip))
  if (showProgress && total > 1)
    foot.appendChild(part('span', prog === 'dots' ? 'gm-progress gm-sr' : 'gm-progress', 'progress', progressText(labels, i, total)))
  if (i > 0) foot.appendChild(button(labels.previous, 'gm-btn', 'button button-secondary', act.previous))
  if (!(step.hideNext && step.advanceOn))
    foot.appendChild(button(last ? labels.done : labels.next, 'gm-btn gm-primary', 'button button-primary', act.next))
  pop.appendChild(foot)
  if (opts.persist?.dontShowAgain) pop.appendChild(button(labels.never, 'gm-never', 'never', act.dismiss))

  live.textContent = [progressText(labels, i, total), step.title].filter(Boolean).join(': ')
  return arrow
}

function button(text: string, cls: string, partName: string, onClick: () => void) {
  const b = part('button', cls, partName, text)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}
