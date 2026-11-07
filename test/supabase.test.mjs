// Adaptador Supabase del modo práctica, probado con el cliente REAL @supabase/supabase-js.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = 5198
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
const base = `http://localhost:${PORT}/`
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(base)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 250))
}
let fallos = 0
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ FALLO ') + m); if (!c) fallos++ }
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : `  → ${JSON.stringify(a)}`))
const browser = await chromium.launch()

try {
  const p = await (await browser.newContext()).newPage()
  p.on('pageerror', (e) => { console.log('pageerror', e.message); fallos++ })
  await p.goto(base + 'supabase.html')
  await p.waitForFunction(() => window.ready, null, { timeout: 30000 })

  // antes del tour no se intercepta nada: el host no existe → error de red
  const antes = await p.evaluate(async () => { const r = await sbLive.from('clients').select('*'); return { n: r.data?.length ?? null, err: !!r.error } })
  ok(antes.n === null && antes.err, 'sin tour: la petición va al host real (aquí falla: no existe)')

  await p.evaluate(() => { window.t = mk(); return t.start() })
  const q = (code) => p.evaluate(`(async () => { const sb = sbLive; ${code} })()`)

  // ---- el cliente creado ANTES del tour con fetch por defecto
  const def = await p.evaluate(async () => { const r = await sbDefault.from('clients').select('id'); return { n: r.data?.length ?? null, err: r.error?.message ?? null } })
  console.log('  (info) cliente con fetch por defecto, creado antes del tour →', JSON.stringify(def))

  // ---- lectura
  eq(await q(`const r = await sb.from('clients').select('*'); return r.data.length`), 4, 'select * devuelve las 4 filas de ejemplo')
  eq(await q(`const r = await sb.from('clients').select('name').eq('status','active'); return r.data`), [{ name: 'Ana Pérez' }, { name: 'Carla Ruiz' }], 'eq + select de columnas')
  eq(await q(`const r = await sb.from('clients').select('id').neq('status','active').order('id'); return r.data.map(x=>x.id)`), [2, 4], 'neq')
  eq(await q(`const r = await sb.from('clients').select('id').gt('age',25).order('id'); return r.data.map(x=>x.id)`), [1, 3], 'gt ignora nulos')
  eq(await q(`const r = await sb.from('clients').select('id').gte('age',25).lte('age',30).order('id'); return r.data.map(x=>x.id)`), [1, 2], 'gte + lte en la misma columna')
  eq(await q(`const r = await sb.from('clients').select('id').in('id',[1,3,9]).order('id'); return r.data.map(x=>x.id)`), [1, 3], 'in')
  eq(await q(`const r = await sb.from('clients').select('id').ilike('name','%PÉREZ%'); return r.data.map(x=>x.id)`), [1], 'ilike')
  eq(await q(`const r = await sb.from('clients').select('id').like('email','%@y.com').order('id'); return r.data.map(x=>x.id)`), [3, 4], 'like')
  eq(await q(`const r = await sb.from('clients').select('id').is('deleted_at', null).order('id'); return r.data.map(x=>x.id)`), [1, 2, 4], 'is null')
  eq(await q(`const r = await sb.from('clients').select('id').not('status','eq','active').order('id'); return r.data.map(x=>x.id)`), [2, 4], 'not.eq')
  eq(await q(`const r = await sb.from('clients').select('id').or('status.eq.pending,age.gt.40').order('id'); return r.data.map(x=>x.id)`), [2, 3], 'or(...)')
  eq(await q(`const r = await sb.from('clients').select('id').order('age',{ascending:false}); return r.data.map(x=>x.id)`), [4, 3, 1, 2], 'order desc: nulos primero (como Postgres)')
  eq(await q(`const r = await sb.from('clients').select('id').order('age',{ascending:true}); return r.data.map(x=>x.id)`), [2, 1, 3, 4], 'order asc: nulos al final')
  eq(await q(`const r = await sb.from('clients').select('id').order('id').limit(2); return r.data.map(x=>x.id)`), [1, 2], 'limit')
  eq(await q(`const r = await sb.from('clients').select('id').order('id').range(1,2); return r.data.map(x=>x.id)`), [2, 3], 'range (paginación)')
  eq(await q(`const r = await sb.from('clients').select('id',{count:'exact'}).order('id').range(0,1); return [r.data.length, r.count]`), [2, 4], 'count exact con página')
  eq(await q(`const r = await sb.from('clients').select('*',{count:'exact',head:true}).eq('status','active'); return [r.data, r.count, r.error]`), [null, 2, null], 'head + count (solo contar)')
  eq(await q(`const r = await sb.from('clients').select('name').eq('id',2).single(); return r.data`), { name: 'Bruno Díaz' }, 'single()')
  eq(await q(`const r = await sb.from('clients').select('*').single(); return [r.data, r.error.code]`), [null, 'PGRST116'], 'single() con varias filas → PGRST116')
  eq(await q(`const r = await sb.from('clients').select('*').eq('id',99).maybeSingle(); return [r.data, r.error]`), [null, null], 'maybeSingle() sin resultado → null sin error')

  // ---- joins
  eq(await q(`const r = await sb.from('orders').select('id, clients(name)').order('id'); return r.data`), [{ id: 10, clients: { name: 'Ana Pérez' } }, { id: 11, clients: { name: 'Ana Pérez' } }, { id: 12, clients: { name: 'Bruno Díaz' } }], 'join muchos-a-uno')
  eq(await q(`const r = await sb.from('clients').select('id, orders(total)').eq('id',1).single(); return r.data`), { id: 1, orders: [{ total: 100 }, { total: 50 }] }, 'join uno-a-muchos')
  eq(await q(`const r = await sb.from('clients').select('id, orders!inner(total)').order('id'); return r.data.map(x=>x.id)`), [1, 2], '!inner descarta los que no tienen relación')
  eq(await q(`const r = await sb.from('clients').select('id, facturas(x)'); return r.error.code`), 'PGRST200', 'relación sin declarar → error claro')

  // ---- escritura
  eq(await q(`const r = await sb.from('clients').insert({name:'Eli', status:'new'}).select().single(); return [r.data.id, r.data.name]`), [5, 'Eli'], 'insert + select: id autoincremental')
  eq(await q(`const r = await sb.from('clients').insert({name:'Fer'}); const c = await sb.from('clients').select('id',{count:'exact',head:true}); return [r.error, r.status, c.count]`), [null, 201, 6], 'insert sin select (minimal) y se ve en la lista')
  eq(await q(`const r = await sb.from('clients').insert([{name:'G1'},{name:'G2'}]).select('id'); return r.data.map(x=>x.id)`), [7, 8], 'insert múltiple')
  eq(await q(`const r = await sb.from('clients').insert({id:1, name:'Dup'}); return r.error.code`), '23505', 'id duplicado → 23505')
  eq(await q(`const r = await sb.from('clients').update({status:'vip'}).eq('id',1).select().single(); return r.data.status`), 'vip', 'update + select')
  eq(await q(`const r = await sb.from('clients').update({age:99}).in('id',[2,3]); const c = await sb.from('clients').select('age').in('id',[2,3]).order('id'); return [r.status, c.data]`), [204, [{ age: 99 }, { age: 99 }]], 'update sin select (204)')
  eq(await q(`const r = await sb.from('clients').upsert({id:1, name:'Ana 2'}).select().single(); return r.data`), { id: 1, name: 'Ana 2', status: 'vip', age: 30, email: 'ana@x.com', deleted_at: null }, 'upsert combina con la fila existente')
  eq(await q(`const r = await sb.from('clients').upsert({id:50, name:'Nuevo'}).select('id').single(); return r.data.id`), 50, 'upsert inserta si no existe')
  eq(await q(`const r = await sb.from('clients').delete().eq('id',50).select('id'); const c = await sb.from('clients').select('id').eq('id',50); return [r.data, c.data]`), [[{ id: 50 }], []], 'delete + select')

  // ---- rpc y funciones
  eq(await q(`const r = await sb.rpc('total_pedidos'); return r.data`), 225, 'rpc con handler')
  eq(await q(`const r = await sb.rpc('echo',{a:1}); return r.data`), { a: 1 }, 'rpc recibe los argumentos')
  eq(await q(`const r = await sb.rpc('borrar_todo'); return [r.status, r.error?.code ?? r.error?.message?.slice(0,12)]`).then((x) => x[0]), 403, 'rpc sin handler: bloqueada (podría escribir)')
  eq(await q(`const r = await sb.functions.invoke('hola',{body:{nombre:'Uriel'}}); return r.data`), { saludo: 'hola Uriel' }, 'edge function con handler')

  // ---- seguridad
  eq(await q(`const r = await sb.from('tabla_real').insert({a:1}); return r.status`), 403, 'escritura en tabla no sembrada: bloqueada')
  const real = await q(`const r = await sb.from('tabla_real').select('*'); return !!r.error`)
  ok(real === true, 'lectura de tabla no sembrada pasa al backend real (aquí falla: no existe)')

  // ---- aislamiento: al terminar, fetch vuelve y los datos no se contaminan
  await p.evaluate(() => t.destroy())
  ok(await p.evaluate(() => window.fetch.toString().includes('[native code]')), 'al terminar el tour, fetch vuelve a ser el original')
  await p.evaluate(() => { window.t2 = mk(); return t2.start() })
  eq(await q(`const r = await sb.from('clients').select('id',{count:'exact',head:true}); return r.count`), 4, 'un tour nuevo empieza con los datos originales (nada se guardó)')
  await p.evaluate(() => t2.destroy())
} catch (e) {
  console.log('ERROR', e)
  fallos++
} finally {
  await browser.close()
  try { process.kill(-server.pid) } catch {}
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
