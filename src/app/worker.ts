/// <reference lib="webworker" />
// El algoritmo corre en un Web Worker para que la interfaz y la animación del
// globo no se congelen. Ejecuta EXACTAMENTE el mismo código del núcleo que la
// CLI y las pruebas (MotorEvolutivo), así que con la misma semilla y escenario
// el resultado es idéntico al de `npm run experimentos`.
import { MotorEvolutivo } from '../core/ag';
import { analizarFactibilidad } from '../core/factibilidad';
import type { Configuracion, Escenario, ParametrosAG, RegistroGeneracion, ResultadoEjecucion } from '../core/tipos';
import type { Factibilidad } from '../core/factibilidad';

export type MensajeAlWorker = {
  tipo: 'evolucionar';
  escenario: Escenario;
  parametros: ParametrosAG;
  semillasIniciales?: Configuracion[];
};

export type MensajeDelWorker =
  | { tipo: 'factibilidad'; factibilidad: Factibilidad }
  | { tipo: 'progreso'; registro: RegistroGeneracion; total: number }
  | { tipo: 'fin'; resultado: ResultadoEjecucion }
  | { tipo: 'error'; mensaje: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const enviar = (m: MensajeDelWorker) => ctx.postMessage(m);

ctx.onmessage = (e: MessageEvent<MensajeAlWorker>) => {
  try {
    const { escenario, parametros, semillasIniciales } = e.data;
    enviar({ tipo: 'factibilidad', factibilidad: analizarFactibilidad(escenario) });
    const motor = new MotorEvolutivo(escenario, parametros, { semillasIniciales });
    enviar({ tipo: 'progreso', registro: motor.historial[0], total: parametros.generaciones });
    while (!motor.terminado) {
      enviar({ tipo: 'progreso', registro: motor.paso(), total: parametros.generaciones });
    }
    enviar({ tipo: 'fin', resultado: motor.resultado() });
  } catch (err) {
    enviar({ tipo: 'error', mensaje: err instanceof Error ? err.message : String(err) });
  }
};
