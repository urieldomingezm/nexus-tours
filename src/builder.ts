/**
 * Visual tour builder: click the things on your page, write a title, press "Try it".
 * Produces plain JSON (`{ version: 1, steps: [...] }`) that `new Tour({ steps })` accepts as it is.
 */
import { Tour, themeVars } from 'nexus-tours'
import type { Side, Step, Theme, TourOptions } from 'nexus-tours'

export type JSONStep = Omit<Step, 'element' | 'before' | 'after' | 'advanceOn' | 'allowTargetClick'> & {
  element?: string
  advanceOn?: 'click'
}
export interface TourJSON {
  version: 1
  steps: JSONStep[]
}

export interface BuilderStorage {
  get(key: string): string | null | undefined | Promise<string | null | undefined>
  set(key: string, value: string): void | Promise<void>
}

export interface BuilderOptions {
  /** Names the saved draft ("welcome"). Default "default". */
  id?: string
  /** Where the draft is kept. Default localStorage; `null` = memory. */
  storage?: BuilderStorage | null
  /** UI language. Default: the browser's. */
  lang?: 'es' | 'en'
  /** Colors / font of the builder panel and of the preview. */
  theme?: Theme
  /** Steps to start from (e.g. loaded from your database). */
  steps?: JSONStep[]
  /** Options for "Try it" (theme, practice, router…). `steps` is ignored. */
  tourOptions?: Omit<TourOptions, 'steps'>
  /** Adds a "Save" button: receive the JSON and store it (your API, Supabase…). */
  onSave?: (json: TourJSON) => void | Promise<void>
  /** Called on every edit. */
  onChange?: (json: TourJSON) => void
  /** Called when the panel is closed with ×. */
  onClose?: () => void
}

// ------------------------------------------------------------------ selectors

/** Ids / classes that look generated (CSS-in-JS, hashes, counters): they change between builds. */
const AUTO = /\d{3,}|[0-9a-f]{8,}|:|^_|^css-|^jsx-|^sc-|^svelte-|^ng-|^v-|^react-|--/i
const TEST_ATTRS = ['data-tour', 'data-testid', 'data-test', 'data-cy', 'data-qa']
const PLAIN_ATTRS = ['name', 'aria-label', 'placeholder', 'title', 'alt', 'href', 'type']

const esc = (s: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'))
const quote = (v: string) => JSON.stringify(v)

function unique(sel: string, el: Element): boolean {
  try {
    const found = document.querySelectorAll(sel)
    return found.length === 1 && found[0] === el
  } catch {
    return false
  }
}

function segment(el: Element): string {
  const tag = el.tagName.toLowerCase()
  for (const a of TEST_ATTRS) {
    const v = el.getAttribute(a)
    if (v) return `[${a}=${quote(v)}]`
  }
  if (el.id && !AUTO.test(el.id)) return `#${esc(el.id)}`
  const cls = [...el.classList].find((c) => !AUTO.test(c) && c.length <= 40)
  let s = tag + (cls ? `.${esc(cls)}` : '')
  const parent = el.parentElement
  if (parent && [...parent.children].filter((c) => c.matches(s)).length > 1) s += `:nth-child(${[...parent.children].indexOf(el) + 1})`
  return s
}

/** A short, readable selector that survives redeploys: test attributes, real ids, names, stable classes, then a path. */
export function bestSelector(el: Element): string {
  const tag = el.tagName.toLowerCase()
  for (const a of TEST_ATTRS) {
    const v = el.getAttribute(a)
    if (v && unique(`[${a}=${quote(v)}]`, el)) return `[${a}=${quote(v)}]`
  }
  if (el.id && !AUTO.test(el.id) && unique(`#${esc(el.id)}`, el)) return `#${esc(el.id)}`
  for (const a of PLAIN_ATTRS) {
    const v = el.getAttribute(a)
    if (!v || v.length > 60) continue
    for (const s of [`[${a}=${quote(v)}]`, `${tag}[${a}=${quote(v)}]`]) if (unique(s, el)) return s
  }
  const classes = [...el.classList].filter((c) => !AUTO.test(c) && c.length <= 40).slice(0, 4)
  for (const c of classes) for (const s of [`.${esc(c)}`, `${tag}.${esc(c)}`]) if (unique(s, el)) return s
  for (let i = 0; i < classes.length; i++)
    for (let j = i + 1; j < classes.length; j++) {
      const s = `${tag}.${esc(classes[i]!)}.${esc(classes[j]!)}`
      if (unique(s, el)) return s
    }
  const path: string[] = []
  let cur: Element | null = el
  while (cur && cur !== document.documentElement && path.length < 5) {
    path.unshift(segment(cur))
    const sel = path.join(' > ')
    if (unique(sel, el)) return sel
    cur = cur.parentElement
  }
  return path.join(' > ')
}

// ------------------------------------------------------------------ texts

const TEXTS = {
  es: {
    title: 'Constructor de tours', pick: 'Elegir elemento', interact: 'Interactuar',
    hintPick: 'Pasa el cursor por la página y haz clic en lo que quieras resaltar. ↑ elige el contenedor · Esc para interactuar.',
    hintInteract: 'Usa tu página con normalidad (abre modales, cambia de pestaña). Tus clics se guardan para repetirlos antes del siguiente paso.',
    empty: 'Aún no hay pasos. Elige un elemento de la página o añade una bienvenida.', welcome: '+ Bienvenida',
    stepTitle: 'Título del paso', stepDesc: 'Descripción', selector: 'Selector', noTarget: 'Sin elemento: se muestra centrado (bienvenida o cierre).',
    found: 'encontrado ✓', missing: 'no encontrado ✗', many: (n: number) => `${n} elementos ✗`,
    advance: 'Avanza al hacer clic', side: 'Posición', before: 'Antes, clic en', after: 'Después, clic en', route: 'Página',
    tryIt: 'Probar', tryFrom: 'Probar desde este paso', up: 'Subir', down: 'Bajar', remove: 'Quitar', copyJson: 'Copiar JSON', copyCode: 'Copiar código',
    copied: '¡Copiado!', importJson: 'Importar', load: 'Cargar', save: 'Guardar', saved: '¡Guardado!', clear: 'Borrar todo', sure: '¿Seguro?',
    clicks: 'Clics grabados', dock: 'Mover el panel', close: 'Cerrar', pasteHere: 'Pega aquí el JSON del tour', badJson: 'JSON no válido',
    auto: 'auto', top: 'arriba', bottom: 'abajo', left: 'izquierda', right: 'derecha', sep: ' → ',
  },
  en: {
    title: 'Tour builder', pick: 'Pick element', interact: 'Interact',
    hintPick: 'Move over the page and click what you want to highlight. ↑ picks the container · Esc to interact.',
    hintInteract: 'Use your page normally (open modals, switch tabs). Your clicks are saved and replayed before the next step.',
    empty: 'No steps yet. Pick an element on the page or add a welcome.', welcome: '+ Welcome',
    stepTitle: 'Step title', stepDesc: 'Description', selector: 'Selector', noTarget: 'No element: shown centered (welcome or goodbye).',
    found: 'found ✓', missing: 'not found ✗', many: (n: number) => `${n} elements ✗`,
    advance: 'Advance on click', side: 'Side', before: 'Before, click', after: 'After, click', route: 'Page',
    tryIt: 'Try it', tryFrom: 'Try from this step', up: 'Move up', down: 'Move down', remove: 'Remove', copyJson: 'Copy JSON', copyCode: 'Copy code',
    copied: 'Copied!', importJson: 'Import', load: 'Load', save: 'Save', saved: 'Saved!', clear: 'Clear all', sure: 'Sure?',
    clicks: 'Recorded clicks', dock: 'Move panel', close: 'Close', pasteHere: 'Paste the tour JSON here', badJson: 'Invalid JSON',
    auto: 'auto', top: 'top', bottom: 'bottom', left: 'left', right: 'right', sep: ' → ',
  },
}

const CSS_TEXT = `
:host{all:initial;position:fixed;inset:0;width:100%;height:100%;z-index:var(--gm-z,2147483100);pointer-events:none;font:14px/1.4 var(--gm-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:var(--gm-fg,#1c1b22)}
*,*::before,*::after{box-sizing:border-box}
.hl{position:fixed;display:none;pointer-events:none;border:2px solid var(--gm-accent,#4263eb);background:rgba(66,99,235,.14);background:color-mix(in srgb,var(--gm-accent,#4263eb) 14%,transparent);border-radius:4px;transition:left .06s,top .06s,width .06s,height .06s}
.hl i{position:absolute;left:-2px;bottom:100%;max-width:360px;padding:2px 6px;border-radius:4px 4px 0 0;background:var(--gm-accent,#4263eb);color:var(--gm-accent-fg,#fff);font:600 11px/1.4 ui-monospace,Menlo,Consolas,monospace;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.panel{position:fixed;bottom:16px;inset-inline-end:16px;width:380px;max-height:min(76vh,640px);display:flex;flex-direction:column;pointer-events:auto;background:var(--gm-bg,#fff);border-radius:calc(var(--gm-radius,10px) + 4px);box-shadow:0 16px 48px rgba(0,0,0,.3),0 0 0 1px rgba(0,0,0,.06)}
.panel.left{inset-inline-end:auto;inset-inline-start:16px}
.head{display:flex;align-items:center;gap:6px;padding:12px 12px 8px 16px}
.head b{flex:1;font-size:15px}
.ico{width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:16px;cursor:pointer;opacity:.7}
.ico:hover{opacity:1;background:rgba(120,120,140,.16)}
.modes{display:flex;gap:6px;padding:0 16px}
.modes button{flex:1}
.btn{font:inherit;font-weight:600;font-size:13px;padding:8px 12px;border-radius:calc(var(--gm-radius,10px) - 2px);border:1px solid rgba(120,120,140,.35);background:transparent;color:inherit;cursor:pointer}
.btn:hover{background:rgba(120,120,140,.14)}
.btn[aria-pressed=true],.btn.pri{background:var(--gm-accent,#4263eb);border-color:transparent;color:var(--gm-accent-fg,#fff)}
.btn.pri:hover,.btn[aria-pressed=true]:hover{filter:brightness(1.08);background:var(--gm-accent,#4263eb)}
.btn:focus-visible,.ico:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--gm-accent,#4263eb);outline-offset:1px}
.hint{margin:8px 16px 0;font-size:12.5px;color:var(--gm-muted,#4a4958)}
.rec{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 16px 0;font-size:12px;color:var(--gm-muted,#4a4958)}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 8px;border-radius:99px;background:rgba(120,120,140,.18);font:11.5px ui-monospace,Menlo,Consolas,monospace;color:var(--gm-fg,#1c1b22)}
.chip button{border:0;background:none;color:inherit;cursor:pointer;font-size:13px;padding:0 4px}
.list{flex:1;min-height:60px;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px}
.empty{padding:14px 6px;text-align:center;color:var(--gm-muted,#4a4958)}
.card{border:1px solid rgba(120,120,140,.3);border-radius:var(--gm-radius,10px);padding:10px;display:flex;flex-direction:column;gap:7px}
.row{display:flex;align-items:center;gap:6px}
.num{display:grid;place-items:center;flex:none;width:24px;height:24px;border-radius:99px;background:var(--gm-accent,#4263eb);color:var(--gm-accent-fg,#fff);font-weight:700;font-size:12px}
input,textarea,select{width:100%;font:inherit;font-size:13px;padding:6px 8px;border-radius:7px;border:1px solid rgba(120,120,140,.4);background:transparent;color:inherit}
textarea{resize:vertical;min-height:44px}
.sel{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
.badge{flex:none;font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:99px;cursor:pointer;border:0;font-family:inherit}
.badge[data-ok=true]{background:rgba(18,184,134,.18);color:#0b7a59}
.badge[data-ok=false]{background:rgba(230,73,80,.16);color:#c92a2a}
.muted{font-size:12px;color:var(--gm-muted,#4a4958)}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px}
.opts label{display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:var(--gm-muted,#4a4958)}
.opts .wide{grid-column:1/-1}
.chk{flex-direction:row!important;align-items:center;gap:6px!important}
.chk input{width:auto}
.foot{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 12px;border-top:1px solid rgba(120,120,140,.22)}
.foot .btn{flex:1 1 auto;white-space:nowrap}
.imp{padding:0 12px 10px;display:flex;flex-direction:column;gap:6px}
@media (max-width:600px){.panel{inset-inline:8px;bottom:8px;width:auto;max-height:58vh}}
`

const clean = (s: JSONStep): JSONStep => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) {
    if (v === '' || v === undefined || v === null || v === false || (Array.isArray(v) && !v.length)) continue
    out[k] = v
  }
  return out as JSONStep
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue
    if (k === 'class') e.className = String(v)
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
    else if (k === 'value' || k === 'checked' || k === 'textContent') (e as unknown as Record<string, unknown>)[k] = v
    else e.setAttribute(k, String(v))
  }
  for (const c of kids) if (c) e.append(c)
  return e
}

const CLICKABLE = 'button,a,[role=button],[role=tab],[role=menuitem],[role=option],summary,label,input,select,textarea'

export class TourBuilder {
  private o: BuilderOptions
  private L: (typeof TEXTS)['es']
  private steps: JSONStep[] = []
  private mode: 'pick' | 'interact' = 'pick'
  private pending: string[] = []
  private host: HTMLElement | null = null
  private panel!: HTMLElement
  private list!: HTMLElement
  private recBar!: HTMLElement
  private hintEl!: HTMLElement
  private hl!: HTMLElement
  private modeBtns!: { pick: HTMLButtonElement; interact: HTMLButtonElement }
  private hover: Element | null = null
  private previewing = false
  private timer = 0
  private relocator = 0
  private store: BuilderStorage | null
  private key: string
  /** Resolves when the saved draft has been loaded. */
  readonly ready: Promise<void>

  constructor(options: BuilderOptions = {}) {
    this.o = options
    const lang = options.lang ?? (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en')
    this.L = TEXTS[lang]
    this.key = `nexus-tours:builder:${options.id ?? 'default'}`
    this.store = options.storage === null ? null : (options.storage ?? localStore())
    this.steps = (options.steps ?? []).map((s) => ({ ...s }))
    this.ready = this.loadDraft()
  }

  // ------------------------------------------------------------ public API

  get isOpen() {
    return !!this.host
  }

  toJSON(): TourJSON {
    return { version: 1, steps: this.steps.map(clean) }
  }

  toCode(): string {
    return `import { Tour } from 'nexus-tours'\n\nconst tour = new Tour({\n  steps: ${JSON.stringify(this.steps.map(clean), null, 2).replace(/\n/g, '\n  ')},\n})\n\ntour.start()\n`
  }

  load(json: TourJSON | JSONStep[]) {
    const steps = Array.isArray(json) ? json : json.steps
    if (!Array.isArray(steps)) throw new Error('Invalid tour JSON')
    this.steps = steps.map((s) => ({ ...s }))
    this.render()
    this.changed()
  }

  clear() {
    this.steps = []
    this.pending = []
    this.render()
    this.changed()
  }

  open() {
    if (this.host) return this
    const host = document.createElement('div')
    host.setAttribute('data-nexus-builder', '')
    if ('showPopover' in host) host.setAttribute('popover', 'manual')
    for (const [k, v] of Object.entries(themeVars({ ...this.o.theme }))) host.style.setProperty(k, v)
    const root = host.attachShadow({ mode: 'open' })
    const css = CSS_TEXT
    if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      root.adoptedStyleSheets = [sheet]
    } else root.append(h('style', {}, css))
    this.host = host
    this.build(root)
    document.body.appendChild(host)
    this.raise()
    this.setMode('pick')
    const on = (t: string, fn: (e: never) => void) => document.addEventListener(t, fn as EventListener, true)
    on('mousemove', this.onMove)
    on('keydown', this.onKey)
    for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) on(t, this.onBlock)
    on('click', this.onRecord)
    this.relocator = window.setInterval(() => this.relocate(), 300)
    return this
  }

  close() {
    if (!this.host) return
    for (const t of ['mousemove']) document.removeEventListener(t, this.onMove as EventListener, true)
    document.removeEventListener('keydown', this.onKey as EventListener, true)
    for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) document.removeEventListener(t, this.onBlock as EventListener, true)
    document.removeEventListener('click', this.onRecord as EventListener, true)
    clearInterval(this.relocator)
    try {
      if ('hidePopover' in this.host && this.host.matches(':popover-open')) this.host.hidePopover()
    } catch {
      /* ignore */
    }
    this.host.remove()
    this.host = null
    this.hover = null
  }

  destroy() {
    this.close()
  }

  // ------------------------------------------------------------ UI

  private build(root: ShadowRoot) {
    const L = this.L
    this.hl = h('div', { class: 'hl' }, h('i'))
    this.hintEl = h('p', { class: 'hint' })
    this.recBar = h('div', { class: 'rec' })
    this.list = h('div', { class: 'list' })
    this.modeBtns = {
      pick: h('button', { class: 'btn', type: 'button', onClick: () => this.setMode('pick') }, L.pick),
      interact: h('button', { class: 'btn', type: 'button', onClick: () => this.setMode('interact') }, L.interact),
    }
    const imp = h('div', { class: 'imp' })
    imp.hidden = true
    const area = h('textarea', { placeholder: L.pasteHere, rows: 5 })
    const err = h('span', { class: 'muted' })
    imp.append(
      area,
      err,
      h('button', { class: 'btn pri', type: 'button', onClick: () => {
        try {
          this.load(JSON.parse(area.value) as TourJSON)
          imp.hidden = true
          area.value = ''
          err.textContent = ''
        } catch {
          err.textContent = L.badJson
        }
      } }, L.load),
    )
    const flash = (b: HTMLButtonElement, text: string) => {
      const old = b.dataset.label ?? b.textContent ?? ''
      b.dataset.label = old
      b.textContent = text
      setTimeout(() => (b.textContent = old), 1500)
    }
    const copy = (b: HTMLButtonElement, text: string) => {
      void copyText(text).then(() => flash(b, L.copied))
    }
    const bTry = h('button', { class: 'btn pri', type: 'button', onClick: () => this.preview(0) }, L.tryIt)
    const bJson = h('button', { class: 'btn', type: 'button', onClick: () => copy(bJson, JSON.stringify(this.toJSON(), null, 2)) }, L.copyJson)
    const bCode = h('button', { class: 'btn', type: 'button', onClick: () => copy(bCode, this.toCode()) }, L.copyCode)
    const bImp = h('button', { class: 'btn', type: 'button', onClick: () => (imp.hidden = !imp.hidden) }, L.importJson)
    const bSave = this.o.onSave
      ? h('button', { class: 'btn pri', type: 'button', onClick: async () => {
          await this.o.onSave!(this.toJSON())
          flash(bSave!, L.saved)
        } }, L.save)
      : null
    const bClear = h('button', { class: 'btn', type: 'button', onClick: () => {
      if (bClear.dataset.armed) {
        delete bClear.dataset.armed
        bClear.textContent = L.clear
        this.clear()
      } else {
        bClear.dataset.armed = '1'
        bClear.textContent = L.sure
        setTimeout(() => {
          delete bClear.dataset.armed
          bClear.textContent = L.clear
        }, 2500)
      }
    } }, L.clear)

    this.panel = h(
      'div',
      { class: 'panel', role: 'dialog', 'aria-label': L.title },
      h('div', { class: 'head' },
        h('b', {}, L.title),
        h('button', { class: 'ico', type: 'button', title: L.dock, 'aria-label': L.dock, onClick: () => this.panel.classList.toggle('left') }, '⇄'),
        h('button', { class: 'ico', type: 'button', title: L.close, 'aria-label': L.close, onClick: () => (this.close(), this.o.onClose?.()) }, '×'),
      ),
      h('div', { class: 'modes' }, this.modeBtns.pick, this.modeBtns.interact),
      this.hintEl,
      this.recBar,
      this.list,
      imp,
      h('div', { class: 'foot' }, bTry, bSave, bJson, bCode, bImp, bClear),
    )
    // Typing in the panel must not trigger the page's own shortcuts (or close the modal underneath).
    for (const t of ['keydown', 'keyup', 'keypress']) this.panel.addEventListener(t, (e) => e.stopPropagation())
    root.append(this.hl, this.panel)
    this.render()
  }

  private setMode(m: 'pick' | 'interact') {
    this.mode = m
    this.modeBtns.pick.setAttribute('aria-pressed', String(m === 'pick'))
    this.modeBtns.interact.setAttribute('aria-pressed', String(m === 'interact'))
    this.hintEl.textContent = m === 'pick' ? this.L.hintPick : this.L.hintInteract
    this.hl.style.display = 'none'
    this.hover = null
  }

  private renderRec() {
    this.recBar.replaceChildren()
    this.recBar.hidden = !this.pending.length
    if (!this.pending.length) return
    this.recBar.append(this.L.clicks + ':')
    this.pending.forEach((s, i) =>
      this.recBar.append(h('span', { class: 'chip' }, s, h('button', { type: 'button', 'aria-label': this.L.remove, onClick: () => (this.pending.splice(i, 1), this.renderRec()) }, '×'))),
    )
  }

  private render() {
    if (!this.host) return
    this.renderRec()
    this.list.replaceChildren()
    if (!this.steps.length) {
      this.list.append(
        h('div', { class: 'empty' }, this.L.empty, h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn', type: 'button', onClick: () => this.addStep({ title: '', description: '' }) }, this.L.welcome))),
      )
      return
    }
    this.steps.forEach((s, i) => this.list.append(this.card(s, i)))
    this.list.append(h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onClick: () => this.addStep({ title: '', description: '' }) }, this.L.welcome)))
  }

  private card(s: JSONStep, i: number) {
    const L = this.L
    const val = (e: Event) => (e.target as HTMLInputElement).value
    const join = (v: string | string[] | undefined) => ([] as string[]).concat(v ?? []).join(L.sep)
    const split = (v: string) => v.split(L.sep.trim()).map((x) => x.trim()).filter(Boolean)
    const icon = (txt: string, label: string, fn: () => void, disabled = false) =>
      h('button', { class: 'ico', type: 'button', title: label, 'aria-label': label, disabled: disabled || undefined, onClick: fn }, txt)

    const header = h('div', { class: 'row' },
      h('span', { class: 'num' }, String(i + 1)),
      h('input', { class: 'title', value: s.title ?? '', placeholder: L.stepTitle, 'aria-label': L.stepTitle, onInput: (e: Event) => ((s.title = val(e)), this.changed()) }),
      icon('▶', L.tryFrom, () => this.preview(i)),
      icon('↑', L.up, () => this.move(i, -1), i === 0),
      icon('↓', L.down, () => this.move(i, 1), i === this.steps.length - 1),
      icon('×', L.remove, () => (this.steps.splice(i, 1), this.render(), this.changed())),
    )
    const desc = h('textarea', { class: 'desc', value: s.description ?? '', placeholder: L.stepDesc, 'aria-label': L.stepDesc, rows: 2, onInput: (e: Event) => ((s.description = val(e)), this.changed()) })

    let target: Node
    if (s.element !== undefined) {
      const badge = h('button', { class: 'badge', type: 'button', title: L.selector })
      const refresh = () => {
        const n = countMatches(s.element ?? '')
        badge.dataset.ok = String(n === 1)
        badge.textContent = n === 1 ? L.found : n === 0 ? L.missing : L.many(n)
      }
      refresh()
      badge.addEventListener('click', () => this.flash(s.element ?? ''))
      target = h('div', { class: 'row' },
        h('input', { class: 'sel', value: s.element, 'aria-label': L.selector, onInput: (e: Event) => ((s.element = val(e)), refresh(), this.changed()) }),
        badge,
      )
    } else target = h('div', { class: 'muted' }, L.noTarget)

    const opts = h('div', { class: 'opts' },
      s.element !== undefined
        ? h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: s.advanceOn === 'click', onChange: (e: Event) => ((s.advanceOn = (e.target as HTMLInputElement).checked ? 'click' : undefined), this.changed()) }), L.advance)
        : null,
      s.element !== undefined
        ? h('label', {}, L.side,
            h('select', { onChange: (e: Event) => ((s.side = (val(e) || undefined) as Side | undefined), this.changed()) },
              ...(['', 'top', 'bottom', 'left', 'right'] as const).map((v) => h('option', { value: v, selected: (s.side ?? '') === v || undefined }, v ? L[v] : L.auto))))
        : null,
      h('label', { class: 'wide' }, L.before, h('input', { class: 'sel', value: join(s.beforeClick), onInput: (e: Event) => ((s.beforeClick = split(val(e))), this.changed()) })),
      h('label', { class: 'wide' }, L.after, h('input', { class: 'sel', value: join(s.afterClick), onInput: (e: Event) => ((s.afterClick = split(val(e))), this.changed()) })),
      s.route !== undefined || s.element !== undefined
        ? h('label', { class: 'wide' }, L.route, h('input', { class: 'sel', value: s.route ?? '', placeholder: '/clients', onInput: (e: Event) => ((s.route = val(e) || undefined), this.changed()) }))
        : null,
    )
    return h('div', { class: 'card', 'data-i': i }, header, desc, target, opts)
  }

  private move(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= this.steps.length) return
    ;[this.steps[i], this.steps[j]] = [this.steps[j]!, this.steps[i]!]
    this.render()
    this.changed()
  }

  private addStep(step: JSONStep) {
    this.steps.push(step)
    this.render()
    this.changed()
    const cards = this.list.querySelectorAll('.card')
    const last = cards[cards.length - 1]
    last?.scrollIntoView({ block: 'nearest' })
    ;(last?.querySelector('.title') as HTMLInputElement | null)?.focus()
  }

  private flash(sel: string) {
    let el: Element | null = null
    try {
      el = document.querySelector(sel)
    } catch {
      /* invalid */
    }
    if (!el) return
    el.scrollIntoView({ block: 'nearest' })
    this.showHighlight(el, sel)
    setTimeout(() => this.mode !== 'pick' && (this.hl.style.display = 'none'), 1200)
  }

  // ------------------------------------------------------------ page interaction

  private inside(e: Event) {
    return !!this.host && e.composedPath().includes(this.host)
  }

  private target(e: Event): Element | null {
    const t = e.composedPath()[0]
    return t instanceof Element ? t : null
  }

  private showHighlight(el: Element, label?: string) {
    const r = el.getBoundingClientRect()
    const s = this.hl.style
    s.display = 'block'
    s.left = `${r.left}px`
    s.top = `${r.top}px`
    s.width = `${r.width}px`
    s.height = `${r.height}px`
    ;(this.hl.firstElementChild as HTMLElement).textContent = label ?? bestSelector(el)
  }

  private lastXY = ''
  private onMove = (e: MouseEvent) => {
    const xy = `${e.clientX},${e.clientY}`
    const same = xy === this.lastXY // a click re-sends the same position: keep what ↑ selected
    this.lastXY = xy
    if (same || this.mode !== 'pick' || this.previewing || this.inside(e)) return
    const t = this.target(e)
    if (!t) return
    this.hover = t
    this.showHighlight(t)
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.previewing || !this.host) return
    const t = e.composedPath()[0]
    const inPanel = t instanceof Node && this.host.contains(t)
    if (e.key === 'Escape' && (this.mode === 'pick' || inPanel)) {
      // Do not also close the modal underneath.
      e.preventDefault()
      e.stopPropagation()
      if (this.mode === 'pick') this.setMode('interact')
      return
    }
    if (this.mode === 'pick' && !inPanel && e.key === 'ArrowUp' && this.hover?.parentElement && this.hover.parentElement !== document.documentElement) {
      e.preventDefault()
      this.hover = this.hover.parentElement
      this.showHighlight(this.hover)
    }
  }

  /** In pick mode the page does not react: the click chooses the element instead. */
  private onBlock = (e: MouseEvent | PointerEvent) => {
    if (this.mode !== 'pick' || this.previewing || this.inside(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    if (e.type !== 'click') return
    const el = this.target(e)
    if (!el) return
    // Pick what the user pointed at; the arrow-up key may have moved the highlight to a container.
    const chosen = this.hover && this.hover.contains(el) ? this.hover : (el.closest(CLICKABLE) ?? el)
    this.pick(chosen)
  }

  private pick(el: Element) {
    const step: JSONStep = { element: bestSelector(el), title: '', description: '' }
    if (this.pending.length) {
      step.beforeClick = [...this.pending]
      this.pending = []
    }
    const path = location.pathname
    const prev = [...this.steps].reverse().find((s) => s.route !== undefined)
    if (!prev || prev.route !== path) step.route = path
    this.hover = null
    this.hl.style.display = 'none'
    this.addStep(step)
  }

  private onRecord = (e: MouseEvent) => {
    if (this.mode !== 'interact' || this.previewing || this.inside(e)) return
    const t = this.target(e)
    if (!t) return
    this.pending.push(bestSelector(t.closest(CLICKABLE) ?? t))
    this.renderRec()
  }

  // ------------------------------------------------------------ top layer / modals

  private raise() {
    const host = this.host
    if (!host || !('showPopover' in host)) return
    try {
      if (host.matches(':popover-open')) host.hidePopover()
      host.showPopover()
    } catch {
      /* not connected yet */
    }
  }

  /** A native modal makes everything outside it inert: live inside the open one so the panel keeps working. */
  private relocate() {
    const host = this.host
    if (!host) return
    const open = Array.from(document.querySelectorAll('dialog[open]')).filter((d) => {
      try {
        return d.matches(':modal')
      } catch {
        return false
      }
    })
    const want = (open[open.length - 1] as HTMLElement | undefined) ?? document.body
    if (host.parentElement !== want) {
      want.appendChild(host)
      this.raise()
    }
  }

  // ------------------------------------------------------------ preview / persistence

  private preview(from: number) {
    if (!this.steps.length || !this.host) return
    this.previewing = true
    this.host.hidden = true
    this.hl.style.display = 'none'
    const tour = new Tour({ ...this.o.tourOptions, theme: this.o.theme ?? this.o.tourOptions?.theme, steps: this.steps.map(clean) as Step[] })
    const back = () => {
      this.previewing = false
      if (this.host) {
        this.host.hidden = false
        this.raise()
      }
    }
    tour.on('end', back)
    tour.on('stop', back)
    void tour.start(from)
  }

  private changed() {
    clearTimeout(this.timer)
    this.timer = window.setTimeout(() => {
      const json = this.toJSON()
      this.o.onChange?.(json)
      if (this.store) {
        try {
          void Promise.resolve(this.store.set(this.key, JSON.stringify(json))).catch(() => {})
        } catch {
          /* ignore */
        }
      }
    }, 250)
  }

  private async loadDraft() {
    if (!this.store || this.steps.length) return
    try {
      const raw = await this.store.get(this.key)
      const j = raw ? (JSON.parse(raw) as TourJSON) : null
      if (j && Array.isArray(j.steps) && !this.steps.length) {
        this.steps = j.steps
        this.render()
      }
    } catch {
      /* no usable draft */
    }
  }
}

function countMatches(sel: string): number {
  try {
    return sel.trim() ? document.querySelectorAll(sel).length : 0
  } catch {
    return 0
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    t.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(t)
    t.select()
    try {
      document.execCommand('copy')
    } catch {
      /* ignore */
    }
    t.remove()
  }
}

function localStore(): BuilderStorage | null {
  try {
    const k = '__nexus-tours__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return { get: (key) => localStorage.getItem(key), set: (key, v) => localStorage.setItem(key, v) }
  } catch {
    return null
  }
}
