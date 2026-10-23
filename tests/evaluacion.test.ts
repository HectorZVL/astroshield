import { describe, expect, it } from 'vitest';
import { activarZona, agregarZona, cambiarPrioridad, escenarioInicial, moverZona } from '../src/core/escenario';
import { evaluarEn } from '../src/core/evaluacion';
import { comparar, estadoDeConfiguracion, estadoDeEjecucion, nivelDeCalidad } from '../src/core/comparacion';
import { destino } from '../src/core/geo';
import type { Configuracion, Evaluacion } from '../src/core/tipos';

const esc = escenarioInicial();

/** Configuración "de manual": un satélite sobre cada región + 2 lejos de todo. */
function configSobreRegiones(): Configuracion {
  return [
    ...esc.regiones.map((r) => ({ lat: r.lat, lon: r.lon })),
    { lat: -60, lon: 0 },
    { lat: -60, lon: 90 },
  ];
}

describe('datos del enunciado', () => {
  it('tiene 6 regiones, 3 zonas de desechos, 2 objetos y 8 satélites', () => {
    expect(esc.regiones).toHaveLength(6);
    expect(esc.desechos).toHaveLength(3);
    expect(esc.ocupadas).toHaveLength(2);
    expect(esc.modelo.numSatelites).toBe(8);
    expect(esc.regiones.every((r) => r.radioKm === 300)).toBe(true);
  });

  it('las prioridades coinciden con el enunciado', () => {
    const p = Object.fromEntries(esc.regiones.map((r) => [r.id, r.prioridad]));
    expect(p).toEqual({
      yucatan: 'Alta',
      amazonia: 'Alta',
      california: 'Media',
      sahel: 'Media',
      japon: 'Media',
      australia: 'Normal',
    });
  });
});

describe('cobertura', () => {
  it('un satélite sobre cada región las cubre todas (C = 1, G = 0)', () => {
    const e = evaluarEn(configSobreRegiones(), esc);
    expect(e.cobertura).toBe(1);
    expect(e.guia).toBe(0);
    expect(e.regionesCubiertas).toBe(6);
    expect(e.regiones.every((r) => r.estado === 'cubierta')).toBe(true);
    expect(e.valida).toBe(true);
  });

  it('el límite exacto de cobertura completa individual es θ − ρ ≈ 17.302°', () => {
    const yuc = esc.regiones[0];
    const dentro = destino(yuc, 0, 17.3);
    const fuera = destino(yuc, 0, 17.31);
    const lejos = [{ lat: -80, lon: 0 }];
    expect(evaluarEn([dentro, ...lejos], esc).regiones[0].satelitesCompletos).toEqual([0]);
    expect(evaluarEn([fuera, ...lejos], esc).regiones[0].satelitesCompletos).toEqual([]);
  });

  it('un satélite a 20° del centro cubre la región solo parcialmente', () => {
    const yuc = esc.regiones[0];
    const e = evaluarEn([destino(yuc, 90, 20), { lat: -80, lon: 0 }], esc);
    expect(e.regiones[0].estado).toBe('parcial');
    expect(e.regiones[0].fraccion).toBeGreaterThan(0);
    expect(e.regiones[0].fraccion).toBeLessThan(1);
  });

  it('un satélite lejano no cubre y la guía premia acercarse', () => {
    const yuc = esc.regiones[0];
    const lejos = evaluarEn([destino(yuc, 180, 60)], esc);
    const cerca = evaluarEn([destino(yuc, 180, 30)], esc);
    expect(lejos.regiones[0].estado).toBe('no cubierta');
    expect(cerca.fitness).toBeGreaterThan(lejos.fitness);
  });

  it('la guía nunca hace que una región parcial valga más que una cubierta', () => {
    const yuc = esc.regiones[0];
    const cubierta = evaluarEn([{ lat: yuc.lat, lon: yuc.lon }], esc);
    for (const d of [18, 19, 20, 21, 22, 25, 30]) {
      const parcial = evaluarEn([destino(yuc, 45, d)], esc);
      expect(parcial.fitness).toBeLessThan(cubierta.fitness);
    }
  });

  it('un satélite en el punto medio Yucatán–California cubre ambas regiones', () => {
    const mitad = { lat: 29.0, lon: -104.5 };
    const e = evaluarEn([mitad], esc);
    expect(e.regiones.find((r) => r.id === 'yucatan')!.estado).toBe('cubierta');
    expect(e.regiones.find((r) => r.id === 'california')!.estado).toBe('cubierta');
  });

  it('la redundancia cuenta regiones con ≥ 2 satélites completos, ponderada', () => {
    const yuc = esc.regiones[0];
    const config: Configuracion = [
      ...configSobreRegiones().slice(0, 6),
      destino(yuc, 0, 5), // segundo satélite sobre Yucatán (Alta, peso 3)
      { lat: -60, lon: 90 },
    ];
    const e = evaluarEn(config, esc);
    expect(e.redundancia).toBeCloseTo(3 / 13, 12);
    expect(e.fitness).toBeCloseTo(1 + 0.1 * (3 / 13), 12);
  });

  it('cambiar prioridades cambia los pesos de la aptitud', () => {
    const solo = [{ lat: -25, lon: 133 }]; // solo Australia
    const antes = evaluarEn(solo, esc);
    const despues = evaluarEn(solo, cambiarPrioridad(esc, 'australia', 'Alta'));
    expect(antes.cobertura).toBeCloseTo(1 / 13, 12);
    expect(despues.cobertura).toBeCloseTo(3 / 15, 12);
  });
});

describe('restricciones', () => {
  it('un satélite dentro de cada zona de desechos produce una violación de ese tipo', () => {
    for (const z of esc.desechos) {
      const e = evaluarEn([...configSobreRegiones().slice(0, 7), { lat: z.lat, lon: z.lon }], esc);
      expect(e.valida).toBe(false);
      const v = e.violaciones.find((x) => x.contra === z.id)!;
      expect(v.tipo).toBe('desechos');
      expect(v.magnitud).toBeCloseTo(z.radioGrados, 9);
    }
  });

  it('un satélite dentro de cada objeto ocupado viola la exclusión', () => {
    for (const z of esc.ocupadas) {
      const e = evaluarEn([...configSobreRegiones().slice(0, 7), destino(z, 30, 4.9)], esc);
      expect(e.valida).toBe(false);
      expect(e.violaciones[0].tipo).toBe('ocupada');
      expect(e.violaciones[0].magnitud).toBeCloseTo(0.1, 6);
    }
  });

  it('el borde de una zona está permitido y un poco adentro no', () => {
    const z = esc.desechos[0];
    const borde = evaluarEn([destino(z, 0, z.radioGrados)], esc);
    const adentro = evaluarEn([destino(z, 0, z.radioGrados - 0.01)], esc);
    expect(borde.valida).toBe(true);
    expect(adentro.valida).toBe(false);
  });

  it('dos satélites a menos de 3° violan la separación mínima', () => {
    const p = { lat: 0, lon: 0 };
    const e = evaluarEn([p, destino(p, 0, 2)], esc);
    expect(e.valida).toBe(false);
    expect(e.violaciones[0].tipo).toBe('separacion');
    expect(e.violaciones[0].magnitud).toBeCloseTo(1, 6);
    expect(evaluarEn([p, destino(p, 0, 3.01)], esc).valida).toBe(true);
  });

  it('una zona desactivada deja de restringir y una zona nueva empieza a restringir', () => {
    const z = esc.desechos[0];
    const config = [{ lat: z.lat, lon: z.lon }];
    expect(evaluarEn(config, esc).valida).toBe(false);
    expect(evaluarEn(config, activarZona(esc, z.id, false)).valida).toBe(true);

    const libre = [{ lat: 0, lon: -150 }];
    const conNueva = agregarZona(esc, 'desechos', {
      id: 'nueva', nombre: 'Nueva', lat: 0, lon: -150, radioGrados: 6, activa: true,
    });
    expect(evaluarEn(libre, esc).valida).toBe(true);
    expect(evaluarEn(libre, conNueva).valida).toBe(false);
  });

  it('mover una zona sobre una configuración válida la vuelve inválida', () => {
    const config = configSobreRegiones();
    expect(evaluarEn(config, esc).valida).toBe(true);
    const movida = moverZona(esc, 'objeto-a', 15, 0); // Objeto A sobre el Sahel
    const e = evaluarEn(config, movida);
    expect(e.valida).toBe(false);
    expect(e.violaciones.some((v) => v.contra === 'objeto-a')).toBe(true);
  });

  it('los cambios de escenario no modifican el original', () => {
    const copia = JSON.stringify(esc);
    moverZona(esc, 'objeto-a', 15, 0);
    activarZona(esc, 'polar-norte', false);
    cambiarPrioridad(esc, 'japon', 'Alta');
    expect(JSON.stringify(esc)).toBe(copia);
  });
});

describe('reglas de Deb y estados', () => {
  const valida = (fitness: number): Evaluacion =>
    ({ fitness, valida: true, violacionTotal: 0 }) as Evaluacion;
  const invalida = (fitness: number, violacionTotal: number): Evaluacion =>
    ({ fitness, valida: false, violacionTotal }) as Evaluacion;

  it('una válida con aptitud baja gana a una inválida con aptitud altísima', () => {
    expect(comparar(valida(0.01), invalida(1.1, 0.0001))).toBeLessThan(0);
    expect(comparar(invalida(1.1, 0.0001), valida(0.01))).toBeGreaterThan(0);
  });

  it('entre válidas gana la de mayor aptitud', () => {
    expect(comparar(valida(0.9), valida(0.5))).toBeLessThan(0);
  });

  it('entre inválidas gana la de menor violación, aunque tenga menor aptitud', () => {
    expect(comparar(invalida(0.1, 1), invalida(1.0, 5))).toBeLessThan(0);
  });

  it('ordenar con comparar() pone todas las válidas antes que las inválidas', () => {
    const lista = [invalida(1, 0.1), valida(0.2), invalida(0.9, 3), valida(0.7), valida(0.1)];
    const orden = [...lista].sort(comparar);
    expect(orden.map((e) => e.valida)).toEqual([true, true, true, false, false]);
    expect(orden[0].fitness).toBe(0.7);
  });

  it('estados: VÁLIDA / INVÁLIDA para configuraciones, INVIABLE para ejecuciones sin válidas', () => {
    expect(estadoDeConfiguracion(valida(1))).toBe('VÁLIDA');
    expect(estadoDeConfiguracion(invalida(1, 1))).toBe('INVÁLIDA');
    expect(estadoDeEjecucion(invalida(1, 1))).toBe('INVIABLE');
    expect(estadoDeEjecucion(valida(0))).toBe('VÁLIDA');
  });

  it('nivel de calidad: Inválida / Aceptable / Satisfactoria', () => {
    const todas = evaluarEn(configSobreRegiones(), esc);
    expect(nivelDeCalidad(todas)).toBe('Satisfactoria');
    const una = evaluarEn([{ lat: -60, lon: 0 }], esc);
    expect(nivelDeCalidad(una)).toBe('Aceptable');
    const mala = evaluarEn([{ lat: 45, lon: -35 }], esc);
    expect(nivelDeCalidad(mala)).toBe('Inválida');
  });
});
