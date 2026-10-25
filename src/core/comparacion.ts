// Reglas de factibilidad de Deb (2000). Es la ÚNICA forma en que el sistema
// decide qué configuración es mejor: torneo, elitismo y "mejor encontrada"
// usan esta función. Por eso una configuración inválida nunca gana a una válida.
import type { Evaluacion, EstadoSolucion } from './tipos';

/**
 * Devuelve un número negativo si `a` es mejor que `b`, positivo si `b` es
 * mejor y 0 si empatan (se puede usar directamente en Array.sort).
 */
export function comparar(a: Evaluacion, b: Evaluacion): number {
  // Regla 1: válida siempre gana a inválida, sin importar la aptitud.
  if (a.valida !== b.valida) return a.valida ? -1 : 1;
  // Regla 2: entre válidas, mayor aptitud.
  if (a.valida) return b.fitness - a.fitness;
  // Regla 3: entre inválidas, menor violación total.
  if (a.violacionTotal !== b.violacionTotal) return a.violacionTotal - b.violacionTotal;
  // Desempate entre inválidas con igual violación: mayor aptitud.
  return b.fitness - a.fitness;
}

export function esMejor(a: Evaluacion, b: Evaluacion): boolean {
  return comparar(a, b) < 0;
}

/** Estado de una configuración individual (por ejemplo, al reevaluarla). */
export function estadoDeConfiguracion(e: Evaluacion): EstadoSolucion {
  return e.valida ? 'VÁLIDA' : 'INVÁLIDA';
}

/**
 * Estado del resultado de una ejecución. Gracias a las reglas de Deb, si en
 * algún momento existió una configuración válida, la mejor final es válida.
 * Por lo tanto, una mejor final inválida implica que no se encontró ninguna
 * válida: se reporta que no se encontró una válida (con la de menor violación).
 */
export function estadoDeEjecucion(mejorFinal: Evaluacion): EstadoSolucion {
  return mejorFinal.valida ? 'VÁLIDA' : 'SIN_VALIDA';
}

export type NivelCalidad = 'Inválida' | 'Aceptable' | 'Satisfactoria';

/** Niveles de docs/01, sección 7. */
export function nivelDeCalidad(e: Evaluacion): NivelCalidad {
  if (!e.valida) return 'Inválida';
  return e.regionesCubiertas === e.regionesActivas ? 'Satisfactoria' : 'Aceptable';
}
