# Primeros pasos

Cinco minutos: instalar, lanzar tu primer tour, hacer que espere a un modal y, si quieres, dejar que la gente practique con datos de ejemplo. No necesitas leer la guía completa para empezar; el último apartado te dice dónde buscar lo que te falte.

## 1. Instalar

```bash
npm i nexus-tours
```

Sin bundler (WordPress, HTML estático, PHP), con un `<script>` desde un CDN, también sirve: ver la [guía](https://urieldomingezm.github.io/nexus-tours/guia.html#1-instalación).

## 2. Tu primer tour

```ts
import { Tour } from 'nexus-tours'

new Tour({
  steps: [
    { element: '#nuevo-cliente', title: 'Crea un cliente', description: 'Todo empieza aquí.' },
    { element: '#tabla', title: 'Tu lista', description: 'Aquí aparecen.' },
  ],
}).start()
```

Cada paso apunta a un elemento con un selector de CSS y lo resalta. Se recorre con _Siguiente_ y _Atrás_, con las flechas del teclado o deslizando en el celular; Esc lo cierra. Un paso **sin** `element` es una tarjeta centrada, ideal para dar la bienvenida.

## 3. Un tour que espera al modal

Este es el caso para el que existe la librería: el elemento que quieres señalar vive dentro de un modal que todavía no se ha abierto.

```ts
new Tour({
  steps: [
    { element: '#nuevo-cliente', title: 'Crea un cliente' },
    {
      before: () => abrirModal(), // el tour espera a que #nombre exista y se vea
      element: '#nombre',
      title: 'Ponle nombre',
    },
    { element: '#guardar', title: 'Guarda', after: () => cerrarModal() },
  ],
}).start()
```

El tour se monta **dentro** del modal abierto para seguir siendo clicable, aunque la página quede inerte detrás. Si el elemento nunca aparece, el paso se omite (o detiene el tour con `onMissing: 'stop'`). Si no quieres escribir funciones, `beforeClick: '#btn-nuevo'` y `afterClick: '#modal .btn-close'` hacen clic en esos botones por ti.

## 4. Que se vea como tu página

```ts
import { themes, autoTheme } from 'nexus-tours/themes'

new Tour({ steps, theme: autoTheme() }) // claro u oscuro, según el sistema
new Tour({ steps, theme: themes.bootstrap }) // lee tus variables de Bootstrap
new Tour({ steps, theme: { ...themes.ocean, accent: '#f43f5e' } }) // cualquier tema, con tu color
```

Hay temas para Bootstrap, Tailwind, shadcn, daisyUI, Vuetify, MUI y SweetAlert2, que siguen el modo claro u oscuro de tu framework. El tour vive en un _shadow root_: tu CSS no lo rompe y el suyo no toca tu página.

## 5. Dejar que la gente practique

Con el modo práctica, las peticiones se responden desde memoria con datos de ejemplo y las escrituras reales **nunca salen del navegador** mientras dura el tour.

```ts
import { createFixtures, fake } from 'nexus-tours/fixtures'

new Tour({
  steps,
  practice: {
    data: createFixtures({ clientes: { count: 6, fields: { id: fake.id(), nombre: fake.name() } } }, { seed: 1 }),
    rest: { clientes: '/api/clientes' },
    onStart: () => recargarClientes(), // tu interfaz pide ahora los datos de ejemplo
    onEnd: () => recargarClientes(), // y los reales cuando termina
  },
}).start()
```

Se activa una píldora «Modo práctica» para que se note. Para que ni siquiera las lecturas lleguen al servidor real, agrega `strict: true`.

## 6. ¿Y ahora qué?

| Si necesitas…                         | Ve a                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Modales y contenido animado           | [Guía 4.1](https://urieldomingezm.github.io/nexus-tours/guia.html#41-modales-y-contenido-animado)                        |
| Temas, fuentes y tu propio CSS        | [Guía 4.2](https://urieldomingezm.github.io/nexus-tours/guia.html#42-apariencia-tu-fuente-tu-css-temas)                  |
| Recordar el avance entre visitas      | [Guía 4.6](https://urieldomingezm.github.io/nexus-tours/guia.html#46-recordar-el-progreso)                               |
| Una lista de primeros pasos           | [Guía 4.10](https://urieldomingezm.github.io/nexus-tours/guia.html#410-checklist-de-primeros-pasos)                      |
| Vue o React                           | [Guía 4.12](https://urieldomingezm.github.io/nexus-tours/guia.html#412-vue-y-react)                                      |
| Bootstrap, Tailwind y otros           | [Guía 4.16](https://urieldomingezm.github.io/nexus-tours/guia.html#416-bootstrap-tailwind-y-otros-frameworks)            |
| Ver todo funcionando                  | [Demo](https://urieldomingezm.github.io/nexus-tours/demo.html) y [Pruebas](https://urieldomingezm.github.io/nexus-tours/pruebas.html) |
| Cada opción y método                  | [API](https://urieldomingezm.github.io/nexus-tours/api/index.html)                                                       |
