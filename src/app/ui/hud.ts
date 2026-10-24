// Plantillas HTML del HUD. Son funciones puras: reciben datos del núcleo y
// devuelven HTML. Ningún número se calcula aquí; todo viene de la evaluación.
import type { NivelCalidad } from '../../core/comparacion';
import type { Escenario, EstadoRegion, EstadoSolucion, Evaluacion, ParametrosAG, ZonaProhibida } from '../../core/tipos';
import { semantica, semanticaGrafica, semanticaInterfaz } from '../tema';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const claseChip: Record<EstadoSolucion, string> = { 'VÁLIDA': 'valida', 'INVÁLIDA': 'invalida', INVIABLE: 'inviable' };
const textoChip: Record<EstadoSolucion, string> = { 'VÁLIDA': 'Válida', 'INVÁLIDA': 'Inválida', INVIABLE: 'Inviable' };
const colorEstado: Record<EstadoRegion, string> = {
  cubierta: semanticaInterfaz.regionCubierta,
  parcial: semanticaInterfaz.regionParcial,
  'no cubierta': semanticaInterfaz.regionNoCubierta,
  inactiva: semanticaInterfaz.inactivo,
};
const textoEstado: Record<EstadoRegion, string> = { cubierta: 'Cubierta', parcial: 'Parcial', 'no cubierta': 'Sin cubrir', inactiva: 'Inactiva' };

/** Iconos de trazo (heredan el color del texto). */
const svg = (d: string) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const iconos = {
  reproducir: svg('<path d="M8 5.5v13l10-6.5z"/>'),
  pausar: svg('<path d="M8 5v14M16 5v14"/>'),
  evolucionar: svg('<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>'),
  detener: svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>'),
  volver: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  cerrar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  mas: svg('<path d="M12 5v14M5 12h14"/>'),
  plegar: svg('<path d="m6 9 6 6 6-6"/>'),
  detalles: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  verificado: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
};

const logo = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="8.5" style="fill:var(--acento)"/>
  <ellipse cx="20" cy="20" rx="17" ry="7" style="fill:none;stroke:var(--texto)" stroke-width="1.4" opacity=".55" transform="rotate(-24 20 20)"/>
  <circle cx="34.6" cy="13.6" r="2.4" style="fill:var(--texto)"/>
</svg>`;

export function esqueleto(): string {
  return `
  <header class="superficie barra">
    <div class="marca">${logo}<div><h1>AstroShield</h1><p class="subtitulo" id="origen"></p></div></div>
    <div class="indicadores" id="metricas"></div>
    <div class="estado" id="chip"></div>
    <button class="boton fantasma boton-detalles" id="boton-detalles" aria-label="Detalles del run" aria-expanded="false" aria-controls="detalles">${iconos.detalles}<span>Detalles del run</span></button>
  </header>
  <section class="superficie detalles oculto" id="detalles" aria-label="Detalles del run"></section>
  <aside class="superficie panel-izq" id="panel-lateral" aria-label="Escenario y parámetros">
    <div class="panel-cabecera"><h2>Escenario</h2><button class="boton icono" data-plegar aria-expanded="true" aria-label="Plegar panel de escenario">${iconos.plegar}</button></div>
    <div class="panel-cuerpo" id="panel-izq"></div>
  </aside>
  <aside class="superficie panel-der" aria-label="Regiones de observación">
    <div class="panel-cabecera"><h2>Regiones</h2><span class="resumen" id="resumen-regiones"></span><button class="boton icono" data-plegar aria-expanded="true" aria-label="Plegar panel de regiones">${iconos.plegar}</button></div>
    <div class="panel-cuerpo">
      <div id="tabla-regiones"></div>
      <div id="aviso-config"></div>
      <details class="leyenda-plegable" open><summary>Leyenda</summary>${leyenda()}</details>
    </div>
  </aside>
  <section class="superficie dock" aria-label="Evolución de la aptitud">
    <div class="dock-titulo">
      <h2>Evolución de la aptitud</h2>
      <button class="boton icono" data-plegar aria-expanded="true" aria-controls="dock-contenido" aria-label="Plegar gráfica de evolución">${iconos.plegar}</button>
    </div>
    <div class="dock-contenido" id="dock-contenido">
      <div class="cabecera">
      <div class="series" aria-hidden="true">
        <span><i style="background:${semanticaGrafica.mejor}"></i>Mejor</span>
        <span><i style="background:${semanticaGrafica.media}"></i>Media</span>
        <span><i class="discontinua" style="border-color:${semanticaGrafica.peor}"></i>Peor</span>
        <span><i class="bloque" style="background:${semanticaGrafica.validos}"></i>Válidos</span>
        <span><i class="discontinua" style="border-color:${semanticaGrafica.cota}"></i>Cota F*</span>
      </div>
      <div class="segmentado" role="group" aria-label="Configuración mostrada" id="vista">
        <button data-vista="inicial">Inicial</button><button data-vista="final" class="activo">Final</button><button data-vista="ambas">Comparar</button>
      </div>
      </div>
      <div class="grafica" id="grafica"></div>
      <div class="tiempo">
        <button class="boton icono redondo" id="reproducir" aria-label="Reproducir generaciones">${iconos.reproducir}</button>
        <input type="range" id="linea-tiempo" min="0" max="150" value="150" aria-label="Generación mostrada" />
        <span class="cifra" id="etiqueta-gen"></span>
      </div>
    </div>
  </section>
  <div class="superficie tarjeta oculto" id="tarjeta" role="dialog" aria-label="Detalle del satélite"></div>`;
}

function leyenda(): string {
  const item = (clase: string, color: string, texto: string) => `<li><span class="simbolo ${clase}" style="--c:${color}"></span>${texto}</li>`;
  const grupo = (titulo: string, items: string[]) => `<div class="leyenda-grupo"><h3>${titulo}</h3><ul>${items.join('')}</ul></div>`;
  return `<div class="leyenda">${[
    grupo('Constelación', [
      item('satelite', semantica.luzSatelite, 'Satélite (final)'),
      item('satelite', semantica.sateliteInicial, 'Satélite (inicial)'),
      item('huella', semantica.huella, 'Huella de cobertura'),
      item('linea', semantica.rayo, 'Cubre la región completa'),
    ]),
    grupo('Regiones', [
      item('disco', semantica.regionCubierta, 'Cubierta'),
      item('disco', semantica.regionParcial, 'Parcial'),
      item('disco', semantica.regionNoCubierta, 'Sin cubrir'),
      item('disco', semantica.inactivo, 'Inactiva'),
    ]),
    grupo('Restricciones', [
      item('rayas', semantica.desechos, 'Zona de desechos'),
      item('anillo', semantica.objetoOcupado, 'Objeto ocupado y exclusión'),
    ]),
  ].join('')}</div>`;
}

export interface DatosBarra {
  origen: string;
  /** Archivo o lugar de donde salen los datos mostrados. */
  fuente: string;
  verificacion: { ok: boolean; texto: string } | null;
  p: ParametrosAG;
  ev: Evaluacion;
  chip: EstadoSolucion;
  contextoChip: string;
  nivel: NivelCalidad;
  evaluaciones: number;
  estadoRun: EstadoSolucion;
}

/** Línea bajo el título: de dónde viene lo mostrado y si se verificó. */
export function origen(d: DatosBarra): string {
  const v = d.verificacion;
  return `${d.origen}${v ? ` · <span class="${v.ok ? 'verificado' : 'no-verificado'}" title="${esc(v.texto)}">${v.ok ? `${iconos.verificado}Verificado` : 'No coincide'}</span>` : ''}`;
}

/** Los tres indicadores principales. El resto vive en «Detalles del run». */
export function metricas(d: DatosBarra): string {
  const m = (t: string, v: string, extra = '') => `<div class="indicador"><span>${t}</span><b>${v}</b>${extra}</div>`;
  return `
    ${m('Aptitud', d.ev.fitness.toFixed(5))}
    ${m('Cobertura', `${(d.ev.cobertura * 100).toFixed(1)} %`)}
    ${m('Regiones', `${d.ev.regionesCubiertas}<small> de ${d.ev.regionesActivas}</small>`)}`;
}

export function chip(d: DatosBarra): string {
  return `<span class="chip ${claseChip[d.chip]}" role="status" aria-live="polite" title="${esc(d.contextoChip)}">${textoChip[d.chip]}</span>
    <span class="contexto">${esc(d.contextoChip)} · ${d.nivel}</span>`;
}

export function detalles(d: DatosBarra): string {
  const f = (t: string, v: string) => `<div><dt>${t}</dt><dd>${v}</dd></div>`;
  return `<dl class="lista-detalles">
    ${f('Origen', `${d.origen}<br><span class="tenue">${d.fuente}</span>`)}
    ${d.verificacion ? f('Verificación', `<span class="${d.verificacion.ok ? 'verificado' : 'no-verificado'}">${esc(d.verificacion.texto)}</span>`) : ''}
    ${f('Semilla', String(d.p.semilla))}
    ${f('Población · generaciones', `${d.p.poblacion} · ${d.p.generaciones}`)}
    ${f('Mutación σ · probabilidad', `${d.p.sigmaMutacion}° · ${d.p.probMutacion}`)}
    ${f('Probabilidad de cruce', String(d.p.probCruce))}
    ${f('Evaluaciones', d.evaluaciones ? d.evaluaciones.toLocaleString('es-MX') : '—')}
    ${f('Redundancia R', d.ev.redundancia.toFixed(3))}
  </dl>`;
}

export function tablaRegiones(ev: Evaluacion): string {
  const filas = ev.regiones
    .map((r) => {
      const color = colorEstado[r.estado];
      const sats = r.satelitesCompletos.map((i) => `S${i + 1}`).join(' · ') || 'ningún satélite completo';
      const pct = r.estado === 'inactiva' ? '—' : `${(r.fraccion * 100).toFixed(0)} %`;
      return `<li class="region ${r.estado === 'inactiva' ? 'inactiva' : ''}" data-region="${r.id}" tabindex="0" role="button" aria-label="Volar a ${esc(r.nombre)}: ${textoEstado[r.estado]}, ${pct}">
        <div class="region-fila"><span class="nombre">${esc(r.nombre)}</span><span class="pct">${pct}</span></div>
        <div class="barra-cob"><i style="width:${(r.fraccion * 100).toFixed(1)}%;background:${color}"></i></div>
        <div class="region-meta">
          <span class="estado-region" style="--c:${color}">${textoEstado[r.estado]}</span>
          <span class="prio prio-${r.prioridad}">Prioridad ${r.prioridad.toLowerCase()}</span>
          <span class="sats">${sats}</span>
        </div>
      </li>`;
    })
    .join('');
  return `<ul class="regiones">${filas}</ul>`;
}

function filaZona(z: ZonaProhibida, tipo: 'desechos' | 'ocupadas', borrable: boolean): string {
  const color = tipo === 'desechos' ? semanticaInterfaz.desechos : semanticaInterfaz.objetoOcupado;
  const campo = (k: 'lat' | 'lon' | 'radioGrados', t: string, min: number, max: number) =>
    `<label>${t}<input type="number" step="0.5" min="${min}" max="${max}" value="${z[k]}" data-zona="${z.id}" data-campo="${k}" /></label>`;
  return `<div class="zona-item ${z.activa ? '' : 'apagada'}">
    <div class="fila"><span class="punto" style="background:${color}"></span><label class="nombre-zona">${esc(z.nombre)}</label>
      <input type="checkbox" class="interruptor" ${z.activa ? 'checked' : ''} data-zona="${z.id}" data-campo="activa" aria-label="Activar ${esc(z.nombre)}" />
      ${borrable ? `<button class="boton icono peligro" data-borrar="${z.id}" aria-label="Eliminar ${esc(z.nombre)}">${iconos.cerrar}</button>` : ''}
    </div>
    <div class="coords">${campo('lat', 'Latitud', -90, 90)}${campo('lon', 'Longitud', -180, 180)}${campo('radioGrados', 'Radio °', 0.5, 179)}</div>
  </div>`;
}

/** Sección plegable; `abiertas` conserva qué secciones dejó abiertas el usuario entre redibujos. */
function seccion(id: string, titulo: string, contenido: string, abiertas: ReadonlySet<string>, extra = ''): string {
  return `<details class="seccion" data-seccion="${id}" ${abiertas.has(id) ? 'open' : ''}><summary><span>${titulo}</span>${extra}</summary><div class="seccion-cuerpo">${contenido}</div></details>`;
}

export function panelEscenario(e: Escenario, p: ParametrosAG, ejecutando: boolean, caliente: boolean, abiertas: ReadonlySet<string>): string {
  const num = (k: keyof ParametrosAG, t: string, step: number, min: number, max: number) =>
    `<label>${t}<input type="number" step="${step}" min="${min}" max="${max}" value="${p[k] as number}" data-param="${k}" /></label>`;
  const activas = (zs: ZonaProhibida[]) => `<span class="contador">${zs.filter((z) => z.activa).length} de ${zs.length}</span>`;
  const regiones = e.regiones
    .map(
      (r) => `<div class="fila"><input type="checkbox" ${r.activa ? 'checked' : ''} data-region-activa="${r.id}" aria-label="Activar ${esc(r.nombre)}" />
        <label>${esc(r.nombre)}</label>
        <select class="mini" data-prioridad="${r.id}" aria-label="Prioridad de ${esc(r.nombre)}">
          ${(['Alta', 'Media', 'Normal'] as const).map((x) => `<option ${x === r.prioridad ? 'selected' : ''}>${x}</option>`).join('')}
        </select></div>`,
    )
    .join('');
  return `
    ${seccion(
      'presets',
      'Escenarios rápidos',
      `<div class="presets">
        <button class="boton" data-preset="inicial">Inicial (enunciado)</button>
        <button class="boton" data-preset="reducido">Espacio reducido ×4</button>
        <button class="boton" data-preset="dificil">Difícil: Yucatán</button>
        <button class="boton" data-preset="inviable">Inviable</button>
      </div>
      <button class="boton fantasma ancho" data-accion="referencia">${iconos.volver}Volver al run de referencia</button>`,
      abiertas,
    )}
    ${seccion('regiones', 'Regiones y prioridades', regiones, abiertas, `<span class="contador">${e.regiones.filter((r) => r.activa).length} de ${e.regiones.length}</span>`)}
    ${seccion(
      'desechos',
      'Zonas de desechos',
      `${e.desechos.map((z) => filaZona(z, 'desechos', z.id.startsWith('usuario-'))).join('')}
      <button class="boton fantasma ancho" data-agregar="desechos">${iconos.mas}Agregar zona</button>`,
      abiertas,
      activas(e.desechos),
    )}
    ${seccion(
      'ocupadas',
      'Objetos ocupados',
      `${e.ocupadas.map((z) => filaZona(z, 'ocupadas', z.id.startsWith('usuario-'))).join('')}
      <button class="boton fantasma ancho" data-agregar="ocupadas">${iconos.mas}Agregar objeto</button>`,
      abiertas,
      activas(e.ocupadas),
    )}
    ${seccion(
      'modelo',
      'Modelo de cobertura',
      `<div class="params">
        <label>Huella θ (°)<input type="number" step="0.5" min="3" max="60" value="${e.modelo.semiAnguloHuella}" data-modelo="semiAnguloHuella" /></label>
        <label>Separación mínima (°)<input type="number" step="0.5" min="0" max="30" value="${e.modelo.separacionMinima}" data-modelo="separacionMinima" /></label>
      </div>`,
      abiertas,
    )}
    ${seccion(
      'algoritmo',
      'Algoritmo evolutivo',
      `<div class="params">
        ${num('semilla', 'Semilla', 1, 0, 2 ** 31)}${num('poblacion', 'Población N', 2, 4, 400)}
        ${num('generaciones', 'Generaciones G', 10, 0, 2000)}${num('torneo', 'Torneo k', 1, 1, 10)}
        ${num('probCruce', 'Prob. de cruce', 0.05, 0, 1)}${num('probMutacion', 'Prob. de mutación', 0.05, 0, 1)}
        ${num('sigmaMutacion', 'Paso σ (°)', 0.5, 0.1, 90)}${num('probReinicio', 'Prob. de reinicio', 0.01, 0, 1)}
        ${num('elitismo', 'Elitismo', 1, 0, 50)}
        <label>Cruce alineado<select data-param="alinearCruce"><option value="1" ${p.alinearCruce ? 'selected' : ''}>Sí</option><option value="0" ${p.alinearCruce ? '' : 'selected'}>No</option></select></label>
      </div>`,
      abiertas,
    )}
    <div class="panel-pie">
      <label class="fila caliente"><input type="checkbox" id="caliente" ${caliente ? 'checked' : ''} /><span>Partir de la configuración mostrada</span></label>
      <div class="botones">
        <button class="boton primario" data-accion="evolucionar" ${ejecutando ? 'disabled' : ''}>${iconos.evolucionar}${ejecutando ? 'Evolucionando…' : 'Evolucionar'}</button>
        ${ejecutando ? `<button class="boton peligro" data-accion="detener">${iconos.detener}Detener</button>` : ''}
      </div>
      <div class="progreso ${ejecutando ? '' : 'oculto'}"><i id="barra-progreso" style="width:0%"></i></div>
      <div id="aviso-factibilidad"></div>
    </div>`;
}
