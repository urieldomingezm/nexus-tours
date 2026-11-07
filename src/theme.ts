import type { Theme } from './types'

const MAP: [keyof Theme, string][] = [
  ['accent', '--gm-accent'],
  ['accentContrast', '--gm-accent-fg'],
  ['background', '--gm-bg'],
  ['text', '--gm-fg'],
  ['muted', '--gm-muted'],
  ['border', '--gm-border'],
  ['overlay', '--gm-dim'],
  ['radius', '--gm-radius'],
  ['font', '--gm-font'],
  ['zIndex', '--gm-z'],
  ['fontSize', '--gm-font-size'],
  ['width', '--gm-width'],
]

/** Converts a Theme into CSS custom properties ("inherit" for font resolves to the page's body font). */
export function themeVars(theme: Theme = {}): Record<string, string> {
  const th = { ...theme }
  if (th.font === 'inherit' && typeof document !== 'undefined') th.font = getComputedStyle(document.body).fontFamily
  const out: Record<string, string> = {}
  for (const [k, v] of MAP) if (th[k] !== undefined) out[v] = String(th[k])
  return out
}
