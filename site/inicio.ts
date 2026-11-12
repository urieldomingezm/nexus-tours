import './comun'
import './mirala'
import { animarNumero } from './animaciones'
import { Tour } from 'nexus-tours'
import { autoTheme } from 'nexus-tours/themes'

// Cuánta gente la usa: descargas de la última semana según npm. Mientras llega la cifra se ve un esqueleto brillante;
// si npm no responde, la cifra queda en «—» y el enlace lleva a npm.
void (async () => {
  const cifra = document.getElementById('n-descargas')!
  cifra.classList.add('esqueleto')
  try {
    const r = await fetch('https://api.npmjs.org/downloads/point/last-week/nexus-tours')
    const { downloads } = (await r.json()) as { downloads?: number }
    cifra.classList.remove('esqueleto')
    if (typeof downloads === 'number') animarNumero(cifra, new Intl.NumberFormat('es-MX').format(downloads))
  } catch {
    /* sin red o npm no responde: se queda el guion */
    cifra.classList.remove('esqueleto')
  }
})()

// La insignia de versión se confirma con npm; sin respuesta, queda la versión con la que se construyó esta página.
void (async () => {
  try {
    const r = await fetch('https://registry.npmjs.org/nexus-tours/latest')
    const { version } = (await r.json()) as { version?: string }
    if (version && /^\d+\.\d+\.\d+/.test(version)) document.getElementById('i-version')!.textContent = `v${version}`
  } catch {
    /* se queda la versión de la construcción */
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
