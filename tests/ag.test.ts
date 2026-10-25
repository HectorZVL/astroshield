import { describe, expect, it } from 'vitest';
import { cruzar, emparejar, evolucionar, distanciaConfiguraciones, mutar, PARAMETROS_BASE } from '../src/core/ag';
import { agregarZona, escenarioInicial, moverZona } from '../src/core/escenario';
import { evaluarEn } from '../src/core/evaluacion';
import { analizarFactibilidad } from '../src/core/factibilidad';
import { busquedaAleatoria } from '../src/core/busquedaAleatoria';
import { comparar } from '../src/core/comparacion';
import { distancia } from '../src/core/geo';
import { crearRng } from '../src/core/rng';
import { mannWhitney, resumir } from '../src/core/estadistica';
import type { Escenario } from '../src/core/tipos';

const esc = escenarioInicial();
const rapido = { poblacion: 40, generaciones: 40 };

/** Escenario sin solución: una zona gigante deja libre solo un casquete de 2°. */
function escenarioInviable(): Escenario {
  return agregarZona(esc, 'desechos', {
    id: 'gigante', nombre: 'Zona gigante', lat: 0, lon: 0, radioGrados: 178, activa: true,
  });
}

/** Existe una posición válida en un casquete demasiado pequeño para la malla. */
function escenarioFactibleFueraDeMalla(): Escenario {
  const e = escenarioInicial();
  e.modelo.numSatelites = 1;
  e.desechos = [];
  e.ocupadas = [];
  return agregarZona(e, 'desechos', {
    id: 'casi-global', nombre: 'Casi global', lat: 0, lon: 0, radioGrados: 179.999, activa: true,
  });
}

describe('operadores', () => {
  it('emparejar asigna cada satélite de A a uno distinto de B, el más cercano', () => {
    const a = [{ lat: 0, lon: 0 }, { lat: 0, lon: 90 }, { lat: 45, lon: 0 }];
    const b = [{ lat: 44, lon: 1 }, { lat: 1, lon: 1 }, { lat: 0, lon: 91 }];
    expect(emparejar(a, b)).toEqual([1, 2, 0]);
  });

  it('cruce alineado: cada satélite del hijo coincide con un padre y conserva el "trabajo"', () => {
    const a = [{ lat: 0, lon: 0 }, { lat: 0, lon: 90 }];
    const b = [{ lat: 0, lon: 91 }, { lat: 0, lon: 1 }]; // mismo trabajo, orden invertido
    const rng = crearRng(1);
    for (let i = 0; i < 20; i++) {
      const h = cruzar(a, b, rng, true);
      // Con alineación, el hijo siempre tiene un satélite cerca de lon 0 y otro cerca de lon 90.
      expect(Math.min(distancia(h[0], a[0]), distancia(h[1], a[0]))).toBeLessThan(2);
      expect(Math.min(distancia(h[0], a[1]), distancia(h[1], a[1]))).toBeLessThan(2);
    }
  });

  it('la mutación con probabilidades 0 no cambia nada', () => {
    const c = [{ lat: 10, lon: 20 }];
    mutar(c, { ...PARAMETROS_BASE, probMutacion: 0, probReinicio: 0 }, crearRng(1));
    expect(c).toEqual([{ lat: 10, lon: 20 }]);
  });

  it('la distancia entre configuraciones no depende del orden de los satélites', () => {
    const a = [{ lat: 0, lon: 0 }, { lat: 30, lon: 30 }];
    expect(distanciaConfiguraciones(a, [...a].reverse())).toBe(0);
  });
});

describe('algoritmo evolutivo', () => {
  it('es reproducible: la misma semilla da exactamente el mismo resultado', () => {
    const a = evolucionar(esc, { ...rapido, semilla: 7 });
    const b = evolucionar(esc, { ...rapido, semilla: 7 });
    expect(a.final.config).toEqual(b.final.config);
    expect(a.historial.map((h) => h.mejor)).toEqual(b.historial.map((h) => h.mejor));
    const c = evolucionar(esc, { ...rapido, semilla: 8 });
    expect(c.final.config).not.toEqual(a.final.config);
  });

  it('mejora: la mejor final es al menos tan buena como la inicial y la curva no baja (elitismo)', () => {
    const r = evolucionar(esc, { ...rapido, semilla: 3 });
    expect(comparar(r.final.eval, r.inicial.eval)).toBeLessThanOrEqual(0);
    expect(r.final.eval.fitness).toBeGreaterThan(r.inicial.eval.fitness);
    for (let i = 1; i < r.historial.length; i++) {
      // Mientras la mejor sea válida, su aptitud no puede disminuir.
      if (r.historial[i - 1].mejorValida) expect(r.historial[i].mejor).toBeGreaterThanOrEqual(r.historial[i - 1].mejor);
    }
  });

  it('registra el historial completo de cada generación', () => {
    const r = evolucionar(esc, { ...rapido, semilla: 1 });
    expect(r.historial).toHaveLength(rapido.generaciones + 1);
    for (const h of r.historial) {
      expect(h.peor).toBeLessThanOrEqual(h.media);
      expect(h.media).toBeLessThanOrEqual(h.mejor + 1e-12);
      expect(h.validos).toBeGreaterThanOrEqual(0);
      expect(h.validos).toBeLessThanOrEqual(rapido.poblacion);
      expect(h.mejorConfig).toHaveLength(8);
      expect(h.diversidad).toBeGreaterThanOrEqual(0);
    }
    expect(r.evaluaciones).toBe(40 + 40 * (40 - PARAMETROS_BASE.elitismo));
  });

  it('en el escenario inicial produce una solución VÁLIDA que cubre las 6 regiones', () => {
    const r = evolucionar(esc, { semilla: 42 });
    expect(r.estado).toBe('VÁLIDA');
    expect(r.final.eval.valida).toBe(true);
    expect(r.final.eval.regionesCubiertas).toBe(6);
    // Re-evaluar desde cero da exactamente lo mismo (no hay estado oculto).
    expect(evaluarEn(r.final.config, esc).fitness).toBe(r.final.eval.fitness);
  });

  it('la mejor reportada nunca es inválida si en algún momento hubo una válida', () => {
    for (const semilla of [1, 2, 3]) {
      const r = evolucionar(esc, { ...rapido, semilla });
      const huboValida = r.historial.some((h) => h.validos > 0);
      if (huboValida) expect(r.final.eval.valida).toBe(true);
      for (const h of r.historial) if (h.validos > 0) expect(h.mejorValida).toBe(true);
    }
  });

  it('respeta una zona trampa puesta sobre Japón: ningún satélite queda dentro', () => {
    const trampa = agregarZona(esc, 'desechos', {
      id: 'trampa-japon', nombre: 'Trampa', lat: 36, lon: 138, radioGrados: 10, activa: true,
    });
    const r = evolucionar(trampa, { semilla: 5 });
    expect(r.final.eval.valida).toBe(true);
    for (const s of r.final.config) expect(distancia(s, { lat: 36, lon: 138 })).toBeGreaterThanOrEqual(10);
    // Aun así Japón puede cubrirse desde el anillo 10°–17.3°.
    expect(r.final.eval.regiones.find((x) => x.id === 'japon')!.estado).toBe('cubierta');
  });

  it('arranque en caliente: la configuración previa entra a la población inicial', () => {
    const previa = evolucionar(esc, { ...rapido, semilla: 9 }).final.config;
    const r = evolucionar(esc, { ...rapido, semilla: 10, generaciones: 0 }, { semillasIniciales: [previa] });
    expect(comparar(r.final.eval, evaluarEn(previa, esc))).toBeLessThanOrEqual(0);
  });

  it('valida los parámetros', () => {
    expect(() => evolucionar(esc, { poblacion: 1 })).toThrow();
    expect(() => evolucionar(esc, { poblacion: 4, elitismo: 4 })).toThrow();
    expect(() => evolucionar(esc, { poblacion: 10, elitismo: -1 })).toThrow();
    for (const cambios of [
      { poblacion: 4.5 }, { generaciones: 1.5 }, { torneo: 2.5 },
      { elitismo: 1.5 }, { semilla: 42.5 },
    ]) expect(() => evolucionar(esc, cambios)).toThrow(/entero/);
    expect(() => evolucionar(esc, { generaciones: -1 })).toThrow();
    expect(() => evolucionar(esc, { probCruce: 1.1 })).toThrow();
    expect(() => evolucionar(esc, { probMutacion: -0.1 })).toThrow();
    expect(() => evolucionar(esc, { sigmaMutacion: 0 })).toThrow();
  });
});

describe('escenario inviable', () => {
  it('el análisis de factibilidad no encuentra testigo y lo reporta', () => {
    const f = analizarFactibilidad(escenarioInviable());
    expect(f.factibleDemostrado).toBe(false);
    expect(f.fraccionLibre).toBeLessThan(0.001);
    expect(f.mensaje).toMatch(/inviable/i);
  });

  it('cero puntos libres en la malla no se presenta como prueba de inviabilidad', () => {
    const e = escenarioFactibleFueraDeMalla();
    const f = analizarFactibilidad(e);
    expect(f.puntosLibres).toBe(0);
    expect(evaluarEn([{ lat: 0, lon: 180 }], e).valida).toBe(true);
    expect(f.mensaje).toMatch(/muestra/);
    expect(f.mensaje).toMatch(/no demuestra inviabilidad/);
  });

  it('el escenario inicial sí es factible demostrado y el testigo es válido', () => {
    const f = analizarFactibilidad(esc);
    expect(f.factibleDemostrado).toBe(true);
    expect(evaluarEn(f.testigo!, esc).valida).toBe(true);
  });

  it('el AG reporta que no halló una válida y entrega la configuración de menor violación', () => {
    const r = evolucionar(escenarioInviable(), { ...rapido, semilla: 1 });
    expect(r.estado).toBe('SIN_VALIDA');
    expect(r.final.eval.valida).toBe(false);
    expect(r.historial.every((h) => h.validos === 0)).toBe(true);
    expect(r.historial.every((h) => h.mediaValidos === null)).toBe(true);
    // La violación de la mejor baja con la evolución (busca "lo menos malo").
    expect(r.final.eval.violacionTotal).toBeLessThan(r.historial[0].mejorViolacion);
  });

  it('no encontrar una válida no implica que el escenario sea imposible', () => {
    const e = escenarioFactibleFueraDeMalla();
    const r = evolucionar(e, { poblacion: 4, generaciones: 0 });
    expect(r.estado).toBe('SIN_VALIDA');
    expect(evaluarEn([{ lat: 0, lon: 180 }], e).valida).toBe(true);
  });

  it('una zona sobre Yucatán más grande que la huella hace imposible cubrirla, pero la solución sigue siendo válida', () => {
    const dificil = moverZona(esc, 'atlantico-norte', 20.5, -89, 21);
    const r = evolucionar(dificil, { semilla: 2 });
    expect(r.estado).toBe('VÁLIDA');
    expect(r.final.eval.regiones.find((x) => x.id === 'yucatan')!.estado).not.toBe('cubierta');
  });
});

describe('línea base y estadística', () => {
  it('la búsqueda aleatoria usa el presupuesto exacto y es reproducible', () => {
    const a = busquedaAleatoria(esc, 780, 4);
    const b = busquedaAleatoria(esc, 780, 4);
    expect(a.evaluaciones).toBe(780);
    expect(a.curva).toHaveLength(10);
    expect(a.mejor.eval.fitness).toBe(b.mejor.eval.fitness);
    expect(() => busquedaAleatoria(esc, 0, 1)).toThrow(/mayor o igual a 1/);
  });

  it('resumir calcula media, desviación muestral, mínimo, máximo y mediana', () => {
    const r = resumir([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(r.media).toBe(5);
    expect(r.desviacion).toBeCloseTo(2.138, 3);
    expect(r.minimo).toBe(2);
    expect(r.maximo).toBe(9);
    expect(r.mediana).toBe(4.5);
  });

  it('Mann-Whitney detecta muestras claramente distintas y no las iguales', () => {
    const a = Array.from({ length: 20 }, (_, i) => 10 + i * 0.1);
    const b = Array.from({ length: 20 }, (_, i) => i * 0.1);
    expect(mannWhitney(a, b).p).toBeLessThan(0.001);
    expect(mannWhitney(a, a).p).toBeGreaterThan(0.9);
  });

  it('Mann-Whitney maneja muestras vacías devolviendo p=1 sin NaN', () => {
    expect(mannWhitney([], [1, 2, 3])).toEqual({ u: 0, z: 0, p: 1 });
    expect(mannWhitney([1, 2], [])).toEqual({ u: 0, z: 0, p: 1 });
    expect(mannWhitney([], [])).toEqual({ u: 0, z: 0, p: 1 });
  });
});
