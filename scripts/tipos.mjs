// Ajusta los tipos generados por tsc (dist/**/*.d.ts) para todos los modos de resolución de TypeScript:
// - node16/nodenext (ESM): los imports relativos necesitan extensión → './types' pasa a './types.js'.
// - node16/nodenext (CJS, require): necesitan tipos CommonJS → se crea una copia .d.cts de cada .d.ts
//   cuyos imports relativos apuntan a '.cjs'.
// Lo verifica `npm run check:paquete` con Are The Types Wrong.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const archivos = []
;(function recorrer(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) recorrer(p)
    else if (p.endsWith('.d.ts')) archivos.push(p)
  }
})(DIST)

// from './x' · import('./x') · export * from '../x'  (solo rutas relativas sin extensión)
const RELATIVO = /((?:from\s+|import\s*\(\s*)['"])(\.{1,2}\/[^'"]+?)(['"])/g
const conExtension = (texto, ext) =>
  texto.replace(RELATIVO, (todo, antes, ruta, despues) => (/\.(c|m)?js$/.test(ruta) ? todo : `${antes}${ruta}${ext}${despues}`))

for (const f of archivos) {
  const original = readFileSync(f, 'utf8')
  writeFileSync(f, conExtension(original, '.js'))
  writeFileSync(f.replace(/\.d\.ts$/, '.d.cts'), conExtension(original, '.cjs'))
}
console.log(`✓ tipos: ${archivos.length} .d.ts con extensiones y sus copias .d.cts`)
