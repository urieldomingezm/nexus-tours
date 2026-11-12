// Revisa el sitio ya construido (site-dist/): que el código propio de cada página llegó de verdad al build.
// El servidor de desarrollo no recorta nada y las pruebas e2e corren ahí; un build puede descartar un `import './x'` que solo se
// importa por su efecto (pasó con el buscador y la maqueta). Uso: npm run build:site && node scripts/revisar-sitio.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'site-dist'
const pendientes = []
// Cada página debe cargar (su entrada y lo que precarga) el buscador, «volver arriba» y las animaciones comunes.
const COMUN = ['busca-caja', 'Volver arriba', 'particulas']
const POR_PAGINA = { 'index.html': ['mira-pantalla', 'data-escribe'] }

for (const pagina of readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(DIR, pagina), 'utf8')
  const scripts = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
  const codigo = scripts.map((s) => readFileSync(join(DIR, s), 'utf8')).join('\n')
  for (const marca of [...COMUN, ...(POR_PAGINA[pagina] ?? [])]) {
    if (!codigo.includes(marca)) pendientes.push(`${pagina}: falta «${marca}» en el JavaScript que carga la página`)
  }
}

if (pendientes.length) {
  console.error(`✗ El sitio construido no incluye código que sus páginas necesitan:\n  ${pendientes.join('\n  ')}`)
  process.exit(1)
}
console.log('✓ Todas las páginas del sitio cargan el buscador, las animaciones y, en la portada, la maqueta del tour')
