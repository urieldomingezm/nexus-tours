import { computed, defineComponent, getCurrentInstance, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from 'vue'
import { Tour } from 'nexus-tours'
import { Checklist } from 'nexus-tours/checklist'
import type { ChecklistOptions } from 'nexus-tours/checklist'
import type { Step, StepContext, TourEvent, TourOptions } from 'nexus-tours'

export type UseTourOptions = Omit<TourOptions, 'steps'> & { steps: Step[] }
export type TourHandlers = Partial<Record<TourEvent, (ctx: StepContext) => void>>

/**
 * Composable: `const { start, active, index } = useTour({ steps })`.
 * Pass a function to read reactive state when the tour starts: `useTour(() => ({ steps: steps.value }))`.
 * The tour is destroyed when the component unmounts.
 */
export function useTour(options: UseTourOptions | (() => UseTourOptions), handlers: TourHandlers = {}) {
  const tour = shallowRef<Tour | null>(null)
  const active = ref(false)
  const index = ref(-1)

  async function start(at = 0) {
    const prev = tour.value
    tour.value = null // so the old tour's "stop" is ignored below
    prev?.destroy()
    const t = new Tour(typeof options === 'function' ? options() : options)
    tour.value = t
    const wrap = (e: TourEvent, fn?: () => void) =>
      t.on(e, (ctx) => {
        if (tour.value !== t) return
        fn?.()
        handlers[e]?.(ctx)
      })
    wrap('start', () => (active.value = true))
    wrap('step', () => (index.value = ctx(t)))
    wrap('missing')
    wrap('next')
    wrap('previous')
    const off = () => {
      active.value = false
      index.value = -1
    }
    wrap('end', off)
    wrap('stop', off)
    await t.start(at)
  }

  const ctx = (t: Tour) => t.index

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      const t = tour.value
      tour.value = null
      t?.destroy()
    })
  }

  return {
    start,
    stop: () => tour.value?.stop(),
    next: () => tour.value?.next(),
    previous: () => tour.value?.previous(),
    goTo: (step: number | string) => tour.value?.goTo(step),
    active,
    index,
    tour,
  }
}

/**
 * <NexusTour v-model="open" :steps="steps" :options="{ theme }" @end="…" />
 * Renders nothing; the optional default slot receives `{ start, stop, active }`.
 */
export const NexusTour = defineComponent({
  name: 'NexusTour',
  props: {
    steps: { type: Array as PropType<Step[]>, required: true },
    options: { type: Object as PropType<Omit<TourOptions, 'steps'>>, default: () => ({}) },
    modelValue: { type: Boolean, default: false },
    startAt: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'start', 'step', 'next', 'previous', 'missing', 'end', 'stop'],
  setup(props, { emit, slots }) {
    const close = () => emit('update:modelValue', false)
    const api = useTour(() => ({ ...props.options, steps: props.steps }), {
      start: (c) => emit('start', c),
      step: (c) => emit('step', c),
      next: (c) => emit('next', c),
      previous: (c) => emit('previous', c),
      missing: (c) => emit('missing', c),
      end: (c) => (emit('end', c), close()),
      stop: (c) => (emit('stop', c), close()),
    })
    const sync = (open: boolean) => (open ? void api.start(props.startAt) : api.stop())
    onMounted(() => props.modelValue && sync(true))
    watch(
      () => props.modelValue,
      (open) => open !== api.active.value && sync(open),
    )
    return () => slots.default?.({ start: api.start, stop: api.stop, active: api.active.value })
  },
})

/**
 * Onboarding checklist as a composable. Mounts the floating widget with the component (`mount: false` to skip)
 * and exposes reactive progress: `const { items, done, total, complete, start } = useChecklist({ id, items })`.
 */
export function useChecklist(options: ChecklistOptions, { mount = true }: { mount?: boolean } = {}) {
  const checklist = new Checklist(options)
  const tick = ref(0)
  checklist.on('change', () => tick.value++)
  if (getCurrentInstance()) {
    if (mount) onMounted(() => void checklist.mount())
    onBeforeUnmount(() => checklist.unmount())
  }
  const items = computed(() => (tick.value, checklist.items))
  const progress = computed(() => (tick.value, checklist.progress()))
  return {
    checklist,
    items,
    progress,
    done: computed(() => progress.value.done),
    total: computed(() => progress.value.total),
    complete: computed(() => progress.value.complete),
    start: (id: string) => checklist.start(id),
    markDone: (id: string) => checklist.markDone(id),
    reset: () => checklist.reset(),
    open: () => checklist.open(),
    close: () => checklist.close(),
    show: () => checklist.show(),
    hide: () => checklist.hide(),
  }
}
