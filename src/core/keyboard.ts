// Teclado del tour: Esc cierra, Tab queda atrapado en el popover, flechas/Enter navegan (respetando RTL).

export interface KeyTarget {
  readonly active: boolean
  readonly pop: HTMLElement | null
  readonly shadow: ShadowRoot | null
  readonly rtl: boolean
  readonly closeOnEsc: boolean
  readonly keyboard: boolean
  /** True when the step only advances with the user's action (hideNext + advanceOn). */
  readonly locked: boolean
  next(): void
  previous(): void
  stop(): void
}

export function createKeyHandler(t: KeyTarget) {
  return (e: KeyboardEvent) => {
    const pop = t.pop
    if (!t.active || !pop) return
    // Events from inside the shadow root are retargeted to the host: use the real origin.
    const origin = (e.composedPath()[0] ?? e.target) as HTMLElement | null
    const inPop = !!origin && pop.contains(origin)

    if (e.key === 'Escape' && t.closeOnEsc) {
      e.preventDefault()
      e.stopPropagation() // do not also close the modal underneath
      t.stop()
      return
    }

    if (e.key === 'Tab' && (inPop || !origin || origin === document.body)) {
      // Dialog libraries listen to Tab on their own container (SweetAlert2, focus traps): this one is the tour's.
      e.stopPropagation()
      const items = Array.from(pop.querySelectorAll<HTMLButtonElement>('button')).filter((b) => !b.disabled)
      if (!items.length) return
      const first = items[0] as HTMLElement
      const lastEl = items[items.length - 1] as HTMLElement
      const activeEl = t.shadow?.activeElement
      if (e.shiftKey && (activeEl === first || activeEl === pop || !inPop)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (activeEl === lastEl || !inPop)) {
        e.preventDefault()
        first.focus()
      }
      return
    }

    if (!t.keyboard) return
    // Fields and widgets that use these keys themselves (comboboxes, lists, menus, sliders): not the tour's.
    const typing =
      !!origin &&
      (origin.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(origin.tagName) ||
        !!origin.closest?.(
          '[role=combobox],[role=listbox],[role=option],[role=menu],[role=menuitem],[role=slider],[role=textbox],[role=searchbox]',
        ))
    if (typing) return
    const fwd = t.rtl ? 'ArrowLeft' : 'ArrowRight'
    const back = t.rtl ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === fwd || (e.key === 'Enter' && !(origin instanceof HTMLButtonElement))) {
      e.preventDefault()
      if (inPop) e.stopPropagation()
      if (t.locked) return
      t.next()
    } else if (e.key === back) {
      e.preventDefault()
      if (inPop) e.stopPropagation()
      t.previous()
    }
  }
}
