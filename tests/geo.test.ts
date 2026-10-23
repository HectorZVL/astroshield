import { describe, expect, it } from 'vitest';
import {
  aVector,
  desdeVector,
  destino,
  distancia,
  interpolar,
  kmAGrados,
  mallaFibonacci,
  muestrearDisco,
  normalizarLon,
  puntoAleatorio,
} from '../src/core/geo';
import { crearRng } from '../src/core/rng';

describe('geometría esférica', () => {
  it('300 km equivalen a ~2.698° con R = 6371 km', () => {
    expect(kmAGrados(300, 6371)).toBeCloseTo(2.698, 3);
  });

  it('distancias conocidas: polo a ecuador = 90°, antípodas = 180°', () => {
    expect(distancia({ lat: 90, lon: 0 }, { lat: 0, lon: 77 })).toBeCloseTo(90, 9);
    expect(distancia({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(180, 9);
    expect(distancia({ lat: 10, lon: 20 }, { lat: 10, lon: 20 })).toBe(0);
  });

  it('la distancia es simétrica y cruza el antimeridiano correctamente', () => {
    const a = { lat: 0, lon: 179 };
    const b = { lat: 0, lon: -179 };
    expect(distancia(a, b)).toBeCloseTo(2, 9);
    expect(distancia(b, a)).toBeCloseTo(distancia(a, b), 12);
  });

  it('Yucatán–California ≈ 31.1° (dato usado en el análisis de la cota)', () => {
    expect(distancia({ lat: 20.5, lon: -89 }, { lat: 36.8, lon: -119.4 })).toBeCloseTo(31.1, 1);
  });

  it('destino() recorre exactamente la distancia pedida', () => {
    const rng = crearRng(7);
    for (let i = 0; i < 200; i++) {
      const p = puntoAleatorio(rng);
      const d = rng.rango(0, 170);
      const q = destino(p, rng.rango(0, 360), d);
      expect(distancia(p, q)).toBeCloseTo(d, 6);
    }
  });

  it('vector <-> lat/lon es reversible', () => {
    const rng = crearRng(3);
    for (let i = 0; i < 100; i++) {
      const p = puntoAleatorio(rng);
      expect(distancia(p, desdeVector(aVector(p)))).toBeLessThan(1e-9);
    }
  });

  it('normalizarLon deja longitudes en (-180, 180]', () => {
    expect(normalizarLon(190)).toBeCloseTo(-170);
    expect(normalizarLon(-180)).toBe(180);
    expect(normalizarLon(540)).toBe(180);
  });

  it('el muestreo de disco tiene 37 puntos, todos dentro del radio', () => {
    const c = { lat: 36, lon: 138 };
    const pts = muestrearDisco(c, 2.698);
    expect(pts).toHaveLength(37);
    for (const p of pts) expect(distancia(c, p)).toBeLessThanOrEqual(2.698 + 1e-9);
  });

  it('interpolar va de a hasta b por el gran círculo', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 90 };
    expect(distancia(interpolar(a, b, 0), a)).toBeLessThan(1e-9);
    expect(distancia(interpolar(a, b, 1), b)).toBeLessThan(1e-9);
    expect(distancia(interpolar(a, b, 0.5), { lat: 0, lon: 45 })).toBeLessThan(1e-9);
  });

  it('los puntos aleatorios son uniformes en la esfera (no se amontonan en polos)', () => {
    const rng = crearRng(11);
    let hemisferioNorte = 0;
    let casquetePolar = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const p = puntoAleatorio(rng);
      if (p.lat > 0) hemisferioNorte++;
      if (p.lat > 60) casquetePolar++;
    }
    expect(hemisferioNorte / n).toBeCloseTo(0.5, 1);
    // Área del casquete lat>60°: (1 - sen 60°)/2 ≈ 0.067
    expect(casquetePolar / n).toBeCloseTo(0.067, 1);
  });

  it('la malla de Fibonacci cubre la esfera sin huecos grandes', () => {
    const malla = mallaFibonacci(2000);
    const rng = crearRng(5);
    for (let i = 0; i < 50; i++) {
      const p = puntoAleatorio(rng);
      const dmin = Math.min(...malla.map((m) => distancia(p, m)));
      expect(dmin).toBeLessThan(5);
    }
  });
});

describe('generador con semilla', () => {
  it('misma semilla -> misma secuencia; distinta semilla -> distinta', () => {
    const a = crearRng(42);
    const b = crearRng(42);
    const c = crearRng(43);
    const sa = Array.from({ length: 50 }, () => a.siguiente());
    const sb = Array.from({ length: 50 }, () => b.siguiente());
    const sc = Array.from({ length: 50 }, () => c.siguiente());
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
  });

  it('valores en [0, 1) y normal con media ~0 y desviación ~1', () => {
    const r = crearRng(1);
    let s = 0;
    let s2 = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const u = r.siguiente();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      const z = r.normal();
      s += z;
      s2 += z * z;
    }
    expect(s / n).toBeCloseTo(0, 1);
    expect(Math.sqrt(s2 / n)).toBeCloseTo(1, 1);
  });
});
