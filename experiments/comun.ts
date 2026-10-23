// Utilidades compartidas por los experimentos: formato de tablas Markdown,
// escritura de resultados y métricas derivadas de una configuración.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluarEn } from '../src/core/evaluacion';
import { distancia } from '../src/core/geo';
import type { Configuracion, Escenario, ResultadoEjecucion } from '../src/core/tipos';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const RESULTADOS = join(RAIZ, 'results');

/** Cota teórica de la aptitud en el escenario inicial (docs/01, sección 7). */
export const F_ESTRELLA = 1 + 0.1 * (10 / 13);
export const TOL = 1e-9;

export function guardar(nombre: string, contenido: unknown): void {
  const ruta = join(RESULTADOS, nombre);
  mkdirSync(dirname(ruta), { recursive: true });
  const texto = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 1);
  writeFileSync(ruta, texto.endsWith('\n') ? texto : texto + '\n', 'utf8');
}

export const f = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');
export const pct = (x: number, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)} %` : '—');

export function tabla(cabeceras: string[], filas: Array<Array<string | number>>): string {
  const linea = (c: Array<string | number>) => `| ${c.map(String).join(' | ')} |`;
  return [linea(cabeceras), linea(cabeceras.map(() => '---')), ...filas.map(linea)].join('\n');
}

/** Distancia de cada satélite a la zona prohibida más cercana menos su radio (margen; < 0 = adentro). */
export function margenes(config: Configuracion, escenario: Escenario, tipo: 'desechos' | 'ocupadas') {
  const zonas = escenario[tipo].filter((z) => z.activa);
  return config.map((s) => {
    let mejor = { zona: '—', margen: Infinity };
    for (const z of zonas) {
      const m = distancia(s, z) - z.radioGrados;
      if (m < mejor.margen) mejor = { zona: z.nombre, margen: m };
    }
    return mejor;
  });
}

/** Margen mínimo de una configuración respecto a un conjunto de zonas. */
export const margenMinimo = (config: Configuracion, escenario: Escenario, tipo: 'desechos' | 'ocupadas') =>
  Math.min(...margenes(config, escenario, tipo).map((m) => m.margen));

/** Regiones que cada satélite cubre completamente (por sí solo). */
export function trabajoDeSatelites(config: Configuracion, escenario: Escenario): string[] {
  const ev = evaluarEn(config, escenario);
  return config.map((_, i) => {
    const regiones = ev.regiones.filter((r) => r.satelitesCompletos.includes(i)).map((r) => r.nombre);
    return regiones.length ? regiones.join(' + ') : '(sin región completa)';
  });
}

export const generacionHasta = (r: ResultadoEjecucion, objetivo: number) =>
  r.historial.findIndex((h) => h.mejorValida && h.mejor >= objetivo - TOL);

/**
 * Verificación independiente: toda ejecución reportada como VÁLIDA se vuelve a
 * evaluar desde cero; si apareciera una violación, el reporte lo diría.
 */
export const registroVerificacion = { revisadas: 0, inconsistencias: [] as string[] };

export function verificar(r: ResultadoEjecucion, etiqueta: string): ResultadoEjecucion {
  const ev = evaluarEn(r.final.config, r.escenario);
  registroVerificacion.revisadas++;
  const dijoValida = r.estado === 'VÁLIDA';
  if (dijoValida !== ev.valida || Math.abs(ev.fitness - r.final.eval.fitness) > TOL) {
    registroVerificacion.inconsistencias.push(etiqueta);
  }
  return r;
}

export const rango = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
