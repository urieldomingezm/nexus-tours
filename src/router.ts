import type { Router } from './types'

const path = () => location.pathname + location.search

/** Ready-made routers for `Tour({ router })`. Vue Router / React Router: see the README (two lines). */
export const routers = {
  /** Single-page apps using the History API (Vue Router, React Router, …). */
  history: (): Router => ({
    current: path,
    go: (p) => {
      history.pushState({}, '', p)
      dispatchEvent(new PopStateEvent('popstate'))
    },
  }),
  /** Multi-page sites: each page load continues the tour with `startIfNeeded()` (needs `persist`). */
  location: (): Router => ({ current: path, go: (p) => location.assign(p), reloads: true }),
}

export function resolveRouter(r: Router | 'history' | 'location' | undefined): Router | null {
  return !r ? null : typeof r === 'string' ? routers[r]() : r
}

/** Same page? Compares the path (and the query only if the step's route has one); ignores trailing "/" and "#hash". */
export function sameRoute(current: string, route: string): boolean {
  const norm = (s: string, withQuery: boolean) => {
    let u: URL
    try {
      u = new URL(s, location.href)
    } catch {
      return s
    }
    return (u.pathname.replace(/\/+$/, '') || '/') + (withQuery ? u.search : '')
  }
  const q = route.includes('?')
  return norm(current, q) === norm(route, q)
}
