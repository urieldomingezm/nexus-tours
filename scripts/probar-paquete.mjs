// Prueba el paquete TAL COMO SE PUBLICA (npm pack) en proyectos limpios:
//   Node ESM (import) y CJS (require) de cada punto de entrada · TypeScript en modo bundler, node16 ESM y node16 CJS ·
//   un build con Vite y otro con webpack.
// Requiere `npm run build`. Uso: npm run check:paquete
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const raiz = resolve('.')
if (!existsSync(join(raiz, 'dist/nexus-tours.js'))) {
  console.error('No existe dist/: corre `npm run build` primero.')
  process.exit(1)
}
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })
const paso = (nombre, fn) => {
  process.stdout.write(`• ${nombre} … `)
  fn()
  console.log('ok')
}

const dir = mkdtempSync(join(tmpdir(), 'nexus-tours-paquete-'))
const ENTRADAS = [
  'nexus-tours',
  'nexus-tours/fixtures',
  'nexus-tours/themes',
  'nexus-tours/checklist',
  'nexus-tours/builder',
  'nexus-tours/supabase',
  'nexus-tours/vue',
  'nexus-tours/react',
]

try {
  paso('npm pack', () => {
    const tgz = sh(`npm pack --silent --pack-destination ${JSON.stringify(dir)}`, raiz)
      .trim()
      .split('\n')
      .pop()
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'consumidor', private: true, type: 'module', dependencies: { 'nexus-tours': `file:./${tgz}` } }, null, 2),
    )
  })

  paso('instalar con vue, react, typescript, vite y webpack', () => {
    sh('npm i --no-audit --no-fund --silent vue react typescript@5 vite webpack webpack-cli @types/react', dir)
  })

  paso('Node ESM: import de cada entrada (más /all)', () => {
    const codigo = [...ENTRADAS, 'nexus-tours/all']
      .map(
        (e, i) =>
          `const m${i} = await import('${e}'); if (!Object.keys(m${i}).length && '${e}' !== 'nexus-tours/all') throw new Error('${e} vacío')`,
      )
      .join('\n')
    writeFileSync(join(dir, 'esm.mjs'), codigo + "\nconsole.log('esm')\n")
    sh('node esm.mjs', dir)
  })

  paso('Node CJS: require de cada entrada', () => {
    const codigo = ENTRADAS.map((e) => `if (!Object.keys(require('${e}')).length) throw new Error('${e} vacío')`).join('\n')
    writeFileSync(join(dir, 'cjs.cjs'), codigo + "\nconsole.log('cjs')\n")
    sh('node cjs.cjs', dir)
  })

  const usoTs = `
import { Tour, guide, routers, PASS, type Step, type TourAnalyticsEvent, type StopReason } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { themes } from 'nexus-tours/themes'
import { Checklist } from 'nexus-tours/checklist'
import { TourBuilder, type TourJSON } from 'nexus-tours/builder'
import { supabasePractice } from 'nexus-tours/supabase'
import { useTour } from 'nexus-tours/vue'
const pasos: Step[] = [{ id: 'a', element: '#a', title: 'Hola', content: () => 'x' }]
const razon: StopReason = 'skip'
const t = new Tour({ steps: pasos, theme: themes.dark, onEvent: (e: TourAnalyticsEvent) => e.stepElapsed, practice: supabasePractice({ data: createFixtures({ t: { count: 1, fields: { id: fake.id() } } }) }) })
t.on('stop', (c) => c.reason === razon)
void t.goTo('a'); guide(pasos); void routers; void PASS
new Checklist({ id: 'c', items: [{ id: 'i', title: 'I' }] })
const j: TourJSON = new TourBuilder().toJSON(); void j
useTour({ steps: pasos })
`
  const tsc = (archivo, opciones) => sh(`npx tsc --noEmit --strict --skipLibCheck false --lib es2020,dom ${opciones} ${archivo}`, dir)

  paso('TypeScript, moduleResolution bundler', () => {
    writeFileSync(join(dir, 'bundler.ts'), usoTs)
    tsc('bundler.ts', '--module esnext --moduleResolution bundler')
  })

  paso('TypeScript, node16 ESM', () => {
    writeFileSync(join(dir, 'node16.mts'), usoTs)
    tsc('node16.mts', '--module node16 --moduleResolution node16')
  })

  paso('TypeScript, node16 CJS (require)', () => {
    writeFileSync(join(dir, 'node16.cts'), usoTs)
    tsc('node16.cts', '--module node16 --moduleResolution node16')
  })

  const app = `
import { Tour } from 'nexus-tours'
import { createFixtures, fake } from 'nexus-tours/fixtures'
import { themes } from 'nexus-tours/themes'
import { Checklist } from 'nexus-tours/checklist'
const datos = createFixtures({ t: { count: 2, fields: { id: fake.id() } } })
window.tour = new Tour({ theme: themes.dark, steps: [{ title: 'Hola ' + datos.t.length }] })
window.lista = new Checklist({ id: 'c', items: [{ id: 'a', title: 'A' }] })
`
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src/main.js'), app)

  paso('build con Vite', () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><script type="module" src="/src/main.js"></script>')
    sh('npx vite build --logLevel error', dir)
    if (!readdirSync(join(dir, 'dist/assets')).some((f) => f.endsWith('.js'))) throw new Error('Vite no generó JS')
  })

  paso('build con webpack 5', () => {
    sh('npx webpack --mode production --entry ./src/main.js --output-path ./dist-webpack --no-stats', dir)
    if (!existsSync(join(dir, 'dist-webpack/main.js'))) throw new Error('webpack no generó main.js')
  })

  console.log('\n✓ El paquete funciona en Node (ESM y CJS), TypeScript (bundler y node16) y con Vite y webpack.')
} finally {
  if (!process.env.CONSERVAR) rmSync(dir, { recursive: true, force: true })
}
