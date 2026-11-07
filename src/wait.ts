export function isVisible(el: Element): boolean {
  if (!el.isConnected) return false
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return false
  const s = getComputedStyle(el)
  return s.visibility !== 'hidden' && s.display !== 'none'
}

/**
 * Resolves with the element once it exists AND is visible (so animated / async modals work).
 * Re-checks on DOM mutations and on every frame; resolves null on timeout or when aborted.
 */
export function waitForElement(
  find: () => Element | null | undefined,
  timeout: number,
  signal: { aborted: boolean },
): Promise<Element | null> {
  return new Promise((resolve) => {
    let done = false
    let raf = 0
    const started = performance.now()
    const finish = (el: Element | null) => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      obs.disconnect()
      resolve(el)
    }
    const check = () => {
      if (done) return
      if (signal.aborted) return finish(null)
      let el: Element | null | undefined = null
      try {
        el = find()
      } catch {
        el = null
      }
      if (el && isVisible(el)) return finish(el)
      if (performance.now() - started >= timeout) return finish(null)
      raf = requestAnimationFrame(check)
    }
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    check()
  })
}
