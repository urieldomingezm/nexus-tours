/**
 * Example-data generators for practice mode. Zero dependencies, seedable (same seed → same data),
 * Spanish and English. Plain functions: nothing here touches the DOM or the network.
 */
export type Locale = 'es' | 'en'

export interface GenContext {
  /** Seeded random number in [0, 1). */
  rng: () => number
  locale: Locale
  /** Position of the row being generated (0-based). */
  index: number
  /** Fields already generated for this row (in declaration order). */
  row: Record<string, unknown>
}
export type Generator<T = unknown> = (ctx: GenContext) => T

export interface TableSchema {
  count: number
  fields: Record<string, Generator | string | number | boolean | null>
}
export type Schema = Record<string, TableSchema>
export interface FixtureOptions {
  seed?: number
  locale?: Locale
}

// mulberry32: small, fast, good enough for example data
function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const D = {
  es: {
    first: [
      'Sofía',
      'Mateo',
      'Valentina',
      'Santiago',
      'Camila',
      'Diego',
      'Regina',
      'Emiliano',
      'Ximena',
      'Leonardo',
      'Daniela',
      'Sebastián',
      'Fernanda',
      'Andrés',
      'Renata',
      'Javier',
      'Paola',
      'Alejandro',
      'Mariana',
      'Gael',
    ],
    last: [
      'García',
      'Hernández',
      'López',
      'Martínez',
      'González',
      'Rodríguez',
      'Pérez',
      'Sánchez',
      'Ramírez',
      'Torres',
      'Flores',
      'Rivera',
      'Gómez',
      'Díaz',
      'Reyes',
      'Morales',
      'Cruz',
      'Ortiz',
      'Vargas',
      'Castillo',
    ],
    org: ['Soluciones', 'Grupo', 'Servicios', 'Comercial', 'Distribuidora', 'Industrias', 'Consultores'],
    orgEnd: ['del Norte', 'Delta', 'Integral', 'Azteca', 'Pacífico', 'Central', 'Monarca'],
    words: ['proyecto', 'cliente', 'reporte', 'entrega', 'pedido', 'servicio', 'factura', 'equipo', 'plan', 'revisión', 'avance', 'meta'],
  },
  en: {
    first: [
      'Olivia',
      'Liam',
      'Emma',
      'Noah',
      'Ava',
      'Ethan',
      'Mia',
      'Lucas',
      'Chloe',
      'Mason',
      'Grace',
      'Logan',
      'Zoe',
      'Owen',
      'Ruby',
      'Caleb',
      'Nora',
      'Jack',
      'Layla',
      'Henry',
    ],
    last: [
      'Smith',
      'Johnson',
      'Brown',
      'Taylor',
      'Miller',
      'Wilson',
      'Moore',
      'Clark',
      'Lewis',
      'Walker',
      'Hall',
      'Young',
      'King',
      'Wright',
      'Scott',
      'Green',
      'Baker',
      'Adams',
      'Turner',
      'Hill',
    ],
    org: ['Northwind', 'Blue', 'Summit', 'Bright', 'Pioneer', 'Atlas', 'Harbor'],
    orgEnd: ['Labs', 'Group', 'Systems', 'Partners', 'Works', 'Industries', 'Co.'],
    words: ['project', 'client', 'report', 'delivery', 'order', 'service', 'invoice', 'team', 'plan', 'review', 'progress', 'goal'],
  },
} as const

const pickFrom = <T>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')

/** Generators. Each returns a function you put in a table's `fields`. */
export const fake = {
  /** 1, 2, 3… per table. */
  id:
    (start = 1): Generator<number> =>
    (c) =>
      start + c.index,
  uuid: (): Generator<string> => (c) => {
    const h = () =>
      Math.floor(c.rng() * 0x10000)
        .toString(16)
        .padStart(4, '0')
    return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`
  },
  firstName: (): Generator<string> => (c) => pickFrom(c.rng, D[c.locale].first),
  lastName: (): Generator<string> => (c) => pickFrom(c.rng, D[c.locale].last),
  name: (): Generator<string> => (c) => `${pickFrom(c.rng, D[c.locale].first)} ${pickFrom(c.rng, D[c.locale].last)}`,
  company: (): Generator<string> => (c) => `${pickFrom(c.rng, D[c.locale].org)} ${pickFrom(c.rng, D[c.locale].orgEnd)}`,
  /** Email; pass `{ from: 'name' }` to derive it from a field generated earlier in the same row. */
  email:
    (opts: { from?: string; domain?: string } = {}): Generator<string> =>
    (c) => {
      const base =
        opts.from && typeof c.row[opts.from] === 'string' ? slug(c.row[opts.from] as string) : `user${Math.floor(c.rng() * 9000 + 1000)}`
      return `${base}@${opts.domain ?? 'example.com'}`
    },
  /** Reserved example numbers (never real people). */
  phone: (): Generator<string> => (c) =>
    `+52 55 ${String(5550 + Math.floor(c.rng() * 40)).padStart(4, '0')} ${String(Math.floor(c.rng() * 10000)).padStart(4, '0')}`,
  int:
    (min: number, max: number): Generator<number> =>
    (c) =>
      Math.floor(c.rng() * (max - min + 1)) + min,
  float:
    (min: number, max: number, decimals = 2): Generator<number> =>
    (c) =>
      Number((c.rng() * (max - min) + min).toFixed(decimals)),
  bool:
    (probability = 0.5): Generator<boolean> =>
    (c) =>
      c.rng() < probability,
  pick:
    <T>(list: readonly T[]): Generator<T> =>
    (c) =>
      pickFrom(c.rng, list),
  /** A few random words ("plan entrega revisión"). */
  words:
    (n = 3): Generator<string> =>
    (c) =>
      Array.from({ length: n }, () => pickFrom(c.rng, D[c.locale].words)).join(' '),
  /** ISO date (YYYY-MM-DD) within the last `past` days and/or next `future` days, relative to `now`. */
  date:
    (opts: { past?: number; future?: number; now?: Date } = {}): Generator<string> =>
    (c) => {
      const { past = 30, future = 0, now = new Date() } = opts
      const days = Math.floor(c.rng() * (past + future + 1)) - past
      const d = new Date(now.getTime() + days * 86400000)
      return d.toISOString().slice(0, 10)
    },
}

/** Builds the example data for every table in the schema. Constant values are copied as-is. */
export function createFixtures<S extends Schema>(schema: S, options: FixtureOptions = {}): { [K in keyof S]: Record<string, unknown>[] } {
  const locale = options.locale ?? 'es'
  const rng = makeRng(options.seed ?? 1)
  const out: Record<string, Record<string, unknown>[]> = {}
  for (const [table, def] of Object.entries(schema)) {
    out[table] = Array.from({ length: def.count }, (_, index) => {
      const row: Record<string, unknown> = {}
      for (const [field, gen] of Object.entries(def.fields)) {
        row[field] = typeof gen === 'function' ? gen({ rng, locale, index, row }) : gen
      }
      return row
    })
  }
  return out as { [K in keyof S]: Record<string, unknown>[] }
}
