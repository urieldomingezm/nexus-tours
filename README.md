# nexus-tours

Product tours that **don't break with modals**. Zero dependencies, ~12 KB gzip, TypeScript, accessible, with Vue and React wrappers.

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
| Phones | Bottom sheet with 44 px buttons, safe-area aware, swipe to move, target kept above the sheet, on-screen keyboard aware |
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

## Themes

```ts
import { themes, autoTheme } from 'nexus-tours/themes'   // ~0.5 KB

new Tour({ steps, theme: themes.dark })                   // light · dark · ocean · sunset · mono
new Tour({ steps, theme: autoTheme() })                   // follows prefers-color-scheme
new Tour({ steps, theme: { ...themes.ocean, accent: '#f43f5e', radius: '20px' } })   // extend any of them
```

More visual options: `arrow` (little arrow pointing at the target, default on), `dir: 'rtl' | 'ltr' | 'auto'`,
`theme.fontSize`, `theme.width`, `font`/`fonts`. Entry animations are disabled under `prefers-reduced-motion`.

## Vue and React

```vue
<script setup>
import { ref } from 'vue'
import { NexusTour, useTour } from 'nexus-tours/vue'
const open = ref(false)
</script>
<template>
  <button @click="open = true">Help</button>
  <NexusTour v-model="open" :steps="steps" :options="{ theme }" @end="markDone" />
</template>
```

```tsx
import { NexusTour, useTour } from 'nexus-tours/react'

const [open, setOpen] = useState(false)
<NexusTour open={open} onOpenChange={setOpen} steps={steps} theme={theme} onEnd={markDone} />

// or imperative
const { start, stop, active, index } = useTour({ steps })
```

Both are ~1 KB, import the core as a peer (`nexus-tours`), and clean up on unmount. The React one is StrictMode-safe.
Events: `onStart / onStep / onTargetMissing / onEnd / onStop` (React) or `@start @step @missing @end @stop` (Vue).

## Demo / docs site

`site/` is a static page with live demos (modal, practice mode, themes, fonts, arrow, RTL) in Spanish and English.

```bash
npm run dev          # then open /site/index.html
npm run build:site   # → site-dist/ (deploy to Vercel/Netlify/GitHub Pages)
```

## Look and feel

Out of the box: **progress dots** (a thin bar above 10 steps), a quiet **Skip** instead of the ×, and a **welcome card** for steps without a target (centered, wider, big title). Interactive steps (`advanceOn`) make the highlight **pulse**.

```ts
new Tour({
  steps: [
    { title: 'Welcome to Acme', description: 'A one-minute tour.', icon: '👋' },        // no element → welcome card
    { element: '#new', title: 'Create a client', advanceOn: 'click', hint: 'Click the button' },
    { title: 'All set', icon: '🎉', image: '/img/done.png' },                          // image: https://, /path or data:image/
  ],
  celebrate: true,            // light confetti at the end (skipped with prefers-reduced-motion)
  progress: 'dots',           // 'dots' | 'text' ("2 / 5") | 'both'
  skip: true,                 // quiet "Skip" button (labels.skip)
  closeButton: undefined,     // the × shows only when there is no Skip; true / false to force it
})
```

Parts for your CSS (`::part()`): `dots`, `icon`, `image`, `skip`, `hint`, `never`, plus the existing ones.

## Phones

On narrow screens (≤ 600 px, change with `mobileBreakpoint`) the popover becomes a **bottom sheet**: full width, 44 px touch buttons, no arrow, it respects the notch / home-bar (`env(safe-area-inset-*)`) and rides above the on-screen keyboard. **Swipe sideways** to go next / back (mirrored in RTL), and the highlighted element is scrolled above the sheet (if it sits at the very end of the page, temporary room is added below it and removed afterwards).

```ts
new Tour({ steps })                        // 'auto': sheet on phones, floating popover elsewhere
new Tour({ steps, mobile: 'never' })       // always floating  ·  'always' → always the sheet
```

Style it with `::part(popover)`: the host element has `data-mode="sheet"` on the popover in this layout.

## Steps that move on by themselves

The best way to learn is by doing. `advanceOn` completes the step when the user does the action (the highlighted element becomes clickable and the click still reaches your page):

```ts
const steps = [
  { element: '#new', title: 'Create a client', hint: 'Click the button to continue',
    advanceOn: 'click', hideNext: true },                       // no "Next": the click is the way forward
  { element: '#name', title: 'Type a name',
    advanceOn: { event: 'input', when: (e) => e.target.value.length >= 3, delay: 400 } },
  { element: '#save', title: 'Save it', advanceOn: 'click' },    // "Next" still works as a shortcut
  { title: 'Wait for it…', advanceOn: { until: () => document.querySelector('.toast-success') } },  // polled each frame
]
```

- `advanceOn: 'click' | 'input' | 'change' | 'submit' | 'focus' | …` (any DOM event) listens on the step's element; `target` listens somewhere else; `when(e)` adds a condition; `until()` advances when it returns true; `delay` lets the user see the result first.
- Works great with **practice mode**: the user really creates a client, safely.
- `hideNext` removes "Next" (and the keyboard / swipe shortcut) on that step. `Esc` and × always close the tour.

## Remember progress

```ts
const tour = new Tour({
  steps,
  persist: { id: 'welcome', dontShowAgain: true, version: 1 },   // storage: localStorage by default
})

await tour.startIfNeeded()   // first visit: starts · closed halfway: resumes there · finished or dismissed: does nothing
await tour.status()          // 'new' | 'in-progress' | 'completed' | 'dismissed'
await tour.reset()           // forget it
tour.start()                 // always starts: use it for a "Repeat the tour" button (it won't un-complete the saved state)
```

- `dontShowAgain` adds a small "Don't show again" link. Change `version` when you rewrite the tour so everybody sees it again.
- Keep it per account (not per browser) by passing your own async `storage: { get, set, remove? }`: your API, Supabase, anything.

## Moving between pages

Give steps a `route` and a `router`: the tour navigates there, waits for the page, then looks for the element.

```ts
new Tour({
  router: 'history',          // single-page apps: pushState + popstate
  steps: [
    { element: '#menu-clients', title: 'Clients', route: '/' },
    { element: '#new-client',  title: 'Add one', route: '/clients' },     // navigates to /clients first
  ],
})
```

```ts
// Vue Router
router: { current: () => router.currentRoute.value.fullPath, go: (p) => router.push(p) }
// React Router (const navigate = useNavigate(); const location = useLocation())
router: { current: () => location.pathname + location.search, go: (p) => navigate(p) }
```

**Multi-page sites** (WordPress, PHP, static): use `router: 'location'` plus `persist`. Before leaving the page the tour saves the step; call `tour.startIfNeeded()` on every page load and it continues where it was.

## Visual builder (no code)

Let anyone build a tour by **clicking on your page**. Import it only where it's needed (~8 KB gzip).

```ts
import { TourBuilder } from 'nexus-tours/builder'

new TourBuilder({
  id: 'welcome',                      // names the saved draft (localStorage by default)
  lang: 'es',                         // 'es' | 'en' (default: the browser's)
  steps: savedSteps,                  // start from a saved tour
  onSave: (json) => api.saveTour(json),   // adds a "Save" button: your API, Supabase…
}).open()
```

A panel appears on your page:

1. **Pick element** (default): move over the page, the element under the cursor is outlined with its selector; click it to add a step. `↑` picks the container. The page does *not* react to those clicks.
2. **Interact**: use your page normally (open a modal, switch tabs). Your clicks are recorded and replayed (`beforeClick`) before the next step, so a step *inside a modal* opens it by itself.
3. Write a title and description, optionally tick "Advance on click", change the side, or add a `route`. The selector badge tells you if it finds 1 element ✓, none or several ✗.
4. **Try it** (or ▶ on any step to start from there), then **Copy JSON** / **Copy code** / **Save**.

The JSON is exactly what a tour takes:

```ts
new Tour({ steps: json.steps })     // { version: 1, steps: [...] } → use json.steps as it is
```

- Selectors are chosen to **survive redeploys**: `data-tour` / `data-testid`, real ids, `name`, `aria-label`, stable classes, and only then a path with `:nth-child`. Generated ids and classes (`css-1x2y3z`, `r:3a9f`, hashes) are ignored. `bestSelector(element)` is exported if you want it elsewhere.
- Works with native `<dialog>` modals (the panel moves inside the open modal so it stays clickable) and `Esc` doesn't close the modal underneath.
- Per account / per company: save the JSON in your database with `onSave` and load it back with `steps` (or `builder.load(json)`).
- By CDN: load `nexus-tours.all.iife.js` and then `builder.iife.js`; use `new NexusToursBuilder.TourBuilder().open()`.
- Only show it to admins (e.g. `if (user.isAdmin) new TourBuilder(...).open()`): it's an authoring tool, not for your end users.

## Practice mode with Supabase

If your app talks to Supabase (`supabase-js`, or any PostgREST client), `supabasePractice()` answers `from()`, `rpc()` and `functions.invoke()` from example data while the tour runs. Your real database is never touched.

```ts
import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { supabasePractice } from 'nexus-tours/supabase'     // ~3.7 KB

new Tour({
  steps,
  practice: supabasePractice({
    url: 'https://xxxx.supabase.co',                          // optional: only this project is intercepted
    data: createFixtures({
      clients: { count: 8, fields: { id: fake.id(), name: fake.name(), email: fake.email(), status: fake.pick(['active', 'new']) } },
      orders:  { count: 20, fields: { id: fake.id(), client_id: fake.int(1, 8), total: fake.int(20, 500) } },
    }, { seed: 7 }),
    relations: {                                              // only if you use joins
      orders:  { clients: { table: 'clients', from: 'client_id' } },
      clients: { orders: { table: 'orders', from: 'id', to: 'client_id', many: true } },
    },
    rpc: { total_orders: ({ db }) => db.orders.reduce((s, o) => s + o.total, 0) },
    functions: { 'send-invoice': () => ({ ok: true }) },      // fake edge function
    onStart: () => app.reload(), onEnd: () => app.reload(),   // refresh your UI so it shows the example data
  }),
})
```

**What it understands** (tested against the real `supabase-js`): `eq neq gt gte lt lte like ilike is in not or and`, `order` (nulls like Postgres), `limit` / `range`, `select('a, b')` and aliases, `single()` / `maybeSingle()`, `count` and `head`, `insert` (one or many, auto id), `update`, `delete`, `upsert` (`onConflict`), unique-key errors (`23505`), `.select()` after writes, joins declared in `relations` (`!inner` too), `rpc()` and edge functions.

**Safety rules**
- Writes only change the in-memory copy; **a new tour starts from the original data again**.
- A table you did not seed is **not** answered: reads reach your real backend, writes get a `403`.
- `rpc()` without a handler is blocked (it could write). If one is read-only and safe, list it in `allowRpc: ['name']`.
- `/auth/v1/*` goes through so the user's session keeps working. Storage uploads are blocked.
- Not supported (it says so with a `400` instead of guessing): full-text search, array/JSON operators, aggregates, nested filters inside joins, realtime.
- The patch is on `window.fetch`, so it covers any client that calls the current `fetch`. If you pass a custom `fetch` to `createClient`, use `global: { fetch: liveFetch }` (exported from the same module) so it follows the patch.

## Use it from a CDN (no npm, no bundler)

For plain websites (WordPress, static HTML, PHP...), one `<script>` is enough. The file includes **everything** (tours, checklist, themes, fixtures, practice mode) in ~21 KB gzip and exposes a single global, `NexusTours`.

```html
<script src="https://cdn.jsdelivr.net/npm/nexus-tours@0.1/dist/nexus-tours.all.iife.js"></script>
<script>
  const tour = new NexusTours.Tour({
    theme: NexusTours.themes.mint,
    steps: [
      { element: '#new', title: 'Create a client', description: 'Start here.' },
      { element: '#table', title: 'Your list', description: 'They show up here.' },
    ],
  })
  tour.start()
</script>
```

Or as an ES module:

```html
<script type="module">
  import { Tour, Checklist, themes, createFixtures, fake } from 'https://cdn.jsdelivr.net/npm/nexus-tours@0.1/dist/nexus-tours.all.js'
</script>
```

- Pin the version (`@0.1.0`) in production, and add [`integrity` (SRI)](https://www.srihash.org/) if you want the browser to verify the file.
- `unpkg.com/nexus-tours@0.1` also works (the `unpkg`/`jsdelivr` fields in `package.json` point to the global file).
- The per-feature files (`nexus-tours.js` ~12 KB, `builder.js` ~8 KB, `checklist.js`, `themes.js`, `fixtures.js`) are still there if you want to load only part of it.
- **Publishing:** CDNs serve what is on npm (or a *public* GitHub repo). While this repo is private there is no public URL yet; `npm publish` is what turns on the links above.

## Onboarding checklist

A floating "Getting started" widget that remembers **what each user has already seen**. Finishing an item's tour checks it off.

```ts
import { Checklist } from 'nexus-tours/checklist'     // ~4 KB

const checklist = new Checklist({
  id: 'onboarding',                                    // use a new id to show it again to everyone
  items: [
    { id: 'client', title: 'Create your first client', description: '4-step walkthrough', tour: clientSteps },
    { id: 'invoice', title: 'Send an invoice', tour: invoiceSteps },
    { id: 'docs', title: 'Read the docs', onSelect: () => open('/docs') },   // action without a tour: checked when picked
  ],
  tourOptions: { theme, practice },                    // shared by every item's tour
  theme, font, dir: 'auto', position: 'bottom-end',    // same theming as tours (isolated in a shadow root)
  autoOpen: true,                                      // open the panel the first time
  onComplete: () => celebrate(),
}).mount()

checklist.progress()      // { done: 1, total: 3, complete: false }
checklist.isDone('client'); checklist.markDone('docs'); checklist.reset(); checklist.hide(); checklist.show()
checklist.on('change', render); checklist.on('complete', celebrate)
```

- **A tour closed halfway doesn't count**; only reaching the end does. The widget hides while a tour runs.
- **Storage:** `localStorage` by default (falls back to memory when blocked). Pass `storage: { get, set }` (sync or async) to keep progress per account, e.g. in your database, so it follows users across devices. `await checklist.ready` resolves when saved progress has loaded.
- **Accessible:** real buttons with "completed / pending" names, `aria-expanded`, progress bar, `Esc` closes and returns focus.
- Vue / React: `useChecklist(options)` returns reactive `{ items, done, total, complete, start, markDone, reset, open, close, show, hide }` and mounts the widget with the component.

## Practice mode

Let new users click around on example data. While the tour runs, `fetch` is answered from memory; real writes never leave the browser.

```ts
import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'

new Tour({
  steps,
  practice: {
    data: createFixtures({ clients: { count: 6, fields: { id: fake.id(), name: fake.name(), status: fake.pick(['Active', 'Pending']) } } }, { seed: 1 }),
    rest: { clients: '/api/clients' },       // GET/POST list, GET/PATCH/PUT/DELETE /api/clients/:id, ?field=value filters
    routes: [{ method: 'GET', url: '/api/clients/:id/summary', respond: ({ params, db }) => ({ id: params.id, total: db.clients.length }) }],
    onStart: () => reloadClients(),           // refresh your UI so it fetches the example data
    onEnd: () => reloadClients(),             // …and the real data when the tour ends
    onBlocked: ({ method, url }) => console.warn('blocked', method, url),
  },
}).start()
```

- **Safe by default:** POST/PUT/PATCH/DELETE that no route handles are answered with `403 { error: "practice-mode" }` and never hit the network (`blockWrites: false` to disable). Unhandled GETs go through.
- **Your data is never mutated:** the tour works on a copy and discards it when it ends; `fetch` is restored.
- **Visible:** a "Practice mode" pill (`::part(banner)`, text in `labels.practice`, hide with `banner: false`).
- `latency` simulates network delay (default 120 ms). `tour.practiceData` exposes the live in-memory tables.
- Scope: `fetch` only for now (no `XMLHttpRequest`/WebSocket). Supabase/PostgREST adapter planned.

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
  labels?: { next, previous, done, close, progress, practice, never, skip },
  progress?: 'dots' | 'text' | 'both', skip?: boolean, closeButton?: boolean, celebrate?: boolean,
  mobile?: 'auto' | 'always' | 'never', mobileBreakpoint?: number,   // bottom sheet on phones
  router?: 'history' | 'location' | { current(), go(path), reloads? },
  persist?: { id, storage?, version?, dontShowAgain? },
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
  beforeClick?: string | string[]      // click these first if the element isn't visible (open the modal)
  afterClick?: string | string[]       // click these when leaving the step (close the modal)
  padding?: number
  advanceOn?: 'click' | 'input' | … | { event?, target?, when?, until?, delay? }   // move on when the user acts
  hint?: string                        // call to action under the description
  icon?: string, image?: string        // emoji / image above the title
  hideNext?: boolean                   // with advanceOn: no "Next" button
  route?: string                       // needs the tour's router
}

tour.start(index?)  tour.startIfNeeded()  tour.status()  tour.reset()
tour.next()  tour.previous()  tour.goTo(i)  tour.stop()  tour.destroy()
tour.on('start' | 'step' | 'missing' | 'end' | 'stop', ctx => …)   // returns an unsubscribe fn
```

Theming through CSS variables: `--gm-accent`, `--gm-bg`, `--gm-fg`, `--gm-muted`, `--gm-dim`, `--gm-radius`, `--gm-font`.

## Roadmap

- v0.2 — **practice mode**: ✅ example data · ✅ `fetch` interception + blocked writes · ✅ banner and cleanup. ✅ Supabase/PostgREST adapter. ✅ `XMLHttpRequest` interception (axios, jQuery).
- ✅ Vue/React wrappers · ✅ themes · ✅ RTL · ✅ arrow · ✅ docs site · ✅ phone layout · ✅ `advanceOn` · ✅ saved progress · ✅ page changes.
- ✅ Visual builder. ✅ XHR interception (axios). Next: live demo of the Supabase adapter on the docs site.

## Develop

```bash
npm i
npm run dev      # demo with an animated <dialog> at http://localhost:5173
npm run build
npx playwright install chromium
npm test         # builds are needed first: npm run build
```

## License

MIT


### XHR / axios

Practice mode answers `XMLHttpRequest` the same way it answers `fetch`, so axios, jQuery and friends see the example data and
get their writes blocked too. Nothing to configure; turn it off with `practice: { xhr: false }`. Synchronous XHR is never intercepted.
Requests nobody handles (reads) go to the real server; `abort()`, `responseType` (`json`, `blob`, `arraybuffer`), response headers and
the `readystatechange`/`load`/`loadend` events behave like the real thing.


## Demo para portafolio

`demo/` es una mini app ("Nexus Personal") que enseña la librería en uso: tarjeta de bienvenida, pasos interactivos (`advanceOn`), un modal que carga después, modo práctica con datos de ejemplo, confetti, hoja inferior en móvil y el constructor visual.

```bash
npm run build:demo        # → demo-dist/ (HTML + JS estáticos, rutas relativas)
```

Sube la carpeta a cualquier hosting estático (o a `public/nexus-tours-demo/` de tu portafolio) y enlázala, o incrústala:

```html
<iframe src="/nexus-tours-demo/?embed=1" title="Demo de nexus-tours"
        style="width:100%;height:640px;border:0;border-radius:14px" loading="lazy"></iframe>
```

`?embed=1` oculta la barra lateral. El CI publica la carpeta como artefacto (`demo-portafolio`) en cada push.
