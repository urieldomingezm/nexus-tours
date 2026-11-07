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
| Page CSS clashes | Shadow DOM isolation in both directions |
| Accessibility | `role="dialog"`, labelled, focus moved in and restored, Tab trapped, `aria-live` announcements, `prefers-reduced-motion` |

## Looks: your font, your CSS — without breaking the host page

The tour renders inside a **shadow root**, so your page's CSS (`button { … }`, `* { font-family … !important }`) can't break it,
and the tour's CSS can't leak into your page. You customize it through explicit hooks:

```ts
new Tour({
  steps,
  font: 'inherit',                       // use the page's body font (or any font-family string)
  fonts: [{ family: 'Inter', src: '/fonts/inter.woff2', weight: 600 }],   // loads @font-face once
  theme: { accent: '#10b981', accentContrast: '#000', background: '#111', text: '#eee', radius: '4px' },
  css: '.gm-title { text-transform: uppercase }',   // extra CSS applied inside the tour
  className: 'my-tour',
})
```

From your own stylesheet:

```css
:root { --gm-accent: #e11d48; --gm-radius: 6px; --gm-font: "Inter", sans-serif; }   /* variables cross the shadow boundary */
.my-tour::part(title) { letter-spacing: .02em; }
.my-tour::part(button-primary) { border-radius: 999px; }
```

Variables: `--gm-accent --gm-accent-fg --gm-bg --gm-fg --gm-muted --gm-border --gm-dim --gm-radius --gm-font --gm-z`.
Parts: `backdrop ring popover title description footer progress button button-primary button-secondary close`.

## Example data (for practice mode)

`nexus-tours/fixtures` (~2 KB, separate entry, zero dependencies): seedable fake data in Spanish or English.

```ts
import { createFixtures, fake } from 'nexus-tours/fixtures'

const data = createFixtures(
  {
    clients: {
      count: 8,
      fields: {
        id: fake.id(),
        name: fake.name(),
        email: fake.email({ from: 'name', domain: 'demo.mx' }),   // derived from the same row
        company: fake.company(),
        status: fake.pick(['Active', 'Pending']),
        amount: fake.int(100, 9000),
        since: fake.date({ past: 90 }),
        source: 'practice',                                      // constants are copied as-is
      },
    },
  },
  { seed: 42, locale: 'es' },   // same seed → same data
)
```

Generators: `id uuid firstName lastName name company email phone int float bool pick words date`.

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

- v0.2 — **practice mode**: ✅ example data (`nexus-tours/fixtures`) · ⏳ request interception while the tour runs · ⏳ "practice mode" banner and cleanup.
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
