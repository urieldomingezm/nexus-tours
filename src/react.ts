import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Tour } from 'nexus-tours'
import { Checklist } from 'nexus-tours/checklist'
import type { ChecklistOptions } from 'nexus-tours/checklist'
import type { Step, StepContext, TourEvent, TourOptions } from 'nexus-tours'

export type UseTourOptions = Omit<TourOptions, 'steps'> & { steps: Step[] }
export type TourHandlers = Partial<Record<TourEvent, (ctx: StepContext) => void>>

/**
 * Hook: `const { start, active, index } = useTour({ steps })`.
 * Always starts with the latest options; destroyed on unmount. Safe under React StrictMode.
 */
export function useTour(options: UseTourOptions, handlers: TourHandlers = {}) {
  const ref = useRef<Tour | null>(null)
  const latest = useRef(options)
  const latestHandlers = useRef(handlers)
  latest.current = options
  latestHandlers.current = handlers
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(-1)

  const start = useCallback(async (at: number | string = 0) => {
    const prev = ref.current
    ref.current = null // so the old tour's "stop" is ignored below
    prev?.destroy()
    const t = new Tour(latest.current)
    ref.current = t
    const wrap = (e: TourEvent, fn?: () => void) =>
      t.on(e, (ctx) => {
        if (ref.current !== t) return
        fn?.()
        latestHandlers.current[e]?.(ctx)
      })
    wrap('start', () => setActive(true))
    wrap('step', () => setIndex(t.index))
    wrap('missing')
    wrap('next')
    wrap('previous')
    const off = () => {
      setActive(false)
      setIndex(-1)
    }
    wrap('end', off)
    wrap('stop', off)
    await t.start(at)
  }, [])

  useEffect(
    () => () => {
      const t = ref.current
      ref.current = null
      t?.destroy()
    },
    [],
  )

  return {
    start,
    stop: useCallback(() => ref.current?.stop(), []),
    next: useCallback(() => ref.current?.next(), []),
    previous: useCallback(() => ref.current?.previous(), []),
    goTo: useCallback((step: number | string) => ref.current?.goTo(step), []),
    active,
    index,
  }
}

export interface NexusTourProps extends Omit<TourOptions, 'steps'> {
  steps: Step[]
  /** Controlled: the tour runs while true. */
  open: boolean
  /** Called with false when the tour ends or is closed. */
  onOpenChange?: (open: boolean) => void
  /** Step index or `id` to start at. */
  startAt?: number | string
  onStart?: (ctx: StepContext) => void
  onStep?: (ctx: StepContext) => void
  onNext?: (ctx: StepContext) => void
  onPrevious?: (ctx: StepContext) => void
  /** The target of a step never showed up (see `onMissing` option for what happens next). */
  onTargetMissing?: (ctx: StepContext) => void
  onEnd?: (ctx: StepContext) => void
  /** Closed before the end; `ctx.reason` says how (skip, close, esc, backdrop, dismiss, missing, api). */
  onStop?: (ctx: StepContext) => void
  children?: ReactNode
}

/** `<NexusTour open={open} onOpenChange={setOpen} steps={steps} theme={…} />` — renders nothing. */
export function NexusTour(props: NexusTourProps) {
  const { open, onOpenChange, startAt = 0, onStart, onStep, onNext, onPrevious, onTargetMissing, onEnd, onStop, ...options } = props
  const api = useTour(options as UseTourOptions, {
    start: onStart,
    step: onStep,
    next: onNext,
    previous: onPrevious,
    missing: onTargetMissing,
    end: (c) => (onEnd?.(c), onOpenChange?.(false)),
    stop: (c) => (onStop?.(c), onOpenChange?.(false)),
  })
  const activeRef = useRef(false)
  activeRef.current = api.active
  useEffect(() => {
    if (open && !activeRef.current) void api.start(startAt)
    else if (!open && activeRef.current) api.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return createElement('span', { hidden: true, 'data-nexus-tour-anchor': '' })
}

/**
 * Onboarding checklist hook. Mounts the floating widget (`mount: false` to skip) and re-renders on progress:
 * `const { items, done, total, complete, start } = useChecklist({ id, items })`.
 * Options are read once; use a new `id` to reset for everyone.
 */
export function useChecklist(options: ChecklistOptions, { mount = true }: { mount?: boolean } = {}) {
  const ref = useRef<Checklist | null>(null)
  if (!ref.current) ref.current = new Checklist(options)
  const checklist = ref.current
  const [, force] = useState(0)
  useEffect(() => {
    const off = checklist.on('change', () => force((n) => n + 1))
    if (mount) checklist.mount()
    return () => {
      off()
      checklist.unmount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const progress = checklist.progress()
  return {
    checklist,
    items: checklist.items,
    ...progress,
    start: useCallback((id: string) => checklist.start(id), [checklist]),
    markDone: useCallback((id: string) => checklist.markDone(id), [checklist]),
    reset: useCallback(() => checklist.reset(), [checklist]),
    open: useCallback(() => checklist.open(), [checklist]),
    close: useCallback(() => checklist.close(), [checklist]),
    show: useCallback(() => checklist.show(), [checklist]),
    hide: useCallback(() => checklist.hide(), [checklist]),
  }
}
