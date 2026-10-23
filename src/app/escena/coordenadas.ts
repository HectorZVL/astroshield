// Conversión del modelo (lat/lon en grados) al espacio 3D de Three.js.
// Convención: Y hacia el polo norte, lon 0 hacia +X y lon 90° hacia −Z.
// Coincide con cómo SphereGeometry aplica una textura equirectangular, así
// los puntos caen exactamente sobre el mapa dibujado.
import { Vector3 } from 'three';
import { destino } from '../../core/geo';
import type { LatLon } from '../../core/tipos';

const RAD = Math.PI / 180;

/** Radio visual de la capa de satélites (decorativo: el modelo no usa altitud, S2). */
export const RADIO_SATELITES = 1.24;

export function aVector3(p: LatLon, radio = 1): Vector3 {
  const la = p.lat * RAD;
  const lo = p.lon * RAD;
  return new Vector3(radio * Math.cos(la) * Math.cos(lo), radio * Math.sin(la), -radio * Math.cos(la) * Math.sin(lo));
}

/** Puntos de un círculo geodésico (borde de una huella, zona o región). */
export function circuloGeodesico(centro: LatLon, radioGrados: number, segmentos: number, radio = 1): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i <= segmentos; i++) pts.push(aVector3(destino(centro, (360 * i) / segmentos, radioGrados), radio));
  return pts;
}
