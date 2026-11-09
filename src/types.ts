export type Side = 'top' | 'bottom' | 'left' | 'right' | 'auto'
export type TargetRef = string | Element | (() => Element | null | undefined)

export interface StepContext {
  /** Index of the current step. */
  index: number
  /** Number of steps in the tour. */
  total: number
  /** The step being shown. */
  step: Step
  /** The resolved target element, when the step has one. */
  element: Element | null
  tour: TourApi
  /** Only on `stop`: why the tour was closed before the end. */
  reason?: StopReason
}

/**
 * Why a tour closed before its last step:
 * `skip` (Skip button), `close` (× button), `esc`, `backdrop`, `dismiss` ("Don't show again"),
 * `missing` (a target never appeared and the step has `onMissing: 'stop'`), `api` (your code called `stop()`).
 */
export type StopReason = 'skip' | 'close' | 'esc' | 'backdrop' | 'dismiss' | 'missing' | 'api'

export interface Step {
  /** Stable name for analytics and `goTo('id')`. Survives reordering steps. */
  id?: string
  /** CSS selector, element or function returning the element. Omit for a centered step. */
  element?: TargetRef
  title?: string
  /** Plain text (never parsed as HTML). */
  description?: string
  /**
   * Rich content under the description: return a DOM node you built (a list, a link, a video…) or a string (shown as text).
   * The node is rendered inside the tour's shadow root, so style it inline or with the `css` option.
   */
  content?: (ctx: StepContext) => Node | string | null | undefined
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
  /**
   * Go to the next step by itself when the user does the thing: `'click'`, `'input'`, `'change'`, `'submit'`…
   * (on the highlighted element), or an object for full control. The element becomes clickable.
   */
  advanceOn?: AdvanceEvent | AdvanceOn
  /** Small call to action under the description, e.g. "Click the button to continue". */
  hint?: string
  /** With `advanceOn`: hide "Next" so the user has to do the action. Esc / × still close the tour. */
  hideNext?: boolean
  /** Selector(s) to click before the step if its element isn't visible yet (e.g. the button that opens the modal). Serializable alternative to `before`. */
  beforeClick?: string | string[]
  /** Selector(s) to click when leaving the step (e.g. a modal's close button). Serializable alternative to `after`. */
  afterClick?: string | string[]
  /** Big emoji / short text above the title (nice for welcome and goodbye steps). */
  icon?: string
  /** Image (https://, /path, data:image/…) above the title. */
  image?: string
  /** Route this step lives on (needs the tour's `router`): the tour navigates there first. E.g. "/clients". */
  route?: string
}

export type AdvanceEvent = 'click' | 'dblclick' | 'input' | 'change' | 'submit' | 'focus' | 'blur' | (string & {})

export interface AdvanceOn {
  /** DOM event to listen for. */
  event?: AdvanceEvent
  /** Where the event must happen. Default: the step's element. */
  target?: TargetRef
  /** Extra condition, e.g. `(e) => e.target.value.length >= 3`. */
  when?: (e: Event, ctx: StepContext) => boolean
  /** Polled every frame: advance as soon as it returns true (e.g. "the modal opened"). */
  until?: (ctx: StepContext) => boolean
  /** Wait this many ms before advancing, so the user sees the result of their action. */
  delay?: number
}

/** Lets a tour move between pages. See `routers` for ready-made ones. */
export interface Router {
  /** Current path (+ query), e.g. "/clients?tab=1". */
  current(): string
  /** Navigate to a path. */
  go(path: string): unknown | Promise<unknown>
  /** True when `go` reloads the page (multi-page sites): progress is saved and `startIfNeeded()` resumes it. Needs `persist`. */
  reloads?: boolean
}

export interface PersistStorage {
  get(key: string): string | null | undefined | Promise<string | null | undefined>
  set(key: string, value: string): void | Promise<void>
  remove?(key: string): void | Promise<void>
}

export interface PersistOptions {
  /** Identifies this tour in storage, e.g. "welcome". */
  id: string
  /** Default: localStorage (memory if blocked). `null` = memory only. */
  storage?: PersistStorage | null
  /** Change it when you rewrite the tour: everyone sees it again. */
  version?: string | number
  /** Show a "Don't show again" link. */
  dontShowAgain?: boolean
}

export type TourStatus = 'new' | 'in-progress' | 'completed' | 'dismissed'

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
  /** "Don't show again" link (needs `persist.dontShowAgain`). */
  never: string
  /** Quiet "Skip" button that closes the tour. */
  skip: string
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
  /** Popover text size, default "15px". */
  fontSize?: string
  /** Popover max width, default "340px". */
  width?: string
}

export interface FontFace {
  family: string
  /** URL of the font file (woff2 recommended). */
  src: string
  weight?: string | number
  style?: 'normal' | 'italic'
}

/** One entry per tour event, ready to send to your analytics. */
export interface TourAnalyticsEvent {
  type: TourEvent
  /** `id` option, or `persist.id`. */
  tourId?: string
  /** Step index (-1 before the first step). */
  index: number
  total: number
  /** The step's `id`, when it has one. */
  stepId?: string
  /** The step's title. */
  title?: string
  /** Only on `stop`. */
  reason?: StopReason
  /** ms since the tour started. */
  elapsed: number
  /** ms since the current step was shown. */
  stepElapsed: number
}

export interface TourOptions {
  steps: Step[]
  /** Name of the tour for analytics (`onEvent`). Default: `persist.id`. */
  id?: string
  /**
   * Called for every event (start, step, next, previous, missing, end, stop) with a plain object you can send to
   * your analytics as is. Errors thrown here are caught and logged.
   */
  onEvent?: (event: TourAnalyticsEvent) => void
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
  /**
   * Extra CSS selector for modal containers of your UI library, when they trap focus but have no `role="dialog"`.
   * The tour mounts inside them so it stays clickable. Already detected: <dialog>, ARIA dialogs, Bootstrap modal/offcanvas, Vuetify overlays.
   */
  modalSelector?: string
  /** Where to mount when the target is not inside a modal <dialog>. Default document.body. */
  container?: HTMLElement
  /** CSP nonce for fallback <style> tags (only used in browsers without constructable stylesheets). */
  nonce?: string
  /** Colors, radius and font. Also available as CSS variables: --gm-accent, --gm-bg, --gm-fg… */
  theme?: Theme
  /** Shortcut for `theme.font`. */
  font?: string
  /** Web fonts to load for the tour (injects an `@font-face` rule once into the page). */
  fonts?: FontFace[]
  /** Extra CSS applied *inside* the tour (it is isolated in a shadow root). Target the `.gm-*` parts. */
  css?: string
  /** Practice mode: answer `fetch` with example data while the tour runs (and block real writes). */
  practice?: PracticeOptions
  /** Little arrow pointing at the target. Default true. */
  arrow?: boolean
  /** Text direction. 'auto' follows the page. Default 'auto'. */
  dir?: 'ltr' | 'rtl' | 'auto'
  /** Progress indicator: 'dots' (default; a thin bar when there are more than 10 steps), 'text' ("2 / 5") or 'both'. */
  progress?: 'dots' | 'text' | 'both'
  /** Show the quiet "Skip" button. Default true. */
  skip?: boolean
  /** Show the × corner button. Default: only when there is no Skip button. */
  closeButton?: boolean
  /** Light confetti when the user reaches the end. Default false. */
  celebrate?: boolean
  /** Phone layout: a bottom sheet with big buttons, swipe to move, safe-area aware. 'auto' = narrow screens. Default 'auto'. */
  mobile?: 'auto' | 'always' | 'never'
  /** Width (px) up to which 'auto' uses the bottom sheet. Default 600. */
  mobileBreakpoint?: number
  /** Lets steps with `route` move between pages: `'history'` (SPA), `'location'` (multi-page), or your own router. */
  router?: Router | 'history' | 'location'
  /** Remember progress: resume where the user left off, finished tours, "don't show again". */
  persist?: PersistOptions
  /** Class added to the host element, handy to scope `::part()` rules from your own stylesheet. */
  className?: string
}

/**
 * `start` · `step` (a step is shown) · `next` / `previous` (the user or your code moved; fired before moving) ·
 * `missing` (a target never appeared) · `end` (finished the last step) · `stop` (closed before the end; see `reason`).
 */
export type TourEvent = 'start' | 'step' | 'next' | 'previous' | 'missing' | 'end' | 'stop'

export interface TourApi {
  /** Starts at a step index or `id` (default: the first step). */
  start(step?: number | string): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  /** Go to a step by index or by its `id`. */
  goTo(step: number | string): Promise<void>
  stop(): void
  destroy(): void
  readonly index: number
  readonly active: boolean
  /** The practice-mode data while the tour runs (undefined otherwise). */
  readonly practiceData: Record<string, Record<string, unknown>[]> | undefined
  on(event: TourEvent, fn: (ctx: StepContext) => void): () => void
  /** Saved state (needs `persist`): 'new' | 'in-progress' | 'completed' | 'dismissed'. */
  status(): Promise<TourStatus>
  /** Starts (or resumes) unless the user already finished or dismissed it. Returns whether it started. */
  startIfNeeded(): Promise<boolean>
  /** Forgets saved progress. */
  reset(): Promise<void>
}
