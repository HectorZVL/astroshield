// Decide qué chip muestra la interfaz. Está separado de main.ts para poder
// probarlo sin navegador (tests/estadoVista.test.ts): la garantía "ninguna
// configuración inválida se muestra como VÁLIDA" se verifica automáticamente.
import { estadoDeConfiguracion } from '../core/comparacion';
import type { EstadoSolucion, Evaluacion } from '../core/tipos';

export interface ContextoVista {
  /** Las condiciones actuales difieren de las del run. */
  escenarioModificado: boolean;
  /** Se muestra la configuración final del run (no una generación intermedia ni la inicial). */
  esFinal: boolean;
  /** Estado de la ejecución completa (VÁLIDA o SIN_VALIDA). */
  estadoRun: EstadoSolucion;
}

/**
 * `ev` SIEMPRE es la evaluación de la configuración mostrada en las condiciones
 * actuales, calculada por el núcleo. Si es inválida, el resultado nunca es VÁLIDA.
 */
export function estadoParaMostrar(ev: Evaluacion, c: ContextoVista): EstadoSolucion {
  if (!ev.valida && !c.escenarioModificado && c.esFinal && c.estadoRun === 'SIN_VALIDA') return 'SIN_VALIDA';
  return estadoDeConfiguracion(ev);
}
