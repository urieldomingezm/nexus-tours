import { describe, expect, it } from 'vitest'
import { createFixtures, fake } from '../../src/fixtures'

const esquema = {
  clientes: {
    count: 8,
    fields: {
      id: fake.id(),
      nombre: fake.name(),
      email: fake.email({ from: 'nombre', domain: 'demo.mx' }),
      monto: fake.int(10, 20),
      precio: fake.float(1, 2, 3),
      activo: fake.bool(1),
      estado: fake.pick(['A', 'B'] as const),
      fijo: 'x',
      nulo: null,
    },
  },
}

describe('createFixtures', () => {
  it('es determinista: misma semilla → mismos datos; otra semilla → otros', () => {
    const a = createFixtures(esquema, { seed: 3 })
    expect(createFixtures(esquema, { seed: 3 })).toEqual(a)
    expect(createFixtures(esquema, { seed: 4 })).not.toEqual(a)
  })

  it('respeta count y copia las constantes tal cual', () => {
    const { clientes } = createFixtures(esquema)
    expect(clientes).toHaveLength(8)
    for (const r of clientes) {
      expect(r.fijo).toBe('x')
      expect(r.nulo).toBeNull()
    }
  })

  it('cada generador respeta su rango', () => {
    const { clientes } = createFixtures(esquema, { seed: 9 })
    clientes.forEach((r, i) => {
      expect(r.id).toBe(i + 1)
      expect(r.monto).toBeGreaterThanOrEqual(10)
      expect(r.monto).toBeLessThanOrEqual(20)
      expect(Number.isInteger(r.monto)).toBe(true)
      expect(r.precio).toBeGreaterThanOrEqual(1)
      expect(r.precio).toBeLessThanOrEqual(2)
      expect(String(r.precio).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
      expect(r.activo).toBe(true)
      expect(['A', 'B']).toContain(r.estado)
    })
  })

  it('el email se deriva del nombre de la misma fila, sin acentos', () => {
    const { clientes } = createFixtures(esquema, { seed: 5 })
    for (const r of clientes) {
      const esperado = String(r.nombre)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
      expect(r.email).toBe(`${esperado}@demo.mx`)
    }
  })

  it('email sin `from` usa un usuario genérico y example.com', () => {
    const { t } = createFixtures({ t: { count: 3, fields: { e: fake.email() } } })
    for (const r of t) expect(r.e).toMatch(/^user\d{4}@example\.com$/)
  })

  it('locale en genera nombres en inglés', () => {
    const es = createFixtures({ t: { count: 20, fields: { n: fake.firstName() } } }, { locale: 'es' })
    const en = createFixtures({ t: { count: 20, fields: { n: fake.firstName() } } }, { locale: 'en' })
    expect(en.t.map((r) => r.n)).not.toEqual(es.t.map((r) => r.n))
    expect(en.t.map((r) => r.n)).toContain('Olivia')
  })

  it('uuid v4, teléfono reservado, palabras y fechas', () => {
    const ahora = new Date('2026-06-15T12:00:00Z')
    const { t } = createFixtures({
      t: {
        count: 30,
        fields: {
          u: fake.uuid(),
          tel: fake.phone(),
          w: fake.words(4),
          f: fake.date({ past: 10, future: 5, now: ahora }),
          id: fake.id(100),
          emp: fake.company(),
          ap: fake.lastName(),
        },
      },
    })
    for (const r of t) {
      expect(r.u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(r.tel).toMatch(/^\+52 55 55[5-8]\d \d{4}$/)
      expect(String(r.w).split(' ')).toHaveLength(4)
      const d = new Date(String(r.f)).getTime()
      expect(d).toBeGreaterThanOrEqual(new Date('2026-06-05').getTime())
      expect(d).toBeLessThanOrEqual(new Date('2026-06-20').getTime())
      expect(String(r.emp).split(' ').length).toBeGreaterThanOrEqual(2)
      expect(typeof r.ap).toBe('string')
    }
    expect(t[0]!.id).toBe(100)
  })
})
