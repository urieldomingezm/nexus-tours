// Sube la versión: package.json, package-lock.json y CHANGELOG.md (lo de «Sin publicar» pasa a la versión nueva, con fecha).
//   node scripts/nueva-version.mjs patch|minor|major|1.2.3 [--fecha 2026-11-12]
//   node scripts/nueva-version.mjs --notas 1.2.3     imprime lo que dice el CHANGELOG de esa versión (para la release)
// Imprime la versión nueva. No hace commit ni etiqueta: eso lo hace el flujo «Nueva versión» (o tú, a mano).
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

/** Versión siguiente: `patch` (arreglos), `minor` (novedades), `major` (cambios que rompen) o un número exacto. */
export function siguiente(actual, tipo) {
  const a = SEMVER.exec(actual)
  if (!a) throw new Error(`La versión actual «${actual}» no es X.Y.Z`)
  const [ma, mi, pa] = a.slice(1).map(Number)
  if (tipo === 'patch') return `${ma}.${mi}.${pa + 1}`
  if (tipo === 'minor') return `${ma}.${mi + 1}.0`
  if (tipo === 'major') return `${ma + 1}.0.0`
  const n = SEMVER.exec(tipo)
  if (!n) throw new Error(`«${tipo}» no es patch, minor, major ni un número X.Y.Z`)
  const [a1, a2, a3] = n.slice(1).map(Number)
  const mayor = a1 > ma || (a1 === ma && (a2 > mi || (a2 === mi && a3 > pa)))
  if (!mayor) throw new Error(`La versión ${tipo} no es mayor que la actual (${actual})`)
  return tipo
}

/** Mueve el contenido de «Sin publicar» bajo `## [version] - fecha` y deja una sección «Sin publicar» vacía arriba. */
export function moverCambios(changelog, version, fecha) {
  const m = /^## \[Sin publicar\]\s*\n/m.exec(changelog)
  if (!m) throw new Error('No encuentro la sección «## [Sin publicar]» en CHANGELOG.md')
  const ini = m.index + m[0].length
  const resto = changelog.slice(ini)
  const sig = /^## \[/m.exec(resto)
  const cuerpo = (sig ? resto.slice(0, sig.index) : resto).trim()
  if (!cuerpo) throw new Error('«Sin publicar» está vacío: anota qué cambió antes de subir la versión')
  const despues = sig ? resto.slice(sig.index) : ''
  return `${changelog.slice(0, m.index)}## [Sin publicar]\n\n## [${version}] - ${fecha}\n\n${cuerpo}\n\n${despues}`.replace(/\n+$/, '\n')
}

/** Texto de la versión en el CHANGELOG (para las notas de la release). */
export function notasDe(changelog, version) {
  const m = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n`, 'm').exec(changelog)
  if (!m) return ''
  const resto = changelog.slice(m.index + m[0].length)
  const sig = /^## \[/m.exec(resto)
  return (sig ? resto.slice(0, sig.index) : resto).trim()
}

const hoyMx = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' })

function main() {
  const args = process.argv.slice(2)
  const i = args.indexOf('--fecha')
  const fecha = i >= 0 ? args.splice(i, 2)[1] : hoyMx()
  if (args[0] === '--notas') {
    process.stdout.write(`${notasDe(readFileSync('CHANGELOG.md', 'utf8'), args[1] ?? '')}\n`)
    return
  }
  const tipo = args[0]
  if (!tipo) throw new Error('Uso: node scripts/nueva-version.mjs patch|minor|major|X.Y.Z')
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const nueva = siguiente(pkg.version, tipo)
  const changelog = moverCambios(readFileSync('CHANGELOG.md', 'utf8'), nueva, fecha)
  // Solo se escribe cuando todo salió bien: si algo falla arriba, no queda nada a medias.
  pkg.version = nueva
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  lock.version = nueva
  if (lock.packages?.['']) lock.packages[''].version = nueva
  writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`)
  writeFileSync('CHANGELOG.md', changelog)
  console.log(nueva)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (e) {
    console.error(`✗ ${e.message}`)
    process.exit(1)
  }
}
