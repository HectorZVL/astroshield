// ÚNICO lugar donde se definen colores. La escena 3D los usa directamente
// y el CSS los recibe como variables (--fondo, --cian, …), así que cambiar
// la paleta aquí cambia toda la aplicación.

export const paleta = {
  fondo: '#04060f',
  cian: '#22d3ee',
  violeta: '#8b5cf6',
  ambar: '#fbbf24',
  verde: '#34d399',
  rojo: '#fb3b5c',
  texto: '#e6f1ff',
  textoTenue: '#8aa0bf',
  panel: '#0a1024',
  borde: '#1e2a4a',
  // Colores del globo
  oceano: '#050b1d',
  oceanoClaro: '#0a1838',
  tierra: '#0d2142',
  puntosTierra: '#1d4b7a',
  costa: '#22d3ee',
  reticula: '#173058',
  atmosfera: '#3aa0ff',
  estrellas: '#cfe3ff',
  // Escena: luces y materiales del satélite
  luzAmbiente: '#9fb6ff',
  luzSol: '#ffffff',
  metalSatelite: '#c9d6ea',
  panelSatelite: '#0b1c3a',
} as const;

/**
 * Colores técnicos: no son parte del estilo sino máscaras (negro = no emite,
 * blanco = multiplicador neutro). Cambiarlos rompe el brillo; se dejan aquí
 * para que no haya ningún color escrito fuera de este archivo.
 */
export const tecnicos = { negro: '#000000', blanco: '#ffffff' } as const;

/** '#rrggbb' + alfa -> 'rgba(r,g,b,a)'. */
export function conAlfa(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type ColorTema = keyof typeof paleta;

/** Significado de cada color en la escena (la leyenda se genera de aquí). */
export const semantica = {
  satelite: paleta.cian,
  huella: paleta.cian,
  sateliteInicial: paleta.violeta,
  regionCubierta: paleta.verde,
  regionParcial: paleta.ambar,
  regionNoCubierta: paleta.rojo,
  desechos: paleta.rojo,
  objetoOcupado: paleta.ambar,
  rayo: paleta.verde,
  cota: paleta.ambar,
  mejor: paleta.cian,
  media: paleta.violeta,
  peor: paleta.rojo,
  validos: paleta.verde,
} as const;

/** Copia la paleta a variables CSS en :root. */
export function aplicarTemaCSS(raiz: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(paleta)) raiz.style.setProperty(`--${k}`, v);
}
