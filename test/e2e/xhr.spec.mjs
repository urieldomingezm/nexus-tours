// Modo práctica sobre XMLHttpRequest: XHR a pelo y axios REAL.
import { test, ok, eq, BASE } from './utilidades.mjs'

test('modo práctica con XMLHttpRequest y axios', async ({ nuevoContexto, vigilar }) => {
  const p = await (await nuevoContexto()).newPage()
  vigilar(p)
  await p.goto(BASE + 'xhr.html')
  await p.waitForFunction(() => window.ready, null, { timeout: 30000 })

  const proto = await p.evaluate(() => XMLHttpRequest.prototype.send.toString())
  await p.evaluate(() => {
    window.t = mk()
    return t.start()
  })
  ok(
    (await p.evaluate(() => XMLHttpRequest.prototype.send.toString() !== 'x')) &&
      (await p.evaluate(() => XMLHttpRequest.prototype.send.toString())) !== proto,
    'con el tour, XMLHttpRequest queda parcheado',
  )

  const xhr = (method, url, body, type = '') =>
    p.evaluate(
      ([m, u, b, t]) =>
        new Promise((res) => {
          const x = new XMLHttpRequest()
          const ev = []
          x.responseType = t
          x.onreadystatechange = () => ev.push('rs' + x.readyState)
          x.onload = () => ev.push('load')
          x.onloadend = () => {
            ev.push('end')
            res({
              s: x.status,
              text: t === '' ? x.responseText : null,
              resp: x.response,
              ct: x.getResponseHeader('content-type'),
              all: x.getAllResponseHeaders(),
              url: x.responseURL,
              ev,
            })
          }
          x.open(m, u)
          if (b) x.setRequestHeader('content-type', 'application/json')
          x.send(b)
        }),
      [method, url, body, type],
    )

  await test.step('XHR a pelo', async () => {
    const g = await xhr('GET', '/api/clients')
    eq(JSON.parse(g.text).length, 2, 'GET colección vía XHR: filas de ejemplo')
    ok(g.s === 200 && g.ct === 'application/json' && g.all.includes('x-practice-mode: 1'), 'status 200 + cabeceras de respuesta')
    ok(g.url.endsWith('/api/clients'), 'responseURL')
    ok(
      g.ev.includes('rs2') && g.ev.includes('rs4') && g.ev.includes('load') && g.ev.at(-1) === 'end',
      'eventos readystatechange 2/4, load y loadend en orden',
    )
    eq((await xhr('GET', '/api/clients', undefined, 'json')).resp[0].name, 'Ana', 'responseType json')
    eq((await xhr('GET', '/api/ping')).text, '{"pong":true}', 'ruta personalizada vía XHR')
    const post = await xhr('POST', '/api/clients', JSON.stringify({ name: 'Zed' }))
    ok(post.s === 201 && JSON.parse(post.text).id === 3, 'POST vía XHR crea con id autoincremental')
    eq(JSON.parse((await xhr('GET', '/api/clients')).text).length, 3, '…y el siguiente GET lo ve')
    ok((await xhr('GET', '/api/clients/99')).s === 404, '404 en id inexistente')
    const bl = await xhr('DELETE', '/api/other/1')
    ok(bl.s === 403 && JSON.parse(bl.text).error === 'practice-mode', 'escritura sin ruta: bloqueada con 403')
    ok((await p.evaluate(() => events)).includes('blocked:DELETE'), 'onBlocked también para XHR')
  })
  await test.step('abort antes de la respuesta', async () => {
    const ab = await p.evaluate(
      () =>
        new Promise((res) => {
          const x = new XMLHttpRequest()
          const ev = []
          x.onabort = () => ev.push('abort')
          x.onload = () => ev.push('load')
          x.onloadend = () => {
            ev.push('end')
            res(ev)
          }
          x.open('GET', '/api/clients')
          x.send()
          x.abort()
        }),
    )
    eq(ab, ['abort', 'end'], 'abort() cancela sin disparar load')
  })
  await test.step('axios real', async () => {
    eq(
      await p.evaluate(async () => (await axios.get('/api/clients')).data.map((c) => c.name)),
      ['Ana', 'Bruno', 'Zed'],
      'axios.get devuelve los datos de práctica',
    )
    eq(
      await p.evaluate(async () => (await axios.post('/api/clients', { name: 'Eva' })).data),
      { name: 'Eva', id: 4 },
      'axios.post con cuerpo JSON',
    )
    eq(await p.evaluate(async () => (await axios.patch('/api/clients/1', { name: 'Ana B' })).data), { id: 1, name: 'Ana B' }, 'axios.patch')
    eq(await p.evaluate(async () => (await axios.delete('/api/clients/2')).status), 204, 'axios.delete → 204')
    eq(
      await p.evaluate(async () => axios.get('/api/clients/99').catch((e) => e.response.status)),
      404,
      'axios: el 404 llega como error con response',
    )
    eq(
      await p.evaluate(async () => axios.post('/api/other', {}).catch((e) => e.response.data.error)),
      'practice-mode',
      'axios: escritura bloqueada',
    )
    eq(
      await p.evaluate(async () => (await axios.get('/api/clients', { params: { name: 'Ana B' } })).data.length),
      1,
      'axios con params → filtro por query',
    )
    eq(await p.evaluate(async () => (await axios.get('/xhr.html')).status), 200, 'una GET que ninguna ruta atiende pasa al servidor real')
  })
  await test.step('fin del tour', async () => {
    await p.evaluate(() => t.stop?.() ?? t.finish?.())
    await p.waitForTimeout(100)
    ok((await p.evaluate(() => XMLHttpRequest.prototype.send.toString())) === proto, 'al terminar el tour XMLHttpRequest se restaura')
    ok(
      await p.evaluate(async () => !(await axios.get('/api/clients')).headers['x-practice-mode']),
      'sin tour: la petición vuelve a ir al servidor real (sin cabecera de práctica)',
    )
  })
})
