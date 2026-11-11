// Ayudas de DOM del tour: resolver objetivos, clics automáticos y detección de modales.
import type { TargetRef } from '../types'

export function resolveRef(ref: TargetRef | undefined): Element | null {
  if (!ref) return null
  if (typeof ref === 'string') return document.querySelector(ref)
  if (typeof ref === 'function') return ref() ?? null
  return ref
}

/** Clicks the first element of each selector (for `beforeClick` / `afterClick`). */
export function clickAll(sel: string | string[] | undefined) {
  for (const s of ([] as string[]).concat(sel ?? [])) {
    try {
      ;(document.querySelector(s) as HTMLElement | null)?.click()
    } catch {
      /* invalid selector: ignore */
    }
  }
}

function isModalDialog(d: Element): boolean {
  try {
    return d.matches(':modal')
  } catch {
    return false
  }
}

/**
 * Containers that act as modals: native <dialog>, ARIA dialogs (Headless UI, Radix, MUI, Element Plus, Ant Design,
 * Quasar, PrimeVue…) and the ones some frameworks leave without a role (Bootstrap modal/offcanvas, Vuetify overlays).
 */
const MODALS =
  'dialog[open],[aria-modal="true"],[role="dialog"],[role="alertdialog"],.modal.show,.offcanvas.show,.offcanvas.showing,.v-overlay__content'

/**
 * Closest ancestor that acts as a modal, also through open shadow roots (a field inside a nexus-dialogs window
 * lives in a shadow root: its `closest()` stops at the root, so we continue from the host). `extra` adds your own
 * selector (option `modalSelector`).
 */
export function modalHost(el: Element | null, extra?: string): HTMLElement | null {
  const sel = extra ? `${MODALS},${extra}` : MODALS
  let node: Element | null = el
  while (node) {
    let own: Element | null = null
    try {
      own = node.closest(sel)
    } catch {
      own = node.closest(MODALS) // invalid custom selector: ignore it
    }
    if (own instanceof HTMLElement) return own
    const root = node.getRootNode()
    node = root instanceof ShadowRoot ? root.host : null
  }
  // A modal <dialog> makes everything outside it inert: stay inside the open one.
  const open = Array.from(document.querySelectorAll('dialog[open]')).filter(isModalDialog)
  return (open[open.length - 1] as HTMLElement | undefined) ?? null
}

const FIELDS =
  'input:not([type=hidden]),select,textarea,[contenteditable=""],[contenteditable=true],[role=combobox],[role=textbox],[role=searchbox]'

/** The element is, or contains, something the user types in: the tour must not block clicks on it. */
export function hasField(el: Element): boolean {
  return el.matches(FIELDS) || !!el.querySelector(FIELDS)
}

/** Puts the host in the top layer (Popover API) or re-shows it so it is above anything opened after it. */
export function raise(root: HTMLElement) {
  if (!('showPopover' in root)) return
  try {
    if (root.matches(':popover-open')) root.hidePopover()
    root.showPopover()
  } catch {
    /* not connected yet / unsupported */
  }
}

export function lower(root: HTMLElement) {
  try {
    if ('hidePopover' in root && root.matches(':popover-open')) root.hidePopover()
  } catch {
    /* ignore */
  }
}

/** Shadow root styles: constructable stylesheet when available, otherwise a <style> (with the CSP nonce). */
export function adoptStyles(shadow: ShadowRoot, css: string, nonce?: string) {
  if ('adoptedStyleSheets' in shadow && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    shadow.adoptedStyleSheets = [sheet]
  } else {
    const s = document.createElement('style')
    if (nonce) s.nonce = nonce
    s.textContent = css
    shadow.appendChild(s)
  }
}

export const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Element with class and `part` (for `::part()` styling). */
export function part<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  partName?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = cls
  if (partName) el.setAttribute('part', partName)
  if (text !== undefined) el.textContent = text
  return el
}
