// La visualización carga results/run-referencia.json. Estas pruebas garantizan
// que ese archivo es un resultado REAL y reproducible del sistema, no un dato inventado.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evolucionar } from '../src/core/ag';
import { escenarioInicial } from '../src/core/escenario';
import { evaluarEn } from '../src/core/evaluacion';
import type { ResultadoEjecucion } from '../src/core/tipos';

const ruta = join(__dirname, '..', 'results', 'run-referencia.json');

describe('run de referencia (results/run-referencia.json)', () => {
  it('existe (se genera con npm run experimentos)', () => {
    expect(existsSync(ruta)).toBe(true);
  });

  const ref = JSON.parse(readFileSync(ruta, 'utf8')) as { resultado: ResultadoEjecucion; cotaTeorica: number };
  const r = ref.resultado;

  it('usa exactamente el escenario del enunciado', () => {
    expect(r.escenario).toEqual(escenarioInicial());
  });

  it('volver a ejecutar con la misma semilla reproduce exactamente la configuración y el historial', () => {
    const nuevo = evolucionar(r.escenario, r.parametros);
    expect(nuevo.final.config).toEqual(r.final.config);
    expect(nuevo.inicial.config).toEqual(r.inicial.config);
    expect(nuevo.historial.map((h) => h.mejor)).toEqual(r.historial.map((h) => h.mejor));
    expect(nuevo.historial.map((h) => h.validos)).toEqual(r.historial.map((h) => h.validos));
  });

  it('la evaluación guardada coincide con reevaluar desde cero', () => {
    const ev = evaluarEn(r.final.config, r.escenario);
    expect(ev.fitness).toBe(r.final.eval.fitness);
    expect(ev.valida).toBe(r.final.eval.valida);
    expect(ev.regionesCubiertas).toBe(r.final.eval.regionesCubiertas);
  });

  it('es VÁLIDA, cubre las 6 regiones y no supera la cota teórica', () => {
    expect(r.estado).toBe('VÁLIDA');
    expect(r.final.eval.regionesCubiertas).toBe(6);
    expect(r.final.eval.fitness).toBeLessThanOrEqual(ref.cotaTeorica + 1e-9);
  });
});
