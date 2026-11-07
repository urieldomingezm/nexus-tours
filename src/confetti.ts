/** A short burst of confetti, isolated in its own shadow root and above any modal. Skipped for reduced motion. */
export function confetti(accent = '#4263eb') {
  if (typeof document === 'undefined' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  const host = document.createElement('div')
  host.setAttribute('data-nexus-confetti', '')
  host.setAttribute('aria-hidden', 'true')
  if ('showPopover' in host) host.setAttribute('popover', 'manual')
  host.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;background:none;overflow:hidden;pointer-events:none;z-index:2147483001'
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = '@keyframes f{to{transform:translate(var(--x),105vh) rotate(var(--r));opacity:.2}}i{position:absolute;top:-16px;width:8px;height:14px;border-radius:2px;animation:f var(--d) cubic-bezier(.2,.6,.4,1) var(--w) forwards}'
  root.appendChild(style)
  const colors = [accent, '#f59f00', '#12b886', '#e64980', '#7048e8']
  for (let n = 0; n < 40; n++) {
    const p = document.createElement('i')
    p.style.cssText = `left:${Math.random() * 100}%;background:${colors[n % colors.length]};--x:${Math.round((Math.random() - 0.5) * 240)}px;--r:${Math.round(360 + Math.random() * 540)}deg;--d:${(1.2 + Math.random() * 0.9).toFixed(2)}s;--w:${(Math.random() * 0.25).toFixed(2)}s`
    root.appendChild(p)
  }
  document.body.appendChild(host)
  try {
    if ('showPopover' in host) host.showPopover()
  } catch {
    /* fine: it still shows without the top layer */
  }
  setTimeout(() => host.remove(), 2600)
}
