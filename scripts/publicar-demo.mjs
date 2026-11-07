// Compila la demo para una ruta fija y la copia a la carpeta pública de otro sitio (p. ej. el portafolio).
//   npm run demo:publicar -- ../portafolio-social/public/demos/nexus-tours [/demos/nexus-tours/]
import { execSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const destino = process.argv[2]
const base = process.argv[3] || '/demos/nexus-tours/'
if (!destino) {
  console.error('Uso: npm run demo:publicar -- <carpeta-destino> [base]')
  process.exit(1)
}
if (!base.startsWith('/') || !base.endsWith('/')) {
  console.error('La base debe empezar y terminar con "/" (ej. /demos/nexus-tours/)')
  process.exit(1)
}
execSync('npm run build:demo', { stdio: 'inherit', env: { ...process.env, DEMO_BASE: base } })
const out = resolve(destino)
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync('demo-dist', out, { recursive: true })
if (existsSync('THIRD_PARTY_NOTICES.md')) copyFileSync('THIRD_PARTY_NOTICES.md', resolve(out, 'THIRD_PARTY_NOTICES.md'))
console.log(`✓ Demo copiada a ${out} (base ${base})`)
