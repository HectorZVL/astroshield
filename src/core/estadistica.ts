// Estadística descriptiva para comparar ejecuciones.

export interface Resumen {
  n: number;
  media: number;
  /** Desviación estándar muestral (n − 1). */
  desviacion: number;
  minimo: number;
  maximo: number;
  mediana: number;
}

export function resumir(valores: number[]): Resumen {
  const n = valores.length;
  if (n === 0) return { n: 0, media: NaN, desviacion: NaN, minimo: NaN, maximo: NaN, mediana: NaN };
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const varianza = n > 1 ? valores.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1) : 0;
  const orden = [...valores].sort((a, b) => a - b);
  const mediana = n % 2 ? orden[(n - 1) / 2] : (orden[n / 2 - 1] + orden[n / 2]) / 2;
  return { n, media, desviacion: Math.sqrt(varianza), minimo: orden[0], maximo: orden[n - 1], mediana };
}

/**
 * Prueba U de Mann-Whitney (aproximación normal, con corrección por empates).
 * Se usa para afirmar con evidencia que un método es mejor que otro sin
 * suponer que los resultados siguen una distribución normal.
 * Devuelve el valor p bilateral.
 */
export function mannWhitney(a: number[], b: number[]): { u: number; z: number; p: number } {
  const todos = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  const rangos = new Array<number>(todos.length);
  let correccionEmpates = 0;
  for (let i = 0; i < todos.length; ) {
    let j = i;
    while (j + 1 < todos.length && todos[j + 1].v === todos[i].v) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) rangos[k] = r;
    const t = j - i + 1;
    correccionEmpates += t ** 3 - t;
    i = j + 1;
  }
  const n1 = a.length;
  const n2 = b.length;
  const r1 = todos.reduce((s, x, i) => (x.g === 0 ? s + rangos[i] : s), 0);
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const N = n1 + n2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * (N + 1 - correccionEmpates / (N * (N - 1))));
  if (sigma === 0) return { u, z: 0, p: 1 };
  const z = (u - mu) / sigma;
  return { u, z, p: Math.min(1, 2 * (1 - normalCDF(Math.abs(z)))) };
}

/** Función de distribución normal estándar (aproximación de Abramowitz-Stegun 7.1.26). */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return 0.5 * (1 + y);
}
