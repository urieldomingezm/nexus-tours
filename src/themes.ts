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

export const themes = { light, dark, ocean, sunset, mint, rose, mono } as const

/** `dark` or `light` depending on the user's system setting (evaluated when called). */
export function autoTheme(): Theme {
  const darkPref = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return darkPref ? dark : light
}
