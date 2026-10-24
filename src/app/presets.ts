// Escenarios rápidos de la interfaz. Cada uno fija las condiciones Y los
// parámetros de una ejecución documentada en docs/03-pruebas.md, así que al
// pulsar «Evolucionar» la UI reproduce exactamente ese resultado. Antes solo
// «Inviable» cambiaba la semilla y los demás heredaban la del preset anterior.
// Probado en tests/presets.test.ts.
import { PARAMETROS_BASE } from '../core/ag';
import { agregarZona, escalarDesechos, escenarioInicial, renombrar } from '../core/escenario';
import type { Escenario, ParametrosAG } from '../core/tipos';

export type NombrePreset = 'inicial' | 'reducido' | 'dificil' | 'inviable';

export interface Preset {
  escenario: Escenario;
  parametros: ParametrosAG;
  /** Ejecución documentada que reproduce. */
  referencia: string;
}

/** Semilla del run de referencia (P1, results/run-referencia.json). */
export const SEMILLA_REFERENCIA = 42;

export function crearPreset(nombre: NombrePreset): Preset {
  const base = escenarioInicial();
  const con = (semilla: number) => ({ ...PARAMETROS_BASE, semilla });
  switch (nombre) {
    case 'inicial':
      return { escenario: base, parametros: con(SEMILLA_REFERENCIA), referencia: 'P1 (run de referencia)' };
    case 'reducido':
      return { escenario: renombrar(escalarDesechos(base, 4), 'Desechos ×4'), parametros: con(1), referencia: 'P5, factor ×4, semilla 1' };
    case 'dificil':
      return {
        escenario: renombrar(
          agregarZona(base, 'desechos', { id: 'bloqueo-yucatan', nombre: 'Bloqueo sobre Yucatán', lat: 20.5, lon: -89, radioGrados: 21, activa: true }),
          'Difícil: Yucatán bloqueada',
        ),
        parametros: con(1),
        referencia: 'P6 (a), semilla 1',
      };
    case 'inviable':
      return {
        escenario: renombrar(
          agregarZona(base, 'desechos', { id: 'gigante', nombre: 'Zona gigante', lat: 0, lon: 0, radioGrados: 178, activa: true }),
          'Inviable: casquete libre de 2°',
        ),
        parametros: con(1),
        referencia: 'P6 (b), semilla 1',
      };
  }
}
