import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Tour } from 'nexus-tours'
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

  const start = useCallback(async (at = 0) => {
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
    goTo: useCallback((i: number) => ref.current?.goTo(i), []),
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
  startAt?: number
  onStart?: (ctx: StepContext) => void
  onStep?: (ctx: StepContext) => void
  /** The target of a step never showed up (see `onMissing` option for what happens next). */
  onTargetMissing?: (ctx: StepContext) => void
  onEnd?: (ctx: StepContext) => void
  onStop?: (ctx: StepContext) => void
  children?: ReactNode
}

/** `<NexusTour open={open} onOpenChange={setOpen} steps={steps} theme={…} />` — renders nothing. */
export function NexusTour(props: NexusTourProps) {
  const { open, onOpenChange, startAt = 0, onStart, onStep, onTargetMissing, onEnd, onStop, ...options } = props
  const api = useTour(options as UseTourOptions, {
    start: onStart,
    step: onStep,
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
