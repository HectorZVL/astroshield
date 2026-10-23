// Algoritmo genético generacional con elitismo (docs/02-algoritmo.md).
// Toda la aleatoriedad sale de un único generador con semilla, en un orden
// fijo, por eso la misma semilla reproduce exactamente la misma ejecución.
import { comparar, estadoDeEjecucion } from './comparacion';
import { evaluar, preparar, type Contexto } from './evaluacion';
import { desplazarAleatorio, distancia, puntoAleatorio } from './geo';
import { crearRng, type Rng } from './rng';
import type {
  Configuracion,
  Escenario,
  Individuo,
  ParametrosAG,
  RegistroGeneracion,
  ResultadoEjecucion,
} from './tipos';

export const PARAMETROS_BASE: ParametrosAG = {
  poblacion: 80,
  generaciones: 150,
  torneo: 3,
  probCruce: 0.9,
  probMutacion: 0.25,
  sigmaMutacion: 6,
  probReinicio: 0.02,
  elitismo: 2,
  semilla: 42,
  alinearCruce: true,
};

export interface OpcionesEvolucion {
  /** Configuraciones que entran tal cual en la población inicial (arranque en caliente). */
  semillasIniciales?: Configuracion[];
}

const copiar = (c: Configuracion): Configuracion => c.map((s) => ({ lat: s.lat, lon: s.lon }));

// ---- Operadores ------------------------------------------------------------

export function configuracionAleatoria(n: number, rng: Rng): Configuracion {
  return Array.from({ length: n }, () => puntoAleatorio(rng));
}

/**
 * Emparejamiento voraz: para cada satélite de A, el satélite de B más cercano
 * todavía libre (se recorren todas las parejas de menor a mayor distancia).
 * Devuelve emparejamiento[i] = índice en B que corresponde al satélite i de A.
 */
export function emparejar(a: Configuracion, b: Configuracion): number[] {
  const parejas: Array<[number, number, number]> = [];
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) parejas.push([distancia(a[i], b[j]), i, j]);
  parejas.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
  const resultado = new Array<number>(a.length).fill(-1);
  const usadoB = new Array<boolean>(b.length).fill(false);
  let asignados = 0;
  for (const [, i, j] of parejas) {
    if (resultado[i] === -1 && !usadoB[j]) {
      resultado[i] = j;
      usadoB[j] = true;
      if (++asignados === a.length) break;
    }
  }
  return resultado;
}

/**
 * Cruce uniforme: cada satélite del hijo viene de A o de B con probabilidad 0.5.
 * Con `alinear`, el satélite i de A se cruza con su pareja más cercana en B,
 * de modo que se mezclan satélites que hacen el mismo trabajo.
 */
export function cruzar(a: Configuracion, b: Configuracion, rng: Rng, alinear: boolean): Configuracion {
  const pareja = alinear ? emparejar(a, b) : a.map((_, i) => i);
  return a.map((s, i) => {
    const o = rng.siguiente() < 0.5 ? s : b[pareja[i]];
    return { lat: o.lat, lon: o.lon };
  });
}

/** Mutación gaussiana sobre la esfera + mutación de reinicio (in situ). */
export function mutar(c: Configuracion, p: ParametrosAG, rng: Rng): void {
  for (let i = 0; i < c.length; i++) {
    if (rng.siguiente() < p.probReinicio) {
      c[i] = puntoAleatorio(rng);
    } else if (rng.siguiente() < p.probMutacion) {
      // |N(0, σ)|: casi siempre pasos cortos, a veces uno largo.
      c[i] = desplazarAleatorio(c[i], Math.abs(rng.normal()) * p.sigmaMutacion, rng);
    }
  }
}

/** Torneo de tamaño k con reemplazo; el ganador se decide con las reglas de Deb. */
function torneo(poblacion: Individuo[], k: number, rng: Rng): Individuo {
  let mejor = poblacion[rng.entero(poblacion.length)];
  for (let i = 1; i < k; i++) {
    const rival = poblacion[rng.entero(poblacion.length)];
    if (comparar(rival.eval, mejor.eval) < 0) mejor = rival;
  }
  return mejor;
}

// ---- Métricas ----------------------------------------------------------------

/**
 * Distancia entre dos configuraciones que no depende del orden de los
 * satélites: promedio de la distancia de cada satélite al más cercano de
 * la otra configuración (distancia de Chamfer simétrica), en grados.
 */
export function distanciaConfiguraciones(a: Configuracion, b: Configuracion): number {
  const lado = (x: Configuracion, y: Configuracion) =>
    x.reduce((s, p) => s + Math.min(...y.map((q) => distancia(p, q))), 0) / x.length;
  return (lado(a, b) + lado(b, a)) / 2;
}

/**
 * Diversidad de la población: Chamfer medio sobre las parejas (i, i+1..i+4).
 * Se usa un subconjunto fijo de parejas (no aleatorio, para no consumir el
 * generador) porque comparar todas las parejas cuesta 20 veces más.
 */
export function diversidad(poblacion: Individuo[]): number {
  const n = poblacion.length;
  if (n < 2) return 0;
  let suma = 0;
  let cuenta = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 1; k <= Math.min(4, n - 1); k++) {
      suma += distanciaConfiguraciones(poblacion[i].config, poblacion[(i + k) % n].config);
      cuenta++;
    }
  }
  return suma / cuenta;
}

function registrar(generacion: number, poblacion: Individuo[], mejor: Individuo): RegistroGeneracion {
  const fits = poblacion.map((x) => x.eval.fitness);
  const validos = poblacion.filter((x) => x.eval.valida);
  return {
    generacion,
    mejor: mejor.eval.fitness,
    media: fits.reduce((a, b) => a + b, 0) / fits.length,
    peor: Math.min(...fits),
    mediaValidos: validos.length ? validos.reduce((s, x) => s + x.eval.fitness, 0) / validos.length : NaN,
    validos: validos.length,
    diversidad: diversidad(poblacion),
    mejorValida: mejor.eval.valida,
    mejorViolacion: mejor.eval.violacionTotal,
    mejorCobertura: mejor.eval.cobertura,
    mejorRegionesCubiertas: mejor.eval.regionesCubiertas,
    mejorConfig: copiar(mejor.config),
  };
}

const esSatisfactoria = (x: Individuo) => x.eval.valida && x.eval.regionesCubiertas === x.eval.regionesActivas;

// ---- Motor -------------------------------------------------------------------

/**
 * Motor paso a paso: la UI (Web Worker) avanza una generación a la vez para
 * informar el progreso; la CLI y las pruebas usan `evolucionar`, que hace lo mismo
 * en un bucle. Ambos caminos ejecutan exactamente el mismo código.
 */
export class MotorEvolutivo {
  readonly ctx: Contexto;
  readonly rng: Rng;
  poblacion: Individuo[] = [];
  mejor!: Individuo;
  inicial!: Individuo;
  historial: RegistroGeneracion[] = [];
  generacion = 0;
  evaluaciones = 0;
  generacionSatisfactoria = -1;
  private readonly inicio = Date.now();

  constructor(
    readonly escenario: Escenario,
    readonly p: ParametrosAG,
    opciones: OpcionesEvolucion = {},
  ) {
    if (p.poblacion < 2) throw new Error('La población debe tener al menos 2 individuos');
    if (p.elitismo >= p.poblacion) throw new Error('El elitismo debe ser menor que la población');
    this.ctx = preparar(escenario);
    this.rng = crearRng(p.semilla);
    const n = escenario.modelo.numSatelites;

    const iniciales = (opciones.semillasIniciales ?? []).slice(0, p.poblacion).map(copiar);
    for (const c of iniciales) {
      if (c.length !== n) throw new Error(`Una configuración inicial tiene ${c.length} satélites; se esperaban ${n}`);
    }
    while (iniciales.length < p.poblacion) iniciales.push(configuracionAleatoria(n, this.rng));
    this.poblacion = iniciales.map((c) => this.evaluarIndividuo(c));

    this.mejor = this.mejorDePoblacion();
    this.inicial = this.mejor;
    this.anotar();
  }

  private evaluarIndividuo(config: Configuracion): Individuo {
    this.evaluaciones++;
    return { config, eval: evaluar(config, this.ctx) };
  }

  private mejorDePoblacion(): Individuo {
    return this.poblacion.reduce((a, b) => (comparar(b.eval, a.eval) < 0 ? b : a));
  }

  private anotar(): void {
    this.historial.push(registrar(this.generacion, this.poblacion, this.mejor));
    if (this.generacionSatisfactoria < 0 && esSatisfactoria(this.mejor)) this.generacionSatisfactoria = this.generacion;
  }

  get terminado(): boolean {
    return this.generacion >= this.p.generaciones;
  }

  /** Avanza una generación. */
  paso(): RegistroGeneracion {
    const p = this.p;
    const ordenada = [...this.poblacion].sort((a, b) => comparar(a.eval, b.eval));
    // Elitismo: las E mejores pasan sin cambios (la curva del mejor no puede bajar).
    const nueva: Individuo[] = ordenada.slice(0, p.elitismo);
    while (nueva.length < p.poblacion) {
      const a = torneo(this.poblacion, p.torneo, this.rng);
      const b = torneo(this.poblacion, p.torneo, this.rng);
      const hijo =
        this.rng.siguiente() < p.probCruce ? cruzar(a.config, b.config, this.rng, p.alinearCruce) : copiar(a.config);
      mutar(hijo, p, this.rng);
      nueva.push(this.evaluarIndividuo(hijo));
    }
    this.poblacion = nueva;
    this.generacion++;
    const candidata = this.mejorDePoblacion();
    // Se guarda la mejor de toda la ejecución (importa si elitismo = 0).
    if (comparar(candidata.eval, this.mejor.eval) < 0) this.mejor = candidata;
    this.anotar();
    return this.historial[this.historial.length - 1];
  }

  resultado(): ResultadoEjecucion {
    return {
      parametros: { ...this.p },
      escenario: this.escenario,
      historial: this.historial,
      inicial: { config: copiar(this.inicial.config), eval: this.inicial.eval },
      final: { config: copiar(this.mejor.config), eval: this.mejor.eval },
      estado: estadoDeEjecucion(this.mejor.eval),
      generacionSatisfactoria: this.generacionSatisfactoria,
      evaluaciones: this.evaluaciones,
      tiempoMs: Date.now() - this.inicio,
    };
  }
}

export function evolucionar(
  escenario: Escenario,
  parametros: Partial<ParametrosAG> = {},
  opciones: OpcionesEvolucion = {},
): ResultadoEjecucion {
  const motor = new MotorEvolutivo(escenario, { ...PARAMETROS_BASE, ...parametros }, opciones);
  while (!motor.terminado) motor.paso();
  return motor.resultado();
}
