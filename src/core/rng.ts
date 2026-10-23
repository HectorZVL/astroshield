// Generador pseudoaleatorio con semilla (mulberry32).
// Por qué no Math.random(): no admite semilla, y sin semilla ningún
// experimento sería reproducible. Con la misma semilla, el algoritmo
// produce exactamente la misma secuencia y, por lo tanto, el mismo resultado.

export interface Rng {
  /** Uniforme en [0, 1). */
  siguiente(): number;
  /** Uniforme en [a, b). */
  rango(a: number, b: number): number;
  /** Entero uniforme en [0, n). */
  entero(n: number): number;
  /** Normal estándar N(0, 1) por Box-Muller. */
  normal(): number;
  /** true con probabilidad p. */
  bernoulli(p: number): boolean;
}

export function crearRng(semilla: number): Rng {
  // Se fuerza a entero sin signo de 32 bits; semillas iguales -> secuencias iguales.
  let estado = semilla >>> 0;
  let normalGuardada: number | null = null;

  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    siguiente,
    rango: (a, b) => a + (b - a) * siguiente(),
    entero: (n) => Math.floor(siguiente() * n),
    normal: () => {
      // Box-Muller produce dos normales; se guarda la segunda para no desperdiciarla.
      if (normalGuardada !== null) {
        const v = normalGuardada;
        normalGuardada = null;
        return v;
      }
      let u = 0;
      while (u === 0) u = siguiente(); // evita log(0)
      const v = siguiente();
      const r = Math.sqrt(-2 * Math.log(u));
      normalGuardada = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
    bernoulli: (p) => siguiente() < p,
  };
}
