// Pruebas de punta a punta en Chromium, Firefox y WebKit (Safari).
//   npm run test:e2e                        → los tres navegadores
//   npm run test:e2e -- --project=chromium  → solo uno
// Requiere `npm run build` (CDN y tamaño usan dist/) y, para la demo, `npm run build:demo`.
import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const CI = !!process.env.CI
// Opcional: usar un Chromium ya instalado (p. ej. en entornos sin acceso al CDN de Playwright).
const chromiumPath = process.env.PW_CHROMIUM || undefined

const servidores = [
  { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199/test/paginas/', reuseExistingServer: !CI, timeout: 60_000 },
]
if (existsSync('site-dist/index.html')) {
  servidores.push({
    command: 'npx vite preview --mode site --port 5196 --strictPort',
    url: 'http://localhost:5196/',
    reuseExistingServer: !CI,
    timeout: 60_000,
  })
}
if (existsSync('demo-dist/index.html')) {
  servidores.push({
    command: 'npx vite preview --mode demo --port 5195 --strictPort',
    url: 'http://localhost:5195/',
    reuseExistingServer: !CI,
    timeout: 60_000,
  })
}

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.spec.mjs',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }], ['github']] : [['list']],
  use: { trace: 'retain-on-failure' },
  webServer: servidores,
  projects: [
    // Cada prueba define su viewport/touch al crear el contexto; aquí solo se elige el motor.
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: chromiumPath } } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
