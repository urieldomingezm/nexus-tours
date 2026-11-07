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

export interface Labels {
  next: string
  previous: string
  done: string
  close: string
  /** Supports {current} and {total}. */
  progress: string
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
  /** CSP nonce for the injected <style>. */
  nonce?: string
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
  on(event: TourEvent, fn: (ctx: StepContext) => void): () => void
}
