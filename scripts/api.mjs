// Reporte de la API pública: api/nexus-tours.api.md, generado de los tipos compilados (dist/*.d.ts).
//   npm run api          → regenera el reporte (súbelo junto con tu cambio)
//   npm run api:check    → falla si la API cambió y el reporte no se actualizó (lo usa el CI)
// Así cualquier cambio de API, intencional o no, aparece en el diff del PR.
import ts from 'typescript'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const SALIDA = 'api/nexus-tours.api.md'
const check = process.argv.includes('--check')

const entradas = Object.entries(pkg.exports)
  .filter(([, v]) => typeof v === 'object' && v.types)
  .map(([ruta, v]) => ({ nombre: ruta === '.' ? pkg.name : `${pkg.name}/${ruta.slice(2)}`, archivo: v.types }))

for (const e of entradas) {
  if (!existsSync(e.archivo)) {
    console.error(`No existe ${e.archivo}: corre \`npm run build\` primero.`)
    process.exit(1)
  }
}

const program = ts.createProgram(
  entradas.map((e) => e.archivo),
  {
    skipLibCheck: true,
    noEmit: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2020,
  },
)
const checker = program.getTypeChecker()
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })

/** Quita miembros privados/protegidos de las clases (no son API). */
function sinPrivados(node) {
  if (!ts.isClassDeclaration(node)) return node
  const miembros = node.members.filter(
    (m) =>
      !(ts.getCombinedModifierFlags(m) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) &&
      !(m.name && ts.isPrivateIdentifier(m.name)),
  )
  return ts.factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, miembros)
}

function declaracion(simbolo) {
  const s = simbolo.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(simbolo) : simbolo
  const partes = []
  for (const d of s.declarations ?? []) {
    let nodo = ts.isVariableDeclaration(d) ? d.parent.parent : d
    nodo = sinPrivados(nodo)
    partes.push(printer.printNode(ts.EmitHint.Unspecified, nodo, d.getSourceFile()).replace(/^export declare |^export |^declare /, ''))
  }
  return partes.join('\n')
}

let md = `# API pública de ${pkg.name}\n\n> Generado por \`npm run api\` a partir de \`dist/*.d.ts\`. No lo edites a mano.\n> Si tu PR cambia este archivo, cambia la API: revisa que sea intencional y anótalo en el CHANGELOG.\n`
for (const e of entradas) {
  const sf = program.getSourceFile(e.archivo)
  const mod = checker.getSymbolAtLocation(sf)
  const exports = mod ? checker.getExportsOfModule(mod).sort((a, b) => a.name.localeCompare(b.name)) : []
  md += `\n## \`${e.nombre}\`\n\n`
  if (!exports.length) {
    md += '_(solo efectos: registra el global)_\n'
    continue
  }
  md += '```ts\n' + exports.map(declaracion).join('\n\n') + '\n```\n'
}

if (check) {
  const actual = existsSync(SALIDA) ? readFileSync(SALIDA, 'utf8') : ''
  if (actual !== md) {
    console.error(
      `La API pública cambió y ${SALIDA} no está al día.\nCorre \`npm run build && npm run api\`, revisa el diff y súbelo con tu cambio.`,
    )
    process.exit(1)
  }
  console.log('✓ La API pública coincide con', SALIDA)
} else {
  mkdirSync('api', { recursive: true })
  writeFileSync(SALIDA, md)
  console.log('✓ Reporte escrito en', SALIDA)
}
