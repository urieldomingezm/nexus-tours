// Límites de tamaño (gzip) de cada archivo publicado. Requiere `npm run build`.
// Uso: npm run size     (falla si algún archivo pasa su límite)
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

let fallos = 0
const filas = []
for (const [archivo, max] of Object.entries(LIMITES)) {
  const kb = gzipSync(readFileSync(`dist/${archivo}.js`)).length / 1024
  const ok = kb < max
  if (!ok) fallos++
  filas.push(`| ${archivo}.js | ${kb.toFixed(2)} KB | ${max} KB | ${ok ? '✅' : '❌'} |`)
  console.log(`${ok ? '✓' : '✗'} ${archivo}.js  ${kb.toFixed(2)} KB gzip (límite ${max} KB)`)
}

// En GitHub Actions deja la tabla en el resumen del job.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['### Tamaño (gzip)', '', '| Archivo | Tamaño | Límite | |', '|---|---|---|---|', ...filas, ''].join('\n'))
}
process.exit(fallos ? 1 : 0)
