import './comun'
import { Tour } from 'nexus-tours'
import { autoTheme } from 'nexus-tours/themes'

// Un tour real sobre esta misma página.
let tour: Tour | null = null
document.getElementById('b-tour')!.addEventListener('click', () => {
  tour?.destroy()
  tour = new Tour({
    theme: autoTheme(),
    steps: [
      { element: '#t-titulo', title: 'Esto es nexus-tours', description: 'Un tour guiado hecho con la propia librería, sin dependencias.' },
      { element: '#t-codigo', title: 'Se escribe así', description: 'Pasos con un elemento, un título y, si hace falta, qué hacer antes y después.', side: 'left' },
      { element: '#t-porque', title: 'Pensado para modales', description: 'Espera lo que tarda en aparecer, se monta dentro del diálogo y no choca con tu CSS.', side: 'top' },
      { element: '#modulos', title: 'Instala solo lo que usas', description: 'Cada pieza se importa por separado.', side: 'top' },
    ],
  })
  void tour.start()
})
