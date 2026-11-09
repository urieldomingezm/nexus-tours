import type { Theme } from './types'

/** Ready-made themes. Pass one as `theme`, or spread it to tweak: `theme: { ...themes.dark, accent: '#f43f5e' }`. */
export const light: Theme = {
  accent: '#4263eb',
  accentContrast: '#ffffff',
  background: '#ffffff',
  text: '#1c1b22',
  muted: '#4a4958',
  border: 'rgba(66,99,235,.16)',
  overlay: 'rgba(15,15,25,.62)',
  radius: '10px',
}

export const dark: Theme = {
  accent: '#7c93ff',
  accentContrast: '#0b1030',
  background: '#17161f',
  text: '#f1f0f7',
  muted: '#a9a7bb',
  border: 'rgba(255,255,255,.14)',
  overlay: 'rgba(0,0,0,.72)',
  radius: '10px',
}

export const ocean: Theme = {
  accent: '#0ea5e9',
  accentContrast: '#04202e',
  background: '#f4fbff',
  text: '#0b2a3b',
  muted: '#3f6073',
  border: 'rgba(14,165,233,.22)',
  overlay: 'rgba(6,36,54,.6)',
  radius: '14px',
}

export const sunset: Theme = {
  accent: '#f97316',
  accentContrast: '#2a1202',
  background: '#fff8f1',
  text: '#3a1d0b',
  muted: '#7a5238',
  border: 'rgba(249,115,22,.22)',
  overlay: 'rgba(58,29,11,.6)',
  radius: '16px',
}

/** Square, high-contrast, no color: works on any brand. */
export const mono: Theme = {
  accent: '#111111',
  accentContrast: '#ffffff',
  background: '#ffffff',
  text: '#111111',
  muted: '#555555',
  border: '#111111',
  overlay: 'rgba(0,0,0,.7)',
  radius: '2px',
}

export const mint: Theme = {
  accent: '#0f9d76',
  accentContrast: '#ffffff',
  background: '#f6fffb',
  text: '#0d2e26',
  muted: '#456a5f',
  border: 'rgba(15,157,118,.22)',
  overlay: 'rgba(8,38,30,.6)',
  radius: '14px',
}

export const rose: Theme = {
  accent: '#e11d74',
  accentContrast: '#ffffff',
  background: '#fff7fa',
  text: '#3a0d22',
  muted: '#7d4a62',
  border: 'rgba(225,29,116,.2)',
  overlay: 'rgba(58,13,34,.6)',
  radius: '16px',
}

// ---------------------------------------------------------------- your framework's colors
// These read your framework's CSS variables, so the tour follows your brand and its dark mode automatically.
// The fallbacks are the framework defaults, used when a variable isn't defined.
const v = (name: string, fallback: string) => `var(${name}, ${fallback})`

/** Bootstrap 5.3 (`--bs-*`), including `data-bs-theme="dark"`. */
export const bootstrap: Theme = {
  accent: v('--bs-primary', '#0d6efd'),
  accentContrast: '#ffffff',
  background: v('--bs-body-bg', '#ffffff'),
  text: v('--bs-body-color', '#212529'),
  muted: v('--bs-secondary-color', 'rgba(33,37,41,.75)'),
  border: v('--bs-border-color-translucent', 'rgba(0,0,0,.175)'),
  overlay: 'rgba(0,0,0,.5)',
  radius: v('--bs-border-radius-lg', '.5rem'),
  font: v('--bs-body-font-family', 'system-ui,sans-serif'),
}

/** Tailwind CSS v4 default palette (`--color-*`, `--font-sans`). Spread it and set `accent` to your brand color. */
export const tailwind: Theme = {
  accent: v('--color-indigo-600', '#4f46e5'),
  accentContrast: '#ffffff',
  background: v('--color-white', '#ffffff'),
  text: v('--color-gray-900', '#111827'),
  muted: v('--color-gray-600', '#4b5563'),
  border: v('--color-gray-200', '#e5e7eb'),
  overlay: 'rgba(17,24,39,.6)',
  radius: v('--radius-lg', '.5rem'),
  font: v('--font-sans', 'ui-sans-serif,system-ui,sans-serif'),
}

/** shadcn/ui (Tailwind v4 variables: `--primary`, `--background`…). For the older HSL variables use e.g. `accent: 'hsl(var(--primary))'`. */
export const shadcn: Theme = {
  accent: v('--primary', '#18181b'),
  accentContrast: v('--primary-foreground', '#fafafa'),
  background: v('--popover', v('--background', '#ffffff')),
  text: v('--popover-foreground', v('--foreground', '#09090b')),
  muted: v('--muted-foreground', '#71717a'),
  border: v('--border', '#e4e4e7'),
  overlay: 'rgba(0,0,0,.5)',
  radius: v('--radius', '.625rem'),
  font: 'inherit',
}

/** daisyUI 5 (`--color-primary`, `--color-base-100`…), following the active `data-theme`. */
export const daisyui: Theme = {
  accent: v('--color-primary', '#605dff'),
  accentContrast: v('--color-primary-content', '#ffffff'),
  background: v('--color-base-100', '#ffffff'),
  text: v('--color-base-content', '#1f2937'),
  muted: v('--color-neutral', '#4b5563'),
  border: v('--color-base-300', '#e5e7eb'),
  overlay: 'rgba(0,0,0,.4)',
  radius: v('--radius-box', '1rem'),
  font: 'inherit',
}

/** Vuetify 3 (`--v-theme-*`, light and dark). */
export const vuetify: Theme = {
  accent: 'rgb(var(--v-theme-primary, 24,103,192))',
  accentContrast: 'rgb(var(--v-theme-on-primary, 255,255,255))',
  background: 'rgb(var(--v-theme-surface, 255,255,255))',
  text: 'rgb(var(--v-theme-on-surface, 33,33,33))',
  muted: 'rgba(var(--v-theme-on-surface, 33,33,33), var(--v-medium-emphasis-opacity, .7))',
  border: 'rgba(var(--v-border-color, 0,0,0), var(--v-border-opacity, .12))',
  overlay: 'rgba(33,33,33,.46)',
  radius: '4px',
  font: 'inherit',
}

/** Material UI with CSS variables (`CssVarsProvider` / `cssVariables: true`: `--mui-palette-*`). */
export const mui: Theme = {
  accent: v('--mui-palette-primary-main', '#1976d2'),
  accentContrast: v('--mui-palette-primary-contrastText', '#ffffff'),
  background: v('--mui-palette-background-paper', '#ffffff'),
  text: v('--mui-palette-text-primary', 'rgba(0,0,0,.87)'),
  muted: v('--mui-palette-text-secondary', 'rgba(0,0,0,.6)'),
  border: v('--mui-palette-divider', 'rgba(0,0,0,.12)'),
  overlay: 'rgba(0,0,0,.5)',
  radius: v('--mui-shape-borderRadius', '4px'),
  font: 'inherit',
}

export const themes = { light, dark, ocean, sunset, mint, rose, mono, bootstrap, tailwind, shadcn, daisyui, vuetify, mui } as const

/** `dark` or `light` depending on the user's system setting (evaluated when called). */
export function autoTheme(): Theme {
  const darkPref = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return darkPref ? dark : light
}
