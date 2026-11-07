# nexus-tours

Product tours that **don't break with modals**. Zero dependencies, ~5 KB gzip, TypeScript, accessible.

Most tour libraries fall apart when the target lives inside a modal: it doesn't exist yet (animation, async content),
the highlight ends up *under* the `<dialog>`, the tour's buttons are `inert`, or `Esc` closes the wrong thing.
`nexus-tours` is built around those cases.

## Install

```bash
npm i nexus-tours
```

## Use

```ts
import { Tour } from 'nexus-tours'

const tour = new Tour({
  steps: [
    { element: '#new-client', title: 'Create a client', description: 'Everything starts here.' },
    {
      before: () => openModal(),            // open the modal; the tour waits for the target to appear
      element: '#name',
      title: 'Name it',
    },
    { element: '#save', title: 'Save', after: () => closeModal() },
    { element: '#table', title: 'Your list' },
  ],
})

tour.start()
```

## What it handles

| Problem | What nexus-tours does |
|---|---|
| Target doesn't exist yet (animated / async modal) | Waits until it exists **and is visible** (MutationObserver + per-frame check), with a timeout |
| Native `<dialog>.showModal()` makes the rest of the page `inert` | Mounts inside the open modal so the tour stays clickable; uses the Popover API to stay on top |
| `aria-modal` / `role="dialog"` modals with focus traps | Mounts inside the modal so focus traps don't fight the tour |
| Ancestors with `transform` (animated modals) | Corrects coordinates for the containing block |
| Target disappears and comes back (modal closed / reopened) | Detects it, waits again and re-attaches |
| Target never shows up | Skips the step (or stops with `onMissing: 'stop'`) and emits `missing` |
| `Esc` | Closes the tour, **not** the modal underneath |
| Nested scroll containers, resize | Scrolls only when needed; the highlight follows the target |
| Accessibility | `role="dialog"`, labelled, focus moved in and restored, Tab trapped, `aria-live` announcements, `prefers-reduced-motion` |

## API

```ts
new Tour({
  steps: Step[],
  waitTimeout?: number,          // default 5000 ms
  onMissing?: 'skip' | 'stop',   // default 'skip'
  closeOnBackdrop?: boolean,     // default false
  closeOnEsc?: boolean,          // default true
  keyboard?: boolean,            // ←/→/Enter, default true
  showProgress?: boolean,        // "2 / 5", default true
  padding?: number,              // default 6
  labels?: { next, previous, done, close, progress },
  container?: HTMLElement,       // where to mount when not inside a modal
  nonce?: string,                // CSP nonce for the injected <style>
})

interface Step {
  element?: string | Element | (() => Element | null)   // omit for a centered step
  title?: string
  description?: string
  side?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  before?(ctx): void | Promise<void>   // runs before the target is searched
  after?(ctx): void | Promise<void>    // runs when leaving the step
  waitTimeout?: number
  onMissing?: 'skip' | 'stop'
  allowTargetClick?: boolean           // let the user click the highlighted element
  padding?: number
}

tour.start(index?)  tour.next()  tour.previous()  tour.goTo(i)  tour.stop()  tour.destroy()
tour.on('start' | 'step' | 'missing' | 'end' | 'stop', ctx => …)   // returns an unsubscribe fn
```

Theming through CSS variables: `--gm-accent`, `--gm-bg`, `--gm-fg`, `--gm-muted`, `--gm-dim`, `--gm-radius`, `--gm-font`.

## Roadmap

- v0.2 — **practice mode**: run the tour on fake data (generated fixtures + request interception) so new users can try things safely.
- Vue and React wrappers, themes, RTL.

## Develop

```bash
npm i
npm run dev      # demo with an animated <dialog> at http://localhost:5173
npm run build
npm test         # needs Playwright (NODE_PATH=…/playwright's node_modules)
```

## License

MIT
