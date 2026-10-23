// Punto de entrada de la visualización.
// Flujo de datos (de un solo sentido):
//   results/run-referencia.json o Web Worker  ->  estado  ->  núcleo evalúa  ->  escena 3D + HUD
// La UI NUNCA decide si algo es válido: siempre llama a las mismas funciones
// del núcleo que usan la CLI y las pruebas (evaluarEn, estadoDeConfiguracion…).
import './estilos.css';
import referencia from '../../results/run-referencia.json';
import { estadoDeConfiguracion, nivelDeCalidad } from '../core/comparacion';
import { agregarZona, clonarEscenario, escenarioInicial } from '../core/escenario';
import { evaluarEn } from '../core/evaluacion';
import type { Factibilidad } from '../core/factibilidad';
import { distancia } from '../core/geo';
import type { Configuracion, Escenario, EstadoSolucion, Evaluacion, ParametrosAG, Prioridad, RegistroGeneracion, ResultadoEjecucion, Violacion, ZonaProhibida } from '../core/tipos';
import { Escena3D, hayWebGL } from './escena/escena3d';
import { estadoParaMostrar } from './estadoVista';
import { crearPreset, type NombrePreset } from './presets';
import { aplicarTemaCSS } from './tema';
import { GraficaEvolucion } from './ui/grafica';
import { chip, detalles, esc, esqueleto, iconos, metricas, origen, panelEscenario, tablaRegiones, type DatosBarra } from './ui/hud';
import type { MensajeAlWorker, MensajeDelWorker } from './worker';

aplicarTemaCSS();

const REF = referencia as unknown as { cotaTeorica: number; resultado: ResultadoEjecucion; factibilidad: Factibilidad };
const consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
let movimiento = !consultaMovimiento.matches;
consultaMovimiento.addEventListener('change', (e) => (movimiento = !e.matches));

type Vista = 'inicial' | 'final' | 'ambas';

const estado = {
  run: REF.resultado,
  origen: 'referencia' as 'referencia' | 'vivo',
  verificacion: null as { ok: boolean; texto: string } | null,
  /** Condiciones actuales (editables). El escenario del run nunca se modifica. */
  escenario: clonarEscenario(REF.resultado.escenario),
  parametros: { ...REF.resultado.parametros } as ParametrosAG,
  vista: 'final' as Vista,
  generacion: REF.resultado.historial.length - 1,
  ejecutando: false,
  historialVivo: [] as RegistroGeneracion[],
  factibilidad: REF.factibilidad as Factibilidad | null,
  caliente: false,
  reproduciendo: 0,
  /** Secciones plegables del panel de escenario que el usuario dejó abiertas. */
  seccionesAbiertas: new Set(['presets', 'algoritmo']),
  /** Último estado del chip, para animar solo cuando cambia. */
  chipAnterior: null as EstadoSolucion | null,
};

// ---- Construcción del HUD ---------------------------------------------------
const hud = document.getElementById('hud')!;
hud.innerHTML = esqueleto();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grafica = new GraficaEvolucion($('grafica'));
const linea = $<HTMLInputElement>('linea-tiempo');

// ---- Escena 3D (opcional: si no hay WebGL, el HUD sigue mostrando los datos) --
let escena3d: Escena3D | null = null;
if (hayWebGL()) {
  escena3d = new Escena3D($('escena'), $('etiquetas'), () => movimiento);
  escena3d.alSeleccionar = (s) => (s.tipo === 'region' ? volarARegion(s.id) : mostrarSatelite(s.indice));
} else {
  const aviso = document.createElement('div');
  aviso.className = 'sin-webgl';
  aviso.innerHTML = `<div class="superficie"><h2>Este navegador no puede mostrar el globo 3D</h2><p class="tenue">No hay WebGL disponible. Los datos de la ejecución, la lista de regiones y la gráfica siguen funcionando. Prueba con un navegador actualizado o activa la aceleración por hardware.</p></div>`;
  $('escena').appendChild(aviso);
}

// ---- Derivados del estado ---------------------------------------------------
const escenarioModificado = () => JSON.stringify(estado.escenario) !== JSON.stringify(estado.run.escenario);
const historialActual = () => (estado.ejecutando ? estado.historialVivo : estado.run.historial);

function configuracionMostrada(): Configuracion {
  if (estado.vista === 'inicial') return estado.run.inicial.config;
  const h = historialActual();
  return h[Math.min(estado.generacion, h.length - 1)]?.mejorConfig ?? estado.run.final.config;
}

function esFinal(): boolean {
  return !estado.ejecutando && estado.vista !== 'inicial' && estado.generacion >= estado.run.historial.length - 1;
}

/**
 * Estado del chip principal. La configuración se evalúa en las condiciones
 * ACTUALES con el núcleo; el único caso especial es INVIABLE, que es una
 * propiedad de la ejecución (no se encontró ninguna válida), no de una configuración.
 */
function estadoChip(ev: Evaluacion): { chip: EstadoSolucion; contexto: string } {
  const mod = escenarioModificado();
  const chip = estadoParaMostrar(ev, { escenarioModificado: mod, esFinal: esFinal(), estadoRun: estado.run.estado });
  if (chip === 'INVIABLE') return { chip, contexto: 'Sin válidas · menor violación' };
  const que = estado.vista === 'inicial' ? 'Inicial' : esFinal() ? 'Final' : `Mejor gen. ${estado.generacion}`;
  return { chip, contexto: mod ? `${que} · reevaluada` : que };
}

// ---- Render -----------------------------------------------------------------
function render(opciones: { animar?: boolean; escenario?: boolean } = {}): void {
  const config = configuracionMostrada();
  const ev = evaluarEn(config, estado.escenario);
  const { chip: c, contexto } = estadoChip(ev);
  const run = estado.run;
  const datos: DatosBarra = {
    origen: estado.origen === 'referencia' ? 'Run de referencia' : estado.ejecutando ? 'Evolucionando en vivo…' : 'Run en vivo',
    fuente: estado.origen === 'referencia' ? 'results/run-referencia.json' : 'Calculado en este navegador (Web Worker)',
    verificacion: estado.verificacion,
    p: estado.ejecutando ? estado.parametros : run.parametros,
    ev,
    chip: c,
    contextoChip: contexto,
    nivel: nivelDeCalidad(ev),
    evaluaciones: estado.ejecutando ? 0 : run.evaluaciones,
    estadoRun: run.estado,
  };
  $('origen').innerHTML = origen(datos);
  $('metricas').innerHTML = metricas(datos);
  $('chip').innerHTML = chip(datos);
  // Microinteracción: el chip «late» una vez cuando cambia de estado (decorativo).
  if (estado.chipAnterior !== null && estado.chipAnterior !== c && movimiento) $('chip').querySelector('.chip')?.classList.add('cambio');
  estado.chipAnterior = c;
  $('detalles').innerHTML = detalles(datos);
  $('tabla-regiones').innerHTML = tablaRegiones(ev);
  $('resumen-regiones').textContent = `${ev.regionesCubiertas} de ${ev.regionesActivas} cubiertas`;
  renderAvisoConfig(ev);

  const h = historialActual();
  linea.max = String(Math.max(0, h.length - 1));
  linea.value = String(Math.min(estado.generacion, h.length - 1));
  linea.disabled = estado.vista === 'inicial' || estado.ejecutando;
  $('etiqueta-gen').textContent = estado.vista === 'inicial' ? 'Generación 0 (inicial)' : `Generación ${Math.min(estado.generacion, h.length - 1)} de ${estado.ejecutando ? estado.parametros.generaciones : h.length - 1}`;
  grafica.fijar(h, estado.ejecutando ? estado.parametros.generaciones : Math.max(1, run.historial.length - 1), (estado.ejecutando ? estado.parametros : run.parametros).poblacion, escenarioEsInicial(estado.escenario) ? REF.cotaTeorica : null);
  grafica.marcar(estado.vista === 'inicial' ? 0 : Math.min(estado.generacion, h.length - 1));
  document.querySelectorAll<HTMLButtonElement>('#vista button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === estado.vista));

  if (escena3d) {
    if (opciones.escenario) escena3d.capas.dibujarEscenario(estado.escenario);
    escena3d.capas.mostrarConfiguracion(config, ev, {
      animar: !!opciones.animar && movimiento,
      fantasma: estado.vista === 'ambas' ? run.inicial.config : null,
    });
  }
}

/** La cota F* solo aplica al escenario del enunciado (docs/01 §7). */
function escenarioEsInicial(e: Escenario): boolean {
  return JSON.stringify(e) === JSON.stringify(escenarioInicial());
}

function renderAvisoConfig(ev: Evaluacion): void {
  const partes: string[] = [];
  if (escenarioModificado()) {
    partes.push(
      `<div class="aviso ${ev.valida ? 'exito' : 'error'}"><b>Condiciones modificadas.</b> La configuración mostrada se obtuvo con las condiciones anteriores. Reevaluada ahora: <b>${estadoDeConfiguracion(ev)}</b>${
        ev.valida ? ' (sigue cumpliendo todas las restricciones).' : ':'
      }${ev.violaciones.length ? `<ul>${ev.violaciones.slice(0, 8).map((v) => `<li>${describirViolacion(v)}</li>`).join('')}${ev.violaciones.length > 8 ? `<li>… y ${ev.violaciones.length - 8} más</li>` : ''}</ul>` : ''} Pulsa <b>Evolucionar</b> para adaptar la constelación.</div>`,
    );
  } else if (!ev.valida) {
    partes.push(`<div class="aviso error"><b>${ev.violaciones.length} violaciones</b> (violación total ${ev.violacionTotal.toFixed(2)}°).${estado.run.estado === 'INVIABLE' ? ' El escenario resultó inviable: no se encontró ninguna configuración válida.' : ''}</div>`);
  }
  if (ev.valida && ev.regionesCubiertas < ev.regionesActivas) {
    const faltan = ev.regiones.filter((r) => r.estado === 'parcial' || r.estado === 'no cubierta').map((r) => r.nombre);
    partes.push(`<div class="aviso">Válida pero no satisfactoria: sin cubrir por completo ${esc(faltan.join(', '))}.</div>`);
  }
  $('aviso-config').innerHTML = partes.join('');
}

function nombreZona(id: string): string {
  return [...estado.escenario.desechos, ...estado.escenario.ocupadas].find((z) => z.id === id)?.nombre ?? id;
}

/** Texto de una violación según su tipo (la separación es entre dos satélites, no una zona). */
function describirViolacion(v: Violacion): string {
  const m = `${v.magnitud.toFixed(2)}°`;
  const s = `S${v.satelite + 1}`;
  if (v.tipo === 'separacion') return `${s} y ${esc(v.contra.replace('satélite ', 'S'))} están ${m} por debajo de la separación mínima`;
  if (v.tipo === 'ocupada') return `${s} invade ${m} la exclusión de ${esc(nombreZona(v.contra))}`;
  return `${s} está ${m} dentro de la zona de desechos ${esc(nombreZona(v.contra))}`;
}

function renderPanel(): void {
  $('panel-izq').innerHTML = panelEscenario(estado.escenario, estado.parametros, estado.ejecutando, estado.caliente, estado.seccionesAbiertas);
  renderFactibilidad();
}

function renderFactibilidad(): void {
  const f = estado.factibilidad;
  const el = document.getElementById('aviso-factibilidad');
  if (!el) return;
  el.innerHTML = f ? `<div class="aviso ${f.factibleDemostrado ? 'exito' : 'error'}">${esc(f.mensaje)}</div>` : '';
}

// ---- Verificación del run cargado -------------------------------------------
function verificarRun(r: ResultadoEjecucion): { ok: boolean; texto: string } {
  // Se recalcula la aptitud desde cero en el navegador y se compara con la guardada.
  const ev = evaluarEn(r.final.config, r.escenario);
  const ok = Math.abs(ev.fitness - r.final.eval.fitness) < 1e-9 && ev.valida === r.final.eval.valida;
  return { ok, texto: ok ? `La aptitud recalculada en el navegador coincide con la guardada (${ev.fitness.toFixed(5)})` : 'La aptitud recalculada NO coincide con la guardada' };
}

// ---- Interacciones ----------------------------------------------------------
function volarARegion(id: string): void {
  const r = estado.escenario.regiones.find((x) => x.id === id);
  if (r && escena3d) escena3d.control.volarA(r);
}

function mostrarSatelite(i: number): void {
  const config = configuracionMostrada();
  const s = config[i];
  const ev = evaluarEn(config, estado.escenario);
  const cubre = ev.regiones.filter((r) => r.satelitesCompletos.includes(i)).map((r) => r.nombre);
  const zonas = [...estado.escenario.desechos, ...estado.escenario.ocupadas].filter((z) => z.activa);
  const cercana = zonas.map((z) => ({ z, m: distancia(s, z) - z.radioGrados })).sort((a, b) => a.m - b.m)[0];
  const viol = ev.violaciones.filter((v) => v.satelite === i || v.contra === `satélite ${i + 1}`);
  const t = $('tarjeta');
  const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(3)}° ${v >= 0 ? pos : neg}`;
  t.innerHTML = `<button class="boton icono cerrar" aria-label="Cerrar">${iconos.cerrar}</button>
    <h2>Satélite S${i + 1}</h2>
    <p class="coordenadas">${coord(s.lat, 'N', 'S')} · ${coord(s.lon, 'E', 'O')}</p>
    <dl class="lista-detalles">
      <div><dt>Cubre por completo</dt><dd>${cubre.length ? esc(cubre.join(', ')) : 'Ninguna región'}</dd></div>
      ${cercana ? `<div><dt>Restricción más cercana</dt><dd>${esc(cercana.z.nombre)}, a ${cercana.m.toFixed(2)}° del borde</dd></div>` : ''}
    </dl>
    ${viol.length ? `<div class="aviso error">${viol.map((v) => describirViolacion(v)).join('<br>')}</div>` : '<div class="aviso exito">Cumple todas las restricciones.</div>'}`;
  t.classList.remove('oculto');
  t.querySelector('.cerrar')!.addEventListener('click', () => t.classList.add('oculto'));
}

function cambiarEscenario(nuevo: Escenario): void {
  estado.escenario = nuevo;
  estado.factibilidad = null;
  render({ escenario: true });
  renderPanel();
}

let contadorZonas = 1;
function aplicarPreset(nombre: NombrePreset): void {
  // Cada preset fija escenario y parámetros de una ejecución documentada (presets.ts).
  const p = crearPreset(nombre);
  estado.parametros = p.parametros;
  cambiarEscenario(p.escenario);
}

function editarZona(id: string, campo: string, valor: string | boolean): void {
  const e = clonarEscenario(estado.escenario);
  const z = [...e.desechos, ...e.ocupadas].find((x) => x.id === id) as ZonaProhibida | undefined;
  if (!z) return;
  if (campo === 'activa') z.activa = valor as boolean;
  else {
    const n = Number(valor);
    if (!Number.isFinite(n)) return;
    const limites: Record<string, [number, number]> = { lat: [-90, 90], lon: [-180, 180], radioGrados: [0.5, 179] };
    const [a, b] = limites[campo];
    (z as unknown as Record<string, number>)[campo] = Math.max(a, Math.min(b, n));
  }
  cambiarEscenario(e);
}

$('panel-izq').addEventListener('change', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLSelectElement;
  if (t.id === 'caliente') {
    estado.caliente = (t as HTMLInputElement).checked;
    return;
  }
  if (t.dataset.zona) return editarZona(t.dataset.zona, t.dataset.campo!, t.type === 'checkbox' ? (t as HTMLInputElement).checked : t.value);
  if (t.dataset.regionActiva) {
    const e = clonarEscenario(estado.escenario);
    e.regiones.find((r) => r.id === t.dataset.regionActiva)!.activa = (t as HTMLInputElement).checked;
    return cambiarEscenario(e);
  }
  if (t.dataset.prioridad) {
    const e = clonarEscenario(estado.escenario);
    e.regiones.find((r) => r.id === t.dataset.prioridad)!.prioridad = t.value as Prioridad;
    return cambiarEscenario(e);
  }
  if (t.dataset.modelo) {
    const n = Number(t.value);
    if (!Number.isFinite(n) || n < 0) return;
    const e = clonarEscenario(estado.escenario);
    (e.modelo as unknown as Record<string, number>)[t.dataset.modelo] = n;
    return cambiarEscenario(e);
  }
  if (t.dataset.param) {
    const k = t.dataset.param as keyof ParametrosAG;
    if (k === 'alinearCruce') estado.parametros.alinearCruce = t.value === '1';
    else {
      const n = Number(t.value);
      if (Number.isFinite(n)) (estado.parametros as unknown as Record<string, number>)[k] = n;
    }
  }
});

$('panel-izq').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.preset) aplicarPreset(b.dataset.preset as NombrePreset);
  if (b.dataset.accion === 'evolucionar') evolucionar();
  if (b.dataset.accion === 'detener') detener();
  if (b.dataset.accion === 'referencia') cargarReferencia();
  if (b.dataset.agregar) {
    const tipo = b.dataset.agregar as 'desechos' | 'ocupadas';
    const n = contadorZonas++;
    cambiarEscenario(
      agregarZona(estado.escenario, tipo, {
        id: `usuario-${tipo}-${n}`,
        nombre: tipo === 'desechos' ? `Zona nueva ${n}` : `Objeto nuevo ${n}`,
        lat: 0,
        lon: -150 + 20 * n,
        radioGrados: tipo === 'desechos' ? 8 : 5,
        activa: true,
      }),
    );
  }
  if (b.dataset.borrar) {
    const e = clonarEscenario(estado.escenario);
    e.desechos = e.desechos.filter((z) => z.id !== b.dataset.borrar);
    e.ocupadas = e.ocupadas.filter((z) => z.id !== b.dataset.borrar);
    cambiarEscenario(e);
  }
});

$('tabla-regiones').addEventListener('click', (ev) => {
  const fila = (ev.target as HTMLElement).closest<HTMLElement>('[data-region]');
  if (fila) volarARegion(fila.dataset.region!);
});
$('tabla-regiones').addEventListener('keydown', (ev) => {
  const fila = (ev.target as HTMLElement).closest<HTMLElement>('[data-region]');
  if (fila && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    volarARegion(fila.dataset.region!);
  }
});

$('vista').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-vista]');
  if (!b) return;
  estado.vista = b.dataset.vista as Vista;
  if (estado.vista !== 'inicial') estado.generacion = estado.run.historial.length - 1;
  render({ animar: true });
});

linea.addEventListener('input', () => {
  estado.generacion = Number(linea.value);
  render({ animar: true });
});
grafica.alSeleccionar = (g) => {
  if (estado.ejecutando) return;
  estado.vista = estado.vista === 'inicial' ? 'final' : estado.vista;
  estado.generacion = g;
  render({ animar: true });
};

// Reproducción de la línea de tiempo: avanza generación por generación.
const botonPlay = $<HTMLButtonElement>('reproducir');
botonPlay.addEventListener('click', () => {
  if (estado.reproduciendo) return pararReproduccion();
  if (estado.vista === 'inicial') estado.vista = 'final';
  if (estado.generacion >= estado.run.historial.length - 1) estado.generacion = 0;
  botonPlay.innerHTML = iconos.pausar;
  botonPlay.setAttribute('aria-label', 'Pausar');
  estado.reproduciendo = window.setInterval(() => {
    if (estado.generacion >= estado.run.historial.length - 1) return pararReproduccion();
    estado.generacion++;
    render({ animar: true });
  }, movimiento ? 140 : 60);
});
function pararReproduccion(): void {
  clearInterval(estado.reproduciendo);
  estado.reproduciendo = 0;
  botonPlay.innerHTML = iconos.reproducir;
  botonPlay.setAttribute('aria-label', 'Reproducir generaciones');
}

// ---- Evolución en el Web Worker ---------------------------------------------
let worker: Worker | null = null;

function evolucionar(): void {
  pararReproduccion();
  const semillas = estado.caliente ? [configuracionMostrada()] : undefined;
  const p = { ...estado.parametros };
  if (p.elitismo >= p.poblacion) p.elitismo = Math.max(0, p.poblacion - 1);
  worker?.terminate();
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  estado.ejecutando = true;
  estado.historialVivo = [];
  estado.generacion = 0;
  estado.vista = 'final';
  estado.parametros = p;
  renderPanel();
  const escenario = clonarEscenario(estado.escenario);
  let ultimoDibujo = 0;
  worker.onmessage = (e: MessageEvent<MensajeDelWorker>) => {
    const m = e.data;
    if (m.tipo === 'factibilidad') {
      estado.factibilidad = m.factibilidad;
      renderFactibilidad();
    } else if (m.tipo === 'progreso') {
      estado.historialVivo.push(m.registro);
      estado.generacion = m.registro.generacion;
      const barra = document.getElementById('barra-progreso');
      if (barra) barra.style.width = `${(100 * m.registro.generacion) / Math.max(1, m.total)}%`;
      // Se redibuja como máximo cada 120 ms para no saturar la interfaz.
      const ahora = performance.now();
      if (ahora - ultimoDibujo > 120) {
        ultimoDibujo = ahora;
        render({ animar: true });
      }
    } else if (m.tipo === 'fin') {
      estado.run = m.resultado;
      estado.origen = 'vivo';
      estado.ejecutando = false;
      estado.generacion = m.resultado.historial.length - 1;
      estado.verificacion = verificarRun(m.resultado);
      estado.escenario = clonarEscenario(m.resultado.escenario);
      worker?.terminate();
      worker = null;
      renderPanel();
      render({ animar: true, escenario: true });
    } else if (m.tipo === 'error') {
      // Se vuelve a mostrar el run anterior completo (línea de tiempo y gráfica incluidas).
      worker?.terminate();
      worker = null;
      estado.ejecutando = false;
      estado.generacion = estado.run.historial.length - 1;
      renderPanel();
      render({ animar: true });
      $('aviso-factibilidad').innerHTML = `<div class="aviso error">No se pudo evolucionar: ${esc(m.mensaje)}</div>`;
    }
  };
  worker.postMessage({ tipo: 'evolucionar', escenario, parametros: p, semillasIniciales: semillas } satisfies MensajeAlWorker);
}

function detener(): void {
  worker?.terminate();
  worker = null;
  estado.ejecutando = false;
  estado.generacion = estado.run.historial.length - 1;
  renderPanel();
  render({ animar: true });
}

function cargarReferencia(): void {
  detener();
  estado.run = REF.resultado;
  estado.origen = 'referencia';
  estado.escenario = clonarEscenario(REF.resultado.escenario);
  estado.parametros = { ...REF.resultado.parametros };
  estado.generacion = REF.resultado.historial.length - 1;
  estado.vista = 'final';
  estado.factibilidad = REF.factibilidad;
  estado.verificacion = verificarRun(REF.resultado);
  renderPanel();
  render({ animar: true, escenario: true });
}

// ---- Paneles: plegar, detalles del run y secciones ---------------------------
// 'toggle' no burbujea: se escucha en captura para recordar qué secciones quedan abiertas.
$('panel-izq').addEventListener(
  'toggle',
  (ev) => {
    const d = ev.target as HTMLDetailsElement;
    if (!d.dataset.seccion) return;
    if (d.open) estado.seccionesAbiertas.add(d.dataset.seccion);
    else estado.seccionesAbiertas.delete(d.dataset.seccion);
  },
  true,
);

function plegar(boton: HTMLButtonElement, plegado: boolean): void {
  boton.closest('.superficie')!.classList.toggle('plegado', plegado);
  boton.setAttribute('aria-expanded', String(!plegado));
}
document.querySelectorAll<HTMLButtonElement>('[data-plegar]').forEach((b) =>
  b.addEventListener('click', () => plegar(b, b.getAttribute('aria-expanded') === 'true')),
);
// En pantallas medianas el panel de escenario empieza plegado para dejar ver el globo.
if (window.innerWidth > 860 && window.innerWidth <= 1280) plegar(document.querySelector<HTMLButtonElement>('#panel-lateral [data-plegar]')!, true);

const botonDetalles = $<HTMLButtonElement>('boton-detalles');
botonDetalles.addEventListener('click', () => {
  const abrir = botonDetalles.getAttribute('aria-expanded') !== 'true';
  botonDetalles.setAttribute('aria-expanded', String(abrir));
  $('detalles').classList.toggle('oculto', !abrir);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  $('tarjeta').classList.add('oculto');
  botonDetalles.setAttribute('aria-expanded', 'false');
  $('detalles').classList.add('oculto');
});

// ---- Arranque ---------------------------------------------------------------
estado.verificacion = verificarRun(estado.run);
renderPanel();
render({ escenario: true });
