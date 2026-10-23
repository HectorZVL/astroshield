// Correspondencia entre los datos del modelo y lo que se dibuja en el globo.
// La escena 3D convierte cada lat/lon con aVector3 (src/app/escena/coordenadas.ts);
// si esa conversión no coincidiera con la del núcleo o con la textura, los
// satélites aparecerían sobre otro punto del mapa aunque los datos fueran correctos.
import { SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aVector3, circuloGeodesico, RADIO_SATELITES } from '../src/app/escena/coordenadas';
import { escenarioInicial } from '../src/core/escenario';
import { aVector, desdeVector, distancia, puntoAleatorio } from '../src/core/geo';
import { crearRng } from '../src/core/rng';
import referencia from '../results/run-referencia.json';
import type { LatLon, ResultadoEjecucion } from '../src/core/tipos';

/** Posición 3D -> lat/lon, usando la conversión del núcleo (Three: Y = norte, −Z = lon 90°). */
const aLatLon = (v: Vector3): LatLon => desdeVector([v.x, -v.z, v.y]);

describe('correspondencia datos ↔ globo 3D', () => {
  const rng = crearRng(7);
  const puntos = Array.from({ length: 300 }, () => puntoAleatorio(rng));

  it('aVector3 es la misma conversión del núcleo, solo con los ejes de Three.js', () => {
    for (const p of puntos) {
      const [x, y, z] = aVector(p);
      const v = aVector3(p);
      expect(v.x).toBeCloseTo(x, 12);
      expect(v.y).toBeCloseTo(z, 12);
      expect(v.z).toBeCloseTo(-y, 12);
    }
  });

  it('volver de la posición dibujada a lat/lon devuelve la coordenada original', () => {
    for (const p of puntos) {
      const q = aLatLon(aVector3(p, RADIO_SATELITES));
      expect(distancia(p, q)).toBeLessThan(1e-9);
    }
  });

  it('cada satélite del run de referencia se dibuja exactamente en su coordenada', () => {
    const run = (referencia as unknown as { resultado: ResultadoEjecucion }).resultado;
    for (const s of run.final.config) {
      expect(distancia(s, aLatLon(aVector3(s, RADIO_SATELITES)))).toBeLessThan(1e-9);
    }
  });

  it('la textura equirectangular cae donde dice aVector3 (costas sobre su lat/lon)', () => {
    // globo.ts dibuja el mapa con x = (lon + 180) / 360 y y = (90 − lat) / 180.
    // Con la UV de SphereGeometry (flipY), eso equivale a lon = 360·u − 180 y lat = 180·v − 90.
    const g = new SphereGeometry(1, 72, 36);
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    let comparados = 0;
    for (let i = 0; i < pos.count; i++) {
      const lat = 180 * uv.getY(i) - 90;
      if (Math.abs(lat) > 89.9) continue; // en los polos la longitud no está definida
      const esperado = aVector3({ lat, lon: 360 * uv.getX(i) - 180 });
      const real = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      expect(real.distanceTo(esperado)).toBeLessThan(1e-6);
      comparados++;
    }
    expect(comparados).toBeGreaterThan(2000);
  });

  it('las huellas, regiones y zonas se dibujan con el radio angular del modelo', () => {
    const e = escenarioInicial();
    const casos: Array<[LatLon, number]> = [
      ...puntos.slice(0, 20).map((p) => [p, e.modelo.semiAnguloHuella] as [LatLon, number]),
      ...[...e.desechos, ...e.ocupadas].map((z) => [z, z.radioGrados] as [LatLon, number]),
    ];
    for (const [centro, radio] of casos) {
      for (const v of circuloGeodesico(centro, radio, 64, 1.004)) {
        expect(distancia(centro, aLatLon(v))).toBeCloseTo(radio, 9);
      }
    }
  });
});
