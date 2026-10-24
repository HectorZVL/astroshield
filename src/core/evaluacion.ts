// Evaluación de una configuración: cobertura, aptitud y restricciones.
// Implementa exactamente las fórmulas de docs/01-definicion-del-problema.md.
import { aVector, DEG, kmAGrados, muestrearDisco, RAD, type Vec3 } from './geo';
import type {
  Configuracion,
  Escenario,
  EstadoRegion,
  Evaluacion,
  EvaluacionRegion,
  Violacion,
  ZonaProhibida,
} from './tipos';

/** Escala (grados) del decaimiento de la guía de proximidad. */
export const ESCALA_GUIA = 20;
/** Tolerancia numérica: el borde de una zona se considera permitido. */
const EPS = 1e-9;

interface RegionPreparada {
  id: string;
  nombre: string;
  prioridad: EvaluacionRegion['prioridad'];
  peso: number;
  activa: boolean;
  centro: Vec3;
  muestras: Vec3[];
  /** Radio de la región en grados (ρ). */
  rho: number;
  /** cos(θ − ρ): un satélite con producto punto ≥ este valor cubre la región completa. */
  cosCompleta: number;
}

interface ZonaPreparada {
  id: string;
  tipo: 'desechos' | 'ocupada';
  centro: Vec3;
  radio: number;
  cosRadio: number;
}

/**
 * Datos precalculados de un escenario. Evaluar es lo que más veces se repite
 * (~12 000 veces por ejecución), así que los vectores de las muestras y los
 * cosenos se calculan una sola vez.
 */
export interface Contexto {
  escenario: Escenario;
  regiones: RegionPreparada[];
  zonas: ZonaPreparada[];
  cosHuella: number;
  pesoTotal: number;
}

// La caché usa la identidad del objeto: por eso los cambios de escenario
// (escenario.ts) siempre devuelven una copia nueva en lugar de mutar.
const cache = new WeakMap<Escenario, Contexto>();

const punto = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// atan2(|a×b|, a·b) en lugar de acos(a·b): acos pierde precisión cuando el
// ángulo es casi 0, justo cuando un satélite está sobre el centro de una zona.
const angulo = (a: Vec3, b: Vec3) => {
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  return Math.atan2(Math.hypot(cx, cy, cz), punto(a, b)) * DEG;
};

export function preparar(escenario: Escenario): Contexto {
  const enCache = cache.get(escenario);
  if (enCache) return enCache;
  const m = escenario.modelo;
  const regiones: RegionPreparada[] = escenario.regiones.map((r) => {
    const rho = kmAGrados(r.radioKm, m.radioTierraKm);
    return {
      id: r.id,
      nombre: r.nombre,
      prioridad: r.prioridad,
      peso: m.pesos[r.prioridad],
      activa: r.activa,
      centro: aVector(r),
      muestras: muestrearDisco(r, rho).map(aVector),
      rho,
      // Si la región es más grande que la huella, ningún satélite la cubre solo.
      cosCompleta: m.semiAnguloHuella > rho ? Math.cos((m.semiAnguloHuella - rho) * RAD) : 2,
    };
  });
  const prepZona = (z: ZonaProhibida, tipo: ZonaPreparada['tipo']): ZonaPreparada => {
    const rClamp = Math.min(180, Math.max(0, z.radioGrados));
    return {
      id: z.id,
      tipo,
      centro: aVector(z),
      radio: z.radioGrados,
      cosRadio: rClamp >= 180 ? -1 : Math.cos(rClamp * RAD),
    };
  };
  const zonas = [
    ...escenario.desechos.filter((z) => z.activa).map((z) => prepZona(z, 'desechos')),
    ...escenario.ocupadas.filter((z) => z.activa).map((z) => prepZona(z, 'ocupada')),
  ];
  const ctx: Contexto = {
    escenario,
    regiones,
    zonas,
    cosHuella: Math.cos(m.semiAnguloHuella * RAD),
    pesoTotal: regiones.filter((r) => r.activa).reduce((s, r) => s + r.peso, 0),
  };
  cache.set(escenario, ctx);
  return ctx;
}

/** Restricciones duras R1, R2 y R3 (docs/01, sección 4). */
export function violaciones(config: Configuracion, ctx: Contexto, vecs?: Vec3[]): Violacion[] {
  const v = vecs ?? config.map(aVector);
  const lista: Violacion[] = [];
  for (let i = 0; i < v.length; i++) {
    for (const z of ctx.zonas) {
      // Producto punto > cos(radio) <=> distancia < radio.
      // Si la zona tiene radio >= 180°, abarca toda la esfera.
      if (z.radio >= 180 || punto(v[i], z.centro) > z.cosRadio) {
        const mag = z.radio - angulo(v[i], z.centro);
        if (mag > EPS) lista.push({ tipo: z.tipo, satelite: i, contra: z.id, magnitud: mag });
      }
    }
  }
  const sep = ctx.escenario.modelo.separacionMinima;
  const cosSep = Math.cos(sep * RAD);
  for (let i = 0; i < v.length; i++) {
    for (let j = i + 1; j < v.length; j++) {
      if (punto(v[i], v[j]) > cosSep) {
        const mag = sep - angulo(v[i], v[j]);
        if (mag > EPS) lista.push({ tipo: 'separacion', satelite: i, contra: `satélite ${j + 1}`, magnitud: mag });
      }
    }
  }
  return lista;
}

export function evaluar(config: Configuracion, ctx: Contexto): Evaluacion {
  const m = ctx.escenario.modelo;
  const vecs = config.map(aVector);
  const theta = m.semiAnguloHuella;
  const W = ctx.pesoTotal;

  let C = 0;
  let R = 0;
  let G = 0;
  let cubiertas = 0;
  let activas = 0;
  const regiones: EvaluacionRegion[] = [];

  for (const r of ctx.regiones) {
    // Cobertura por unión: una muestra cuenta si la ve al menos un satélite.
    let vistas = 0;
    for (const s of r.muestras) {
      for (const v of vecs) {
        if (punto(s, v) >= ctx.cosHuella) {
          vistas++;
          break;
        }
      }
    }
    const fraccion = vistas / r.muestras.length;

    const completos: number[] = [];
    let dmin = Infinity;
    let masCercano = -1;
    vecs.forEach((v, i) => {
      const p = punto(r.centro, v);
      if (p >= r.cosCompleta) completos.push(i);
      const d = angulo(r.centro, v);
      if (d < dmin) {
        dmin = d;
        masCercano = i;
      }
    });

    let estado: EstadoRegion;
    if (!r.activa) estado = 'inactiva';
    else if (fraccion >= 1) estado = 'cubierta';
    else if (fraccion > 0) estado = 'parcial';
    else estado = 'no cubierta';

    if (r.activa) {
      activas++;
      if (estado === 'cubierta') cubiertas++;
      C += r.peso * fraccion;
      if (completos.length >= 2) R += r.peso;
      if (fraccion < 1) {
        const exceso = Math.max(0, dmin - (theta - r.rho));
        G += r.peso * (1 - fraccion) * Math.exp(-exceso / ESCALA_GUIA);
      }
    }

    regiones.push({
      id: r.id,
      nombre: r.nombre,
      prioridad: r.prioridad,
      peso: r.peso,
      fraccion,
      satelitesCompletos: completos,
      distanciaMinima: dmin,
      sateliteMasCercano: masCercano,
      estado,
    });
  }

  // Sin regiones activas no hay nada que cubrir: cobertura total por definición.
  const cobertura = W > 0 ? C / W : 1;
  const redundancia = W > 0 ? R / W : 0;
  const guia = W > 0 ? G / W : 0;
  const fitness = cobertura + m.beta * redundancia + m.gamma * guia;

  const viol = violaciones(config, ctx, vecs);
  const violacionTotal = viol.reduce((s, x) => s + x.magnitud, 0);

  return {
    fitness,
    cobertura,
    redundancia,
    guia,
    regiones,
    regionesCubiertas: cubiertas,
    regionesActivas: activas,
    violaciones: viol,
    violacionTotal,
    valida: viol.length === 0,
  };
}

/** Atajo: evaluar una configuración en un escenario sin manejar el contexto. */
export function evaluarEn(config: Configuracion, escenario: Escenario): Evaluacion {
  return evaluar(config, preparar(escenario));
}
