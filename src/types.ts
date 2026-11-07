export type Side = 'top' | 'bottom' | 'left' | 'right' | 'auto'
export type TargetRef = string | Element | (() => Element | null | undefined)

export interface StepContext {
  /** Index of the current step. */
  index: number
  /** The step being shown. */
  step: Step
  /** The resolved target element, when the step has one. */
  element: Element | null
  tour: TourApi
}

export interface Step {
  /** CSS selector, element or function returning the element. Omit for a centered step. */
  element?: TargetRef
  title?: string
  description?: string
  side?: Side
  /** Runs before the target is searched. Open the modal, switch tabs, etc. May be async. */
  before?: (ctx: StepContext) => void | Promise<void>
  /** Runs when leaving the step (next, previous, stop). */
  after?: (ctx: StepContext) => void | Promise<void>
  /** Max ms to wait for the target to exist and be visible. Defaults to the tour's `waitTimeout`. */
  waitTimeout?: number
  /** What to do when the target never shows up. Defaults to the tour's `onMissing`. */
  onMissing?: 'skip' | 'stop'
  /** Let the user click the highlighted element (e.g. "click here to continue"). */
  allowTargetClick?: boolean
  /** Extra space around the highlighted element, in px. */
  padding?: number
}

import type { PracticeOptions } from './practice'

export interface Labels {
  next: string
  previous: string
  done: string
  close: string
  /** Supports {current} and {total}. */
  progress: string
  /** Text of the practice-mode pill. */
  practice: string
}

export interface Theme {
  accent?: string
  /** Text color on top of the accent (primary button). */
  accentContrast?: string
  background?: string
  text?: string
  muted?: string
  border?: string
  /** Backdrop color, e.g. "rgba(0,0,0,.6)". */
  overlay?: string
  radius?: string
  /** CSS font-family, or "inherit" to use the page's body font. */
  font?: string
  zIndex?: number
}

export interface FontFace {
  family: string
  /** URL of the font file (woff2 recommended). */
  src: string
  weight?: string | number
  style?: 'normal' | 'italic'
}

export interface TourOptions {
  steps: Step[]
  labels?: Partial<Labels>
  /** Default max wait for each target, in ms. Default 5000. */
  waitTimeout?: number
  /** Default for steps whose target is missing. Default 'skip'. */
  onMissing?: 'skip' | 'stop'
  /** Close the tour when clicking the dimmed backdrop. Default false. */
  closeOnBackdrop?: boolean
  /** Close the tour with Esc. Default true. */
  closeOnEsc?: boolean
  /** Arrow keys / Enter navigate. Default true. */
  keyboard?: boolean
  /** Show "2 / 5". Default true. */
  showProgress?: boolean
  padding?: number
  /** Where to mount when the target is not inside a modal <dialog>. Default document.body. */
  container?: HTMLElement
  /** CSP nonce for fallback <style> tags (only used in browsers without constructable stylesheets). */
  nonce?: string
  /** Colors, radius and font. Also available as CSS variables: --gm-accent, --gm-bg, --gm-fg… */
  theme?: Theme
  /** Shortcut for `theme.font`. */
  font?: string
  /** Web fonts to load for the tour (injects @font-face once into the page). */
  fonts?: FontFace[]
  /** Extra CSS applied *inside* the tour (it is isolated in a shadow root). Target the `.gm-*` parts. */
  css?: string
  /** Practice mode: answer `fetch` with example data while the tour runs (and block real writes). */
  practice?: PracticeOptions
  /** Class added to the host element, handy to scope `::part()` rules from your own stylesheet. */
  className?: string
}

export type TourEvent = 'start' | 'step' | 'missing' | 'end' | 'stop'

export interface TourApi {
  start(index?: number): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  goTo(index: number): Promise<void>
  stop(): void
  destroy(): void
  readonly index: number
  readonly active: boolean
  /** The practice-mode data while the tour runs (undefined otherwise). */
  readonly practiceData: Record<string, Record<string, unknown>[]> | undefined
  on(event: TourEvent, fn: (ctx: StepContext) => void): () => void
}
