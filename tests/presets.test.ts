// Los escenarios rápidos de la interfaz deben reproducir las ejecuciones
// documentadas en docs/03: misma condición y misma semilla => mismo resultado.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evolucionar } from '../src/core/ag';
import { nivelDeCalidad } from '../src/core/comparacion';
import type { Configuracion, ResultadoEjecucion } from '../src/core/tipos';
import { crearPreset } from '../src/app/presets';

const leer = <T>(archivo: string) => JSON.parse(readFileSync(join(__dirname, '..', 'results', archivo), 'utf8')) as T;
const ref = leer<{ resultado: ResultadoEjecucion }>('run-referencia.json').resultado;
const p6 = leer<{ inviable: { violacionFinal: number[]; configuracionMenorViolacion: Configuracion } }>('p6-inviable.json');

describe('escenarios rápidos de la interfaz', () => {
  it('«Inicial» restaura el escenario y los parámetros del run de referencia', () => {
    const p = crearPreset('inicial');
    expect(p.escenario).toEqual(ref.escenario);
    expect(p.parametros).toEqual(ref.parametros);
  });

  it('«Inicial» después de «Inviable» vuelve a la semilla de referencia (antes se quedaba en 1)', () => {
    expect(crearPreset('inviable').parametros.semilla).toBe(1);
    expect(crearPreset('inicial').parametros.semilla).toBe(ref.parametros.semilla);
  });

  it('«Inviable» reproduce exactamente la configuración de menor violación de P6 (b)', () => {
    const p = crearPreset('inviable');
    const r = evolucionar(p.escenario, p.parametros);
    expect(r.estado).toBe('INVIABLE');
    expect(r.final.config).toEqual(p6.inviable.configuracionMenorViolacion);
    expect(r.final.eval.violacionTotal).toBe(p6.inviable.violacionFinal[0]);
  });

  it('«Difícil» termina VÁLIDA pero no satisfactoria, como P6 (a)', () => {
    const p = crearPreset('dificil');
    const r = evolucionar(p.escenario, p.parametros);
    expect(r.estado).toBe('VÁLIDA');
    expect(nivelDeCalidad(r.final.eval)).not.toBe('Satisfactoria');
    expect(r.final.eval.regiones.find((x) => x.id === 'yucatan')!.estado).not.toBe('cubierta');
  });

  it('«Espacio reducido ×4» termina VÁLIDA y cubre las 6 regiones, como P5', () => {
    const p = crearPreset('reducido');
    expect(p.escenario.desechos.map((z) => z.radioGrados)).toEqual([48, 40, 32]);
    const r = evolucionar(p.escenario, p.parametros);
    expect(r.estado).toBe('VÁLIDA');
    expect(r.final.eval.regionesCubiertas).toBe(6);
  });
});
