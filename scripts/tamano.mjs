// Límites de tamaño (gzip) de cada archivo publicado. Requiere `npm run build`.
// Uso: npm run size                          (falla si algún archivo pasa su límite)
//      node scripts/tamano.mjs --base <dir>  (además compara contra otra compilación, p. ej. la de main)
import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync, appendFileSync } from 'node:fs'

const LIMITES = {
  'nexus-tours': 14,
  'nexus-tours.all': 23,
  fixtures: 4,
  themes: 1.5,
  vue: 2,
  react: 2,
  checklist: 5,
  supabase: 4.5,
  builder: 10,
}

if (!existsSync('dist/nexus-tours.js')) {
  console.error('No existe dist/: corre `npm run build` primero.')
  process.exit(1)
}

const i = process.argv.indexOf('--base')
const base = i > 0 ? process.argv[i + 1] : null
const gz = (ruta) => (existsSync(ruta) ? gzipSync(readFileSync(ruta)).length / 1024 : null)

let fallos = 0
const filas = []
for (const [archivo, max] of Object.entries(LIMITES)) {
  const kb = gz(`dist/${archivo}.js`)
  const ok = kb < max
  if (!ok) fallos++
  let cambio = ''
  if (base) {
    const antes = gz(`${base}/dist/${archivo}.js`)
    const d = antes === null ? null : Math.round((kb - antes) * 1024)
    cambio = d === null ? 'nuevo' : `${d > 0 ? '+' : ''}${d} B`
  }
  filas.push(`| ${archivo}.js | ${kb.toFixed(2)} KB | ${base ? `${cambio} | ` : ''}${max} KB | ${ok ? '✅' : '❌'} |`)
  console.log(`${ok ? '✓' : '✗'} ${archivo}.js  ${kb.toFixed(2)} KB gzip${base ? ` (${cambio} vs base)` : ''} (límite ${max} KB)`)
}

// En GitHub Actions deja la tabla en el resumen del job.
if (process.env.GITHUB_STEP_SUMMARY) {
  const cabecera = base
    ? ['| Archivo | Tamaño | Cambio vs base | Límite | |', '|---|---|---|---|---|']
    : ['| Archivo | Tamaño | Límite | |', '|---|---|---|---|']
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['### Tamaño (gzip)', '', ...cabecera, ...filas, ''].join('\n'))
}
process.exit(fallos ? 1 : 0)
