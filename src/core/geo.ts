// Geometría sobre la esfera unitaria. Todas las distancias son ángulos
// centrales en grados (S1: Tierra esférica).
import type { LatLon } from './tipos';
import type { Rng } from './rng';

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

export type Vec3 = [number, number, number];

/** Kilómetros sobre la superficie -> ángulo central en grados. */
export function kmAGrados(km: number, radioTierraKm: number): number {
  return (km / radioTierraKm) * DEG;
}

/** Normaliza longitud a (-180, 180]. */
export function normalizarLon(lon: number): number {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

/**
 * Distancia de gran círculo (haversine). Se usa haversine y no la ley de
 * cosenos porque esta última pierde precisión en distancias pequeñas,
 * justo las que importan para decidir si un punto está dentro de una huella.
 */
export function distancia(a: LatLon, b: LatLon): number {
  const la1 = a.lat * RAD;
  const la2 = b.lat * RAD;
  const dLa = la2 - la1;
  const dLo = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * DEG;
}

/** lat/lon -> vector unitario (x hacia lon 0, z hacia el polo norte). */
export function aVector(p: LatLon): Vec3 {
  const la = p.lat * RAD;
  const lo = p.lon * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

export function desdeVector(v: Vec3): LatLon {
  const n = Math.hypot(v[0], v[1], v[2]);
  const z = Math.max(-1, Math.min(1, v[2] / n));
  return { lat: Math.asin(z) * DEG, lon: normalizarLon(Math.atan2(v[1], v[0]) * DEG) };
}

/**
 * Punto a una distancia angular `d` desde `p` en el rumbo `rumbo`
 * (grados, 0 = norte). Fórmula de destino sobre la esfera.
 */
export function destino(p: LatLon, rumbo: number, d: number): LatLon {
  const la1 = p.lat * RAD;
  const lo1 = p.lon * RAD;
  const b = rumbo * RAD;
  const dr = d * RAD;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(b));
  const lo2 =
    lo1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 * DEG, lon: normalizarLon(lo2 * DEG) };
}

/**
 * Punto uniforme sobre la esfera. Se muestrea z = sen(lat) uniforme:
 * muestrear la latitud uniforme amontonaría puntos en los polos.
 */
export function puntoAleatorio(rng: Rng): LatLon {
  const z = rng.rango(-1, 1);
  return { lat: Math.asin(z) * DEG, lon: normalizarLon(rng.rango(-180, 180)) };
}

/** Desplaza `p` una distancia `d` en una dirección aleatoria uniforme. */
export function desplazarAleatorio(p: LatLon, d: number, rng: Rng): LatLon {
  return destino(p, rng.rango(0, 360), d);
}

/**
 * Interpolación esférica (slerp) entre dos puntos, t ∈ [0, 1].
 * Solo se usa para animaciones: el camino visual sigue el gran círculo.
 */
export function interpolar(a: LatLon, b: LatLon, t: number): LatLon {
  const va = aVector(a);
  const vb = aVector(b);
  const cos = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const om = Math.acos(cos);
  if (om < 1e-9) return { ...a };
  const s = Math.sin(om);
  const ka = Math.sin((1 - t) * om) / s;
  const kb = Math.sin(t * om) / s;
  return desdeVector([ka * va[0] + kb * vb[0], ka * va[1] + kb * vb[1], ka * va[2] + kb * vb[2]]);
}

/**
 * Puntos de muestreo de un disco: centro + anillos a r/3, 2r/3 y r con
 * 6, 12 y 18 puntos (37 en total). Ver docs/01, sección 2.2.
 */
export function muestrearDisco(centro: LatLon, radioGrados: number): LatLon[] {
  const puntos: LatLon[] = [{ lat: centro.lat, lon: centro.lon }];
  const anillos: Array<[number, number]> = [
    [1 / 3, 6],
    [2 / 3, 12],
    [1, 18],
  ];
  for (const [fr, n] of anillos) {
    for (let k = 0; k < n; k++) puntos.push(destino(centro, (360 * k) / n, radioGrados * fr));
  }
  return puntos;
}

/** Malla casi uniforme de n puntos (espiral de Fibonacci). */
export function mallaFibonacci(n: number): LatLon[] {
  const puntos: LatLon[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n;
    puntos.push({ lat: Math.asin(z) * DEG, lon: normalizarLon(i * phi * DEG) });
  }
  return puntos;
}
