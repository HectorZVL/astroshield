// Línea base para la prueba propia: búsqueda aleatoria pura con el MISMO
// presupuesto de evaluaciones que el algoritmo genético. Si el AG no le gana
// con claridad, la evolución no estaría aportando nada.
import { comparar, estadoDeEjecucion } from './comparacion';
import { evaluar, preparar } from './evaluacion';
import { configuracionAleatoria } from './ag';
import { crearRng } from './rng';
import type { Escenario, Individuo } from './tipos';

export interface ResultadoAleatorio {
  mejor: Individuo;
  /** Mejor aptitud acumulada cada `bloque` evaluaciones (comparable por generación). */
  curva: number[];
  evaluaciones: number;
  estado: ReturnType<typeof estadoDeEjecucion>;
}

export function busquedaAleatoria(
  escenario: Escenario,
  evaluaciones: number,
  semilla: number,
  bloque = 78,
): ResultadoAleatorio {
  const ctx = preparar(escenario);
  const rng = crearRng(semilla);
  const n = escenario.modelo.numSatelites;
  let mejor: Individuo | null = null;
  const curva: number[] = [];
  for (let i = 0; i < evaluaciones; i++) {
    const config = configuracionAleatoria(n, rng);
    const ind = { config, eval: evaluar(config, ctx) };
    if (!mejor || comparar(ind.eval, mejor.eval) < 0) mejor = ind;
    if ((i + 1) % bloque === 0) curva.push(mejor.eval.fitness);
  }
  return { mejor: mejor!, curva, evaluaciones, estado: estadoDeEjecucion(mejor!.eval) };
}
