// Plantillas HTML del HUD. Son funciones puras: reciben datos del núcleo y
// devuelven HTML. Ningún número se calcula aquí; todo viene de la evaluación.
import type { NivelCalidad } from '../../core/comparacion';
import type { Escenario, EstadoSolucion, Evaluacion, ParametrosAG, ZonaProhibida } from '../../core/tipos';
import { paleta, semantica } from '../tema';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const claseChip: Record<EstadoSolucion, string> = { 'VÁLIDA': 'valida', 'INVÁLIDA': 'invalida', INVIABLE: 'inviable' };
const colorEstado = { cubierta: semantica.regionCubierta, parcial: semantica.regionParcial, 'no cubierta': semantica.regionNoCubierta, inactiva: paleta.textoTenue };

export function esqueleto(): string {
  return `
  <header class="vidrio barra">
    <div class="marca"><div class="logo" aria-hidden="true"></div><div><h1>ASTROSHIELD</h1><div id="origen"></div></div></div>
    <div class="metricas" id="metricas"></div>
    <div id="chip"></div>
  </header>
  <aside class="vidrio panel-izq" id="panel-izq" aria-label="Escenario y parámetros"></aside>
  <aside class="vidrio panel-der" aria-label="Regiones">
    <h2 class="titulo-panel"><span>Regiones de observación</span><b id="resumen-regiones"></b></h2>
    <div id="tabla-regiones"></div>
    <div id="aviso-config"></div>
    <h2 class="titulo-panel" style="margin-top:14px"><span>Leyenda</span></h2>
    <div class="leyenda">${leyenda()}</div>
  </aside>
  <section class="vidrio dock" aria-label="Evolución">
    <div class="cabecera">
      <h2 class="titulo-panel" style="margin:0"><span>Evolución de la aptitud</span></h2>
      <div class="series">
        <span><i style="background:${semantica.mejor}"></i>mejor</span>
        <span><i style="background:${semantica.media}"></i>media</span>
        <span><i style="background:${semantica.peor}"></i>peor</span>
        <span><i style="background:${semantica.validos};opacity:.5"></i>válidos</span>
        <span><i class="discontinua" style="border-color:${semantica.cota}"></i>cota F*</span>
      </div>
      <div class="segmentado" role="group" aria-label="Configuración mostrada" id="vista">
        <button data-vista="inicial">Inicial</button><button data-vista="final" class="activo">Final</button><button data-vista="ambas">Comparar</button>
      </div>
    </div>
    <div class="grafica" id="grafica"></div>
    <div class="tiempo">
      <button class="boton" id="reproducir" aria-label="Reproducir generaciones" style="padding:5px 10px">▶</button>
      <input type="range" id="linea-tiempo" min="0" max="150" value="150" aria-label="Generación mostrada" />
      <span class="mono" id="etiqueta-gen" style="min-width:110px;text-align:right"></span>
    </div>
  </section>
  <div class="vidrio tarjeta oculto" id="tarjeta" role="dialog"></div>`;
}

function leyenda(): string {
  const item = (clase: string, color: string, texto: string) => `<div><span class="simbolo" style="color:${color}"><span class="${clase}"></span></span>${texto}</div>`;
  return [
    item('rombo', semantica.satelite, 'Satélite (final)'),
    item('rombo', semantica.sateliteInicial, 'Satélite (inicial)'),
    item('anillo', semantica.huella, 'Huella de cobertura'),
    item('linea', semantica.rayo, 'Cubre la región completa'),
    item('anillo', semantica.regionCubierta, 'Región cubierta'),
    item('anillo', semantica.regionParcial, 'Región parcial'),
    item('anillo', semantica.regionNoCubierta, 'Región no cubierta'),
    item('rayas', semantica.desechos, 'Zona de desechos'),
    item('anillo', semantica.objetoOcupado, 'Objeto ocupado + exclusión'),
    item('anillo', paleta.textoTenue, 'Zona/región inactiva'),
  ].join('');
}

export interface DatosBarra {
  origen: string;
  verificacion: { ok: boolean; texto: string } | null;
  p: ParametrosAG;
  ev: Evaluacion;
  chip: EstadoSolucion;
  contextoChip: string;
  nivel: NivelCalidad;
  evaluaciones: number;
  estadoRun: EstadoSolucion;
}

export function origen(d: DatosBarra): string {
  return `<div class="origen">${d.origen}${d.verificacion ? `<br><span class="${d.verificacion.ok ? 'verificado' : 'no-verificado'}">${esc(d.verificacion.texto)}</span>` : ''}</div>`;
}

export function metricas(d: DatosBarra): string {
  const m = (t: string, v: string, grande = false) => `<div class="metrica${grande ? ' grande' : ''}"><span>${t}</span><b>${v}</b></div>`;
  return `
    ${m('Aptitud F', d.ev.fitness.toFixed(5), true)}
    ${m('Cobertura', `${(d.ev.cobertura * 100).toFixed(1)} %`)}
    ${m('Redund.', d.ev.redundancia.toFixed(3))}
    ${m('Regiones', `${d.ev.regionesCubiertas}/${d.ev.regionesActivas}`)}
    <div class="separador" aria-hidden="true"></div>
    ${m('Semilla', String(d.p.semilla))}
    ${m('N · G', `${d.p.poblacion} · ${d.p.generaciones}`)}
    ${m('σ · pm · pc', `${d.p.sigmaMutacion}° · ${d.p.probMutacion} · ${d.p.probCruce}`)}
    ${m('Evals', String(d.evaluaciones))}`;
}

export function chip(d: DatosBarra): string {
  return `<div style="text-align:right">
    <span class="chip ${claseChip[d.chip]}" role="status" aria-live="polite" title="${esc(d.contextoChip)}">${d.chip}</span>
    <div class="tenue" style="font-size:10.5px;margin-top:4px;white-space:nowrap">${esc(d.contextoChip)} · ${d.nivel}</div>
  </div>`;
}

export function tablaRegiones(ev: Evaluacion): string {
  const filas = ev.regiones
    .map((r) => {
      const color = colorEstado[r.estado];
      const sats = r.satelitesCompletos.map((i) => `S${i + 1}`).join(' ') || '—';
      return `<tr class="clic ${r.estado === 'inactiva' ? 'inactiva' : ''}" data-region="${r.id}" tabindex="0" title="Volar a ${esc(r.nombre)}">
        <td><div>${esc(r.nombre)}</div><div class="barra-cob"><i style="width:${(r.fraccion * 100).toFixed(1)}%;background:${color}"></i></div></td>
        <td><span class="prio ${r.prioridad}">${r.prioridad}</span></td>
        <td class="mono">${r.estado === 'inactiva' ? '—' : `${(r.fraccion * 100).toFixed(0)}%`}</td>
        <td class="mono tenue" style="font-size:10.5px">${sats}</td>
        <td><span class="punto" style="background:${color};box-shadow:0 0 8px ${color}" title="${r.estado}"></span></td>
      </tr>`;
    })
    .join('');
  return `<table class="regiones"><thead><tr><th>Región</th><th>Prior.</th><th>Obs.</th><th>Sat.</th><th></th></tr></thead><tbody>${filas}</tbody></table>`;
}

function filaZona(z: ZonaProhibida, tipo: 'desechos' | 'ocupadas', borrable: boolean): string {
  const color = tipo === 'desechos' ? semantica.desechos : semantica.objetoOcupado;
  const campo = (k: 'lat' | 'lon' | 'radioGrados', t: string, min: number, max: number) =>
    `<label>${t}<input type="number" step="0.5" min="${min}" max="${max}" value="${z[k]}" data-zona="${z.id}" data-campo="${k}" /></label>`;
  return `<div class="zona-item ${z.activa ? '' : 'apagada'}">
    <div class="fila"><span class="punto" style="background:${color}"></span><label>${esc(z.nombre)}</label>
      <input type="checkbox" ${z.activa ? 'checked' : ''} data-zona="${z.id}" data-campo="activa" aria-label="Activar ${esc(z.nombre)}" />
      ${borrable ? `<button class="boton peligro" style="padding:2px 6px" data-borrar="${z.id}" aria-label="Eliminar zona">✕</button>` : ''}
    </div>
    <div class="coords">${campo('lat', 'Lat', -90, 90)}${campo('lon', 'Lon', -180, 180)}${campo('radioGrados', 'Radio °', 0.5, 179)}</div>
  </div>`;
}

export function panelEscenario(e: Escenario, p: ParametrosAG, ejecutando: boolean, caliente: boolean): string {
  const num = (k: keyof ParametrosAG, t: string, step: number, min: number, max: number) =>
    `<label>${t}<input type="number" step="${step}" min="${min}" max="${max}" value="${p[k] as number}" data-param="${k}" /></label>`;
  const regiones = e.regiones
    .map(
      (r) => `<div class="fila"><input type="checkbox" ${r.activa ? 'checked' : ''} data-region-activa="${r.id}" aria-label="Activar ${esc(r.nombre)}" />
        <label>${esc(r.nombre)}</label>
        <select class="mini" style="width:84px" data-prioridad="${r.id}" aria-label="Prioridad de ${esc(r.nombre)}">
          ${(['Alta', 'Media', 'Normal'] as const).map((x) => `<option ${x === r.prioridad ? 'selected' : ''}>${x}</option>`).join('')}
        </select></div>`,
    )
    .join('');
  return `
    <div class="grupo">
      <h2 class="titulo-panel"><span>Escenarios rápidos</span></h2>
      <div class="presets">
        <button class="boton" data-preset="inicial">Inicial (enunciado)</button>
        <button class="boton" data-preset="reducido">Espacio reducido ×4</button>
        <button class="boton" data-preset="dificil">Difícil: Yucatán</button>
        <button class="boton" data-preset="inviable">Inviable</button>
      </div>
      <div class="botones"><button class="boton" data-accion="referencia">↺ Volver al run de referencia</button></div>
    </div>
    <div class="grupo">
      <h2 class="titulo-panel"><span>Regiones y prioridades</span></h2>
      ${regiones}
    </div>
    <div class="grupo">
      <h2 class="titulo-panel"><span>Zonas de desechos</span><button class="boton" style="padding:2px 8px" data-agregar="desechos">+ zona</button></h2>
      ${e.desechos.map((z) => filaZona(z, 'desechos', z.id.startsWith('usuario-'))).join('')}
    </div>
    <div class="grupo">
      <h2 class="titulo-panel"><span>Objetos ocupados</span><button class="boton" style="padding:2px 8px" data-agregar="ocupadas">+ objeto</button></h2>
      ${e.ocupadas.map((z) => filaZona(z, 'ocupadas', z.id.startsWith('usuario-'))).join('')}
    </div>
    <div class="grupo">
      <h2 class="titulo-panel"><span>Modelo</span></h2>
      <div class="params">
        <label>Huella θ (°)<input type="number" step="0.5" min="3" max="60" value="${e.modelo.semiAnguloHuella}" data-modelo="semiAnguloHuella" /></label>
        <label>Separación mín. (°)<input type="number" step="0.5" min="0" max="30" value="${e.modelo.separacionMinima}" data-modelo="separacionMinima" /></label>
      </div>
    </div>
    <div class="grupo">
      <h2 class="titulo-panel"><span>Algoritmo evolutivo</span></h2>
      <div class="params">
        ${num('semilla', 'Semilla', 1, 0, 2 ** 31)}${num('poblacion', 'Población N', 2, 4, 400)}
        ${num('generaciones', 'Generaciones G', 10, 0, 2000)}${num('torneo', 'Torneo k', 1, 1, 10)}
        ${num('probCruce', 'Prob. cruce', 0.05, 0, 1)}${num('probMutacion', 'Prob. mutación', 0.05, 0, 1)}
        ${num('sigmaMutacion', 'Paso σ (°)', 0.5, 0.1, 90)}${num('probReinicio', 'Prob. reinicio', 0.01, 0, 1)}
        ${num('elitismo', 'Elitismo', 1, 0, 50)}
        <label>Cruce alineado<select data-param="alinearCruce"><option value="1" ${p.alinearCruce ? 'selected' : ''}>Sí</option><option value="0" ${p.alinearCruce ? '' : 'selected'}>No</option></select></label>
      </div>
      <div class="fila" style="margin-top:8px"><input type="checkbox" id="caliente" ${caliente ? 'checked' : ''} /><label for="caliente">Partir de la configuración mostrada (arranque en caliente)</label></div>
      <div class="botones">
        <button class="boton primario" data-accion="evolucionar" ${ejecutando ? 'disabled' : ''}>${ejecutando ? 'Evolucionando…' : '⟳ Evolucionar'}</button>
        ${ejecutando ? '<button class="boton peligro" data-accion="detener">Detener</button>' : ''}
      </div>
      <div class="progreso ${ejecutando ? '' : 'oculto'}"><i id="barra-progreso" style="width:0%"></i></div>
      <div id="aviso-factibilidad"></div>
    </div>`;
}
