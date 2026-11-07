// Cálculos de posición del tour. Funciones puras (sin DOM): se prueban con pruebas unitarias.
import type { Side } from '../types'

export const GAP = 12
export const EDGE = 8

export type Placement = Exclude<Side, 'auto'>
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Viewport {
  /** Ancho y alto visibles. */
  vw: number
  vh: number
  /** Desplazamiento del contenedor "fixed" (cuando un ancestro tiene transform). */
  ox: number
  oy: number
}

/** The highlighted hole around the target, in the root's coordinates. */
export function holeFor(r: { left: number; top: number; width: number; height: number }, pad: number, ox: number, oy: number): Rect {
  return { x: r.left - pad - ox, y: r.top - pad - oy, w: r.width + pad * 2, h: r.height + pad * 2 }
}

/** clip-path for the backdrop: full screen minus a rounded hole (radius clamped to the hole's size). */
export function backdropPath(hole: Rect, radius: number, vw: number, vh: number): string {
  const { x, y, w, h } = hole
  const r = Math.max(0, Math.min(radius || 0, w / 2, h / 2))
  const d = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  return `path(evenodd,"M0 0H${vw}V${vh}H0Z ${d}")`
}

/** Preferred side if it fits; otherwise bottom → top → right → left; otherwise the one that fits best. */
export function pickSide(side: Side, h: Rect, pw: number, ph: number, v: Viewport): Placement {
  const space = {
    bottom: v.vh - (h.y + h.h + v.oy) - GAP - EDGE,
    top: h.y + v.oy - GAP - EDGE,
    right: v.vw - (h.x + h.w + v.ox) - GAP - EDGE,
    left: h.x + v.ox - GAP - EDGE,
  }
  const need = { bottom: ph, top: ph, right: pw, left: pw }
  if (side !== 'auto' && space[side] >= need[side]) return side
  const order: Placement[] = ['bottom', 'top', 'right', 'left']
  const fit = order.find((s) => space[s] >= need[s])
  if (fit) return fit
  return order.reduce((a, b) => (space[b] - need[b] > space[a] - need[a] ? b : a))
}

/** Floating popover position next to the hole (kept inside the screen), or centered when there is no target. */
export function placePopover(hole: Rect | null, side: Side, pw: number, ph: number, v: Viewport): { x: number; y: number; side: Placement | 'center' } {
  if (!hole) return { x: (v.vw - pw) / 2 - v.ox, y: (v.vh - ph) / 2 - v.oy, side: 'center' }
  const s = pickSide(side, hole, pw, ph, v)
  let x: number
  let y: number
  if (s === 'bottom') [x, y] = [hole.x + hole.w / 2 - pw / 2, hole.y + hole.h + GAP]
  else if (s === 'top') [x, y] = [hole.x + hole.w / 2 - pw / 2, hole.y - ph - GAP]
  else if (s === 'right') [x, y] = [hole.x + hole.w + GAP, hole.y + hole.h / 2 - ph / 2]
  else [x, y] = [hole.x - pw - GAP, hole.y + hole.h / 2 - ph / 2]
  x = Math.min(Math.max(x, EDGE - v.ox), v.vw - pw - EDGE - v.ox)
  y = Math.min(Math.max(y, EDGE - v.oy), v.vh - ph - EDGE - v.oy)
  return { x, y, side: s }
}

/** Arrow offsets (CSS values) so it points at the middle of the hole without leaving the popover's corners. */
export function arrowStyle(side: Placement, h: Rect, px: number, py: number, pw: number, ph: number): { top: string; bottom: string; left: string; right: string } {
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 14), Math.max(14, max - 26))
  const st = { top: '', bottom: '', left: '', right: '' }
  if (side === 'bottom') [st.top, st.left] = ['-6px', `${clamp(h.x + h.w / 2 - px - 6, pw)}px`]
  else if (side === 'top') [st.bottom, st.left] = ['-6px', `${clamp(h.x + h.w / 2 - px - 6, pw)}px`]
  else if (side === 'right') [st.left, st.top] = ['-6px', `${clamp(h.y + h.h / 2 - py - 6, ph)}px`]
  else [st.right, st.top] = ['-6px', `${clamp(h.y + h.h / 2 - py - 6, ph)}px`]
  return st
}

/** Bottom sheet on narrow screens ('auto'), always or never. */
export function isSheet(mode: 'auto' | 'always' | 'never' | undefined, vw: number, breakpoint = 600) {
  const m = mode ?? 'auto'
  return m === 'always' || (m === 'auto' && vw <= breakpoint)
}
