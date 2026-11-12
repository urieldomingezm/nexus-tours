import { describe, expect, it } from 'vitest'
// @ts-expect-error script .mjs sin tipos
import { moverCambios, notasDe, siguiente } from '../../scripts/nueva-version.mjs'

const CL = `# Cambios

## [Sin publicar]

### Corregido

- Arreglo uno.

## [0.5.0] - 2026-11-12

### Agregado

- Cosa vieja.
`

describe('nueva-version', () => {
  it('calcula patch, minor, major y números exactos', () => {
    expect(siguiente('0.5.0', 'patch')).toBe('0.5.1')
    expect(siguiente('0.5.3', 'minor')).toBe('0.6.0')
    expect(siguiente('0.5.3', 'major')).toBe('1.0.0')
    expect(siguiente('0.5.0', '0.7.2')).toBe('0.7.2')
  })

  it('rechaza lo que no es una versión mayor o no es X.Y.Z', () => {
    expect(() => siguiente('0.5.0', '0.5.0')).toThrow(/no es mayor/)
    expect(() => siguiente('0.5.0', '0.4.9')).toThrow(/no es mayor/)
    expect(() => siguiente('0.5.0', 'grande')).toThrow(/patch, minor, major/)
    expect(() => siguiente('v1', 'patch')).toThrow(/no es X.Y.Z/)
  })

  it('mueve «Sin publicar» a la versión nueva con fecha y deja una sección vacía arriba', () => {
    const r = moverCambios(CL, '0.5.1', '2026-11-13')
    expect(r).toContain('## [Sin publicar]\n\n## [0.5.1] - 2026-11-13\n\n### Corregido\n\n- Arreglo uno.\n\n## [0.5.0] - 2026-11-12')
    expect(r.match(/## \[Sin publicar\]/g)).toHaveLength(1)
    expect(r.endsWith('- Cosa vieja.\n')).toBe(true)
  })

  it('no sube la versión si «Sin publicar» está vacío o no existe', () => {
    expect(() => moverCambios('# Cambios\n\n## [Sin publicar]\n\n## [0.5.0] - 2026-11-12\n\n- x\n', '0.5.1', 'f')).toThrow(/vacío/)
    expect(() => moverCambios('# Cambios\n', '0.5.1', 'f')).toThrow(/Sin publicar/)
  })

  it('notasDe devuelve solo el texto de esa versión', () => {
    const r = moverCambios(CL, '0.5.1', '2026-11-13')
    expect(notasDe(r, '0.5.1')).toBe('### Corregido\n\n- Arreglo uno.')
    expect(notasDe(r, '0.5.0')).toBe('### Agregado\n\n- Cosa vieja.')
    expect(notasDe(r, '9.9.9')).toBe('')
  })
})
