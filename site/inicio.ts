import './comun'
import { Tour } from 'nexus-tours'
import { autoTheme } from 'nexus-tours/themes'

// Cuánta gente la usa: descargas de la última semana según npm. Si no responde, la cifra queda en «—» y el enlace lleva a npm.
void (async () => {
  try {
    const r = await fetch('https://api.npmjs.org/downloads/point/last-week/nexus-tours')
    const { downloads } = (await r.json()) as { downloads?: number }
    if (typeof downloads === 'number') document.getElementById('n-descargas')!.textContent = new Intl.NumberFormat('es-MX').format(downloads)
  } catch {
    /* sin red o npm no responde: se queda el guion */
  }
})()

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
