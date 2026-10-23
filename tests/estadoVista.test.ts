import { describe, expect, it } from 'vitest';
import { estadoParaMostrar } from '../src/app/estadoVista';
import { activarZona, agregarZona, escenarioInicial } from '../src/core/escenario';
import { evaluarEn } from '../src/core/evaluacion';
import { puntoAleatorio } from '../src/core/geo';
import { crearRng } from '../src/core/rng';
import type { EstadoSolucion } from '../src/core/tipos';

describe('chip de estado de la interfaz', () => {
  it('ninguna configuración inválida se muestra como VÁLIDA, en ningún contexto', () => {
    const rng = crearRng(99);
    const escenarios = [
      escenarioInicial(),
      agregarZona(escenarioInicial(), 'desechos', { id: 'g', nombre: 'g', lat: 0, lon: 0, radioGrados: 120, activa: true }),
    ];
    let invalidasProbadas = 0;
    for (let i = 0; i < 400; i++) {
      const config = Array.from({ length: 8 }, () => puntoAleatorio(rng));
      const ev = evaluarEn(config, escenarios[i % 2]);
      for (const escenarioModificado of [true, false]) {
        for (const esFinal of [true, false]) {
          for (const estadoRun of ['VÁLIDA', 'INVIABLE'] as EstadoSolucion[]) {
            const chip = estadoParaMostrar(ev, { escenarioModificado, esFinal, estadoRun });
            if (!ev.valida) expect(chip).not.toBe('VÁLIDA');
            else expect(chip).toBe('VÁLIDA');
          }
        }
      }
      if (!ev.valida) invalidasProbadas++;
    }
    expect(invalidasProbadas).toBeGreaterThan(50);
  });

  it('INVIABLE solo aparece para la final de un run inviable, sin cambios de condiciones', () => {
    const ev = evaluarEn([{ lat: 45, lon: -35 }], escenarioInicial());
    expect(ev.valida).toBe(false);
    expect(estadoParaMostrar(ev, { escenarioModificado: false, esFinal: true, estadoRun: 'INVIABLE' })).toBe('INVIABLE');
    expect(estadoParaMostrar(ev, { escenarioModificado: true, esFinal: true, estadoRun: 'INVIABLE' })).toBe('INVÁLIDA');
    expect(estadoParaMostrar(ev, { escenarioModificado: false, esFinal: false, estadoRun: 'INVIABLE' })).toBe('INVÁLIDA');
  });

  it('al cambiar condiciones, la misma configuración puede pasar de VÁLIDA a INVÁLIDA y volver', () => {
    const base = escenarioInicial();
    const config = [{ lat: 45, lon: -35 }];
    const ctx = { escenarioModificado: true, esFinal: true, estadoRun: 'VÁLIDA' as EstadoSolucion };
    expect(estadoParaMostrar(evaluarEn(config, base), ctx)).toBe('INVÁLIDA');
    expect(estadoParaMostrar(evaluarEn(config, activarZona(base, 'atlantico-norte', false)), ctx)).toBe('VÁLIDA');
  });
});
