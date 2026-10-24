// ÚNICO lugar donde se definen colores, tipografía y tiempos de animación.
// La escena 3D y la gráfica los usan directamente y el CSS los recibe como
// variables (--fondo, --acento, --fuente-ui, …): cambiar algo aquí cambia
// toda la aplicación.
//
// Dirección visual «control de misión cálido»: carbón cálido en lugar de azul
// marino, texto color hueso, un solo acento (sol) para lo que se puede tocar y
// colores con UN solo significado cada uno (ver `semantica`).

export const paleta = {
  // Superficies (de más profunda a más elevada)
  fondo: '#0f1114',
  panel: '#181b20',
  panelAlto: '#21252b',
  borde: '#2d3239',
  bordeFuerte: '#3c424a',
  // Texto
  texto: '#eee8df',
  textoSuave: '#c9c2b7',
  textoTenue: '#968f85',
  // Acento: botones, foco, selección y la luz de los satélites
  acento: '#f28c3a',
  acentoSuave: '#f6b57c',
  // Estados de región (y del chip)
  verdeAgua: '#3fb39b',
  miel: '#e6b450',
  coral: '#e8705f',
  // Restricciones y comparación
  frambuesa: '#c4506a',
  lavanda: '#a99be0',
  pizarra: '#7fa7d9',
  // Neutros cálidos para datos secundarios
  hueso: '#f3ece2',
  grisCalido: '#7a736a',
  // Globo
  oceanoProfundo: '#0e1f2a',
  oceano: '#173242',
  oceanoSomero: '#2f6470',
  tierraHielo: '#c9c6bd',
  tierraTemplada: '#56654a',
  tierraArida: '#8e7c58',
  tierraTropical: '#47643f',
  costa: '#e9dfcf',
  reticula: '#e9dfcf',
  atmosferaDia: '#b9d3e3',
  atmosferaOcaso: '#f2a15f',
  atmosferaNoche: '#3d5f7a',
  estrellas: '#f1e6d6',
  // Escena: luces y materiales del satélite
  luzAmbiente: '#cfd6dc',
  luzCielo: '#f4e3cc',
  luzSuelo: '#1d2a33',
  luzSol: '#fff1de',
  metalSatelite: '#d8d0c4',
  panelSatelite: '#2a3a4a',
} as const;

/**
 * Colores técnicos: no son parte del estilo sino máscaras (negro = no emite,
 * blanco = multiplicador neutro). Se dejan aquí para que no haya ningún color
 * escrito fuera de este archivo.
 */
export const tecnicos = { negro: '#000000', blanco: '#ffffff' } as const;

/** Tipografía: Manrope para toda la interfaz; IBM Plex Mono solo para coordenadas. */
export const tipografia = {
  ui: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', monospace",
  /** Tamaños base en px (el CSS los recibe como --texto-*). */
  tamanos: { pequeno: 12, base: 13.5, grande: 16, titulo: 18, cifra: 22 },
} as const;

/** Duraciones de las animaciones decorativas (ms). Con prefers-reduced-motion todo es instantáneo. */
export const duraciones = { rapida: 160, media: 320, transicion: 900, vuelo: 1300, entrada: 2600 } as const;

/** '#rrggbb' + alfa -> 'rgba(r,g,b,a)'. */
export function conAlfa(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type ColorTema = keyof typeof paleta;

/**
 * Significado de cada color en la escena (la leyenda se genera de aquí).
 * Regla: un color = un significado. La prioridad de las regiones NO usa color
 * (se distingue por peso tipográfico) para no confundirse con «no cubierta».
 */
export const semantica = {
  // Constelación: luz cálida
  satelite: paleta.hueso,
  luzSatelite: paleta.acento,
  huella: paleta.hueso,
  sateliteInicial: paleta.pizarra,
  // Estado de cada región según el modelo
  regionCubierta: paleta.verdeAgua,
  regionParcial: paleta.miel,
  regionNoCubierta: paleta.coral,
  rayo: paleta.verdeAgua,
  // Restricciones
  desechos: paleta.frambuesa,
  objetoOcupado: paleta.lavanda,
  inactivo: paleta.grisCalido,
  // Gráfica de evolución
  mejor: paleta.acento,
  media: paleta.textoSuave,
  peor: paleta.grisCalido,
  validos: paleta.verdeAgua,
  cota: paleta.miel,
  // Chip de estado
  valida: paleta.verdeAgua,
  invalida: paleta.coral,
  inviable: paleta.miel,
} as const;

/** Copia paleta, tipografía y duraciones a variables CSS en :root. */
export function aplicarTemaCSS(raiz: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(paleta)) raiz.style.setProperty(`--${k}`, v);
  for (const [k, v] of Object.entries(semantica)) raiz.style.setProperty(`--s-${k}`, v);
  raiz.style.setProperty('--fuente-ui', tipografia.ui);
  raiz.style.setProperty('--fuente-mono', tipografia.mono);
  for (const [k, v] of Object.entries(tipografia.tamanos)) raiz.style.setProperty(`--texto-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(duraciones)) raiz.style.setProperty(`--dur-${k}`, `${v}ms`);
}
