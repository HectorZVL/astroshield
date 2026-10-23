// Capas de la escena construidas a partir de los DATOS REALES del modelo:
// cada posición, radio y estado sale del escenario y de la evaluación del núcleo.
// Las animaciones (pulsos, partículas, estelas, transiciones) son decorativas:
// nunca cambian una posición final ni un dato; al terminar una transición,
// cada satélite queda exactamente en la coordenada de la configuración.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { emparejar } from '../../core/ag';
import { destino, interpolar, kmAGrados } from '../../core/geo';
import { crearRng } from '../../core/rng';
import type { Configuracion, EstadoRegion, Escenario, Evaluacion, LatLon, ZonaProhibida } from '../../core/tipos';
import { conAlfa, paleta, semantica, tecnicos } from '../tema';
import { aVector3, circuloGeodesico, RADIO_SATELITES } from './coordenadas';

const colorEstado: Record<EstadoRegion, string> = {
  cubierta: semantica.regionCubierta,
  parcial: semantica.regionParcial,
  'no cubierta': semantica.regionNoCubierta,
  inactiva: paleta.textoTenue,
};

/** Disco geodésico triangulado (anillos concéntricos) con atributos para shaders. */
function discoGeodesico(centro: LatLon, radioGrados: number, radio: number, anillos = 8, segmentos = 64) {
  const pos: number[] = [];
  const radial: number[] = [];
  const ang: number[] = [];
  const idx: number[] = [];
  pos.push(...aVector3(centro, radio).toArray());
  radial.push(0);
  ang.push(0);
  for (let j = 1; j <= anillos; j++) {
    for (let k = 0; k <= segmentos; k++) {
      pos.push(...aVector3(destino(centro, (360 * k) / segmentos, (radioGrados * j) / anillos), radio).toArray());
      radial.push(j / anillos);
      ang.push(k / segmentos);
    }
  }
  const fila = (j: number, k: number) => 1 + (j - 1) * (segmentos + 1) + k;
  for (let k = 0; k < segmentos; k++) idx.push(0, fila(1, k), fila(1, k + 1));
  for (let j = 1; j < anillos; j++) {
    for (let k = 0; k < segmentos; k++) {
      idx.push(fila(j, k), fila(j + 1, k), fila(j + 1, k + 1), fila(j, k), fila(j + 1, k + 1), fila(j, k + 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aRadial', new THREE.Float32BufferAttribute(radial, 1));
  g.setAttribute('aAng', new THREE.Float32BufferAttribute(ang, 1));
  g.setIndex(idx);
  return g;
}

const linea = (pts: THREE.Vector3[], color: string, opacidad = 1, discontinua = false) => {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = discontinua
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: opacidad, dashSize: 0.02, gapSize: 0.014, depthWrite: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacidad, depthWrite: false });
  const l = new THREE.Line(g, m);
  if (discontinua) l.computeLineDistances();
  return l;
};

function etiqueta(texto: string, clase: string, color: string): CSS2DObject {
  const div = document.createElement('div');
  div.className = `etiqueta3d ${clase}`;
  div.textContent = texto;
  div.style.color = color;
  return new CSS2DObject(div);
}

// ---- Franjas de peligro (zonas de desechos) ---------------------------------
const VERT_FRANJAS = /* glsl */ `
  attribute float aRadial;
  attribute float aAng;
  varying float vRadial;
  varying float vAng;
  void main() {
    vRadial = aRadial;
    vAng = aAng;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const FRAG_FRANJAS = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTiempo;
  uniform float uOpacidad;
  varying float vRadial;
  varying float vAng;
  void main() {
    // Franjas diagonales que giran lentamente alrededor del centro de la zona.
    float franja = step(0.5, fract(vAng * 36.0 + vRadial * 4.0 - uTiempo * 0.25));
    float borde = smoothstep(0.86, 1.0, vRadial);
    float a = (0.08 + 0.22 * franja) * (0.55 + 0.45 * vRadial) + borde * 0.55;
    gl_FragColor = vec4(uColor, a * uOpacidad);
  }`;

interface ElementoAnimado {
  actualizar(t: number, dt: number, movimiento: boolean): void;
}

interface SateliteVisual {
  grupo: THREE.Group;
  etiqueta: CSS2DObject;
  anillo: THREE.LineLoop;
  onda: THREE.LineLoop;
  relleno: THREE.Mesh;
  cono: THREE.Mesh;
  estela: THREE.Line;
  historialEstela: THREE.Vector3[];
  /** Posición del modelo (dato). La posición mostrada puede ir en transición hacia ella. */
  destino: LatLon;
  desde: LatLon;
  actual: LatLon;
}

function modeloSatelite(color: string, escala = 1): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: paleta.metalSatelite, metalness: 0.8, roughness: 0.3, emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
  const panelMat = new THREE.MeshStandardMaterial({ color: paleta.panelSatelite, metalness: 0.4, roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.9 });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.026), metal);
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.1, 6), metal);
  brazo.rotation.z = Math.PI / 2;
  const panel = new THREE.BoxGeometry(0.036, 0.0016, 0.02);
  const p1 = new THREE.Mesh(panel, panelMat);
  const p2 = new THREE.Mesh(panel, panelMat);
  p1.position.x = 0.032;
  p2.position.x = -0.032;
  // Antena apuntando a la Tierra (+Z local mira al centro tras lookAt).
  const antena = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.01, 16, 1, true), metal);
  antena.rotation.x = -Math.PI / 2;
  antena.position.z = 0.018;
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), new THREE.MeshBasicMaterial({ color }));
  luz.position.z = -0.016;
  // Halo luminoso para que el satélite se distinga a cualquier distancia.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(0.075);
  g.add(cuerpo, brazo, p1, p2, antena, luz, halo);
  g.scale.setScalar(1.7 * escala);
  return g;
}

let haloCache: THREE.Texture | null = null;
function texturaHalo(): THREE.Texture {
  if (haloCache) return haloCache;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  // Máscara blanca: el color real lo pone el SpriteMaterial (tema).
  g.addColorStop(0, conAlfa(tecnicos.blanco, 1));
  g.addColorStop(0.25, conAlfa(tecnicos.blanco, 0.45));
  g.addColorStop(1, conAlfa(tecnicos.blanco, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  haloCache = new THREE.CanvasTexture(c);
  return haloCache;
}

function orientar(obj: THREE.Object3D, p: LatLon, radio: number) {
  obj.position.copy(aVector3(p, radio));
  obj.lookAt(0, 0, 0);
}

export class CapasEscena {
  readonly raiz = new THREE.Group();
  private escenarioGrupo = new THREE.Group();
  private satGrupo = new THREE.Group();
  private fantasmaGrupo = new THREE.Group();
  private rayosGrupo = new THREE.Group();
  private animados: ElementoAnimado[] = [];
  private sats: SateliteVisual[] = [];
  private regionesVisual = new Map<string, { relleno: THREE.Mesh; borde: THREE.LineLoop; halo: THREE.LineLoop; punto: THREE.Mesh; etiqueta: CSS2DObject }>();
  private transicion = { inicio: 0, duracion: 900, activa: false };
  private semiAngulo = 20;
  private tiempo = 0;
  /** Objetos sobre los que se puede hacer clic (regiones y satélites). */
  readonly clicables: THREE.Object3D[] = [];
  private etiquetasSat = true;

  constructor() {
    this.raiz.add(this.escenarioGrupo, this.rayosGrupo, this.fantasmaGrupo, this.satGrupo);
  }

  // ---------------------------------------------------------------------------
  // Escenario: regiones, zonas de desechos y objetos ocupados.
  // ---------------------------------------------------------------------------
  dibujarEscenario(esc: Escenario): void {
    this.limpiar(this.escenarioGrupo);
    this.animados = [];
    this.regionesVisual.clear();
    for (let i = this.clicables.length - 1; i >= 0; i--) if (this.clicables[i].userData.tipo === 'region') this.clicables.splice(i, 1);
    this.semiAngulo = esc.modelo.semiAnguloHuella;

    for (const r of esc.regiones) {
      const rho = kmAGrados(r.radioKm, esc.modelo.radioTierraKm);
      const color = r.activa ? semantica.regionNoCubierta : paleta.textoTenue;
      const relleno = new THREE.Mesh(
        discoGeodesico(r, rho, 1.0025, 4, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      const borde = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circuloGeodesico(r, rho, 64, 1.003)), new THREE.LineBasicMaterial({ color, transparent: true }));
      const halo = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circuloGeodesico(r, rho * 1.9, 64, 1.003)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }));
      const punto = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), new THREE.MeshBasicMaterial({ color }));
      punto.position.copy(aVector3(r, 1.006));
      // Esfera invisible más grande para que el clic sea cómodo.
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(aVector3(r, 1.01));
      hit.userData = { tipo: 'region', id: r.id };
      this.clicables.push(hit);
      const pin = linea([aVector3(r, 1.003), aVector3(r, 1.075)], color, 0.6);
      const et = etiqueta(r.nombre, 'region', color);
      et.position.copy(aVector3(r, 1.085));
      et.userData.normal = aVector3(r, 1);
      this.escenarioGrupo.add(relleno, borde, halo, punto, hit, pin, et);
      this.regionesVisual.set(r.id, { relleno, borde, halo, punto, etiqueta: et });
    }

    for (const z of esc.desechos) this.dibujarDesechos(z);
    for (const z of esc.ocupadas) this.dibujarOcupada(z);
  }

  private dibujarDesechos(z: ZonaProhibida): void {
    const color = z.activa ? semantica.desechos : paleta.textoTenue;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_FRANJAS,
      fragmentShader: FRAG_FRANJAS,
      uniforms: { uColor: { value: new THREE.Color(color) }, uTiempo: { value: 0 }, uOpacidad: { value: z.activa ? 1 : 0.35 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const disco = new THREE.Mesh(discoGeodesico(z, z.radioGrados, 1.004, 10, 96), mat);
    const borde = linea(circuloGeodesico(z, z.radioGrados, 128, 1.005), color, z.activa ? 0.95 : 0.4);
    const et = etiqueta(`${z.nombre}${z.activa ? '' : ' (inactiva)'}`, 'zona', color);
    et.position.copy(aVector3(destino(z, 180, z.radioGrados), 1.03));
    et.userData.normal = aVector3(z, 1);
    this.escenarioGrupo.add(disco, borde, et);

    // Partículas de desechos orbitando sobre la zona. El grupo se orienta con +Y
    // hacia el centro de la zona; girarlo en Y hace orbitar las partículas alrededor del eje.
    const rng = crearRng(Math.round((z.lat + 91) * 1000 + z.lon));
    const n = Math.round(40 + z.radioGrados * 5);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = (Math.sqrt(rng.siguiente()) * z.radioGrados * Math.PI) / 180;
      const fi = rng.rango(0, Math.PI * 2);
      const h = rng.rango(1.03, 1.2);
      pos.set([h * Math.sin(d) * Math.cos(fi), h * Math.cos(d), h * Math.sin(d) * Math.sin(fi)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particulas = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.012, transparent: true, opacity: z.activa ? 0.9 : 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    const eje = new THREE.Group();
    eje.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aVector3(z, 1));
    const giro = new THREE.Group();
    giro.add(particulas);
    eje.add(giro);
    this.escenarioGrupo.add(eje);

    this.animados.push({
      actualizar: (t, dt, mov) => {
        mat.uniforms.uTiempo.value = mov ? t : 0;
        if (mov) giro.rotation.y += dt * 0.12;
      },
    });
  }

  private dibujarOcupada(z: ZonaProhibida): void {
    const color = z.activa ? semantica.objetoOcupado : paleta.textoTenue;
    const op = z.activa ? 1 : 0.35;
    const relleno = new THREE.Mesh(discoGeodesico(z, z.radioGrados, 1.004, 4, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 * op, depthWrite: false }));
    const borde = linea(circuloGeodesico(z, z.radioGrados, 96, 1.005), color, 0.9 * op, true);
    const objeto = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.022),
      new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.8 * op, metalness: 0.6, roughness: 0.35, transparent: true, opacity: op }),
    );
    objeto.position.copy(aVector3(z, RADIO_SATELITES));
    // Anillo de exclusión a la altura de los satélites: mismo radio angular que la zona.
    const radioAnillo = RADIO_SATELITES * Math.sin((z.radioGrados * Math.PI) / 180);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(radioAnillo, 0.0025, 8, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 * op }));
    const soporte = new THREE.Group();
    orientar(soporte, z, RADIO_SATELITES * Math.cos((z.radioGrados * Math.PI) / 180));
    soporte.add(anillo);
    const vertical = linea([aVector3(z, 1.005), aVector3(z, RADIO_SATELITES)], color, 0.45 * op, true);
    const et = etiqueta(`${z.nombre}${z.activa ? '' : ' (inactivo)'}`, 'zona', color);
    et.position.copy(aVector3(z, RADIO_SATELITES + 0.05));
    et.userData.normal = aVector3(z, 1);
    this.escenarioGrupo.add(relleno, borde, objeto, soporte, vertical, et);
    this.animados.push({
      actualizar: (_t, dt, mov) => {
        if (!mov) return;
        objeto.rotation.y += dt * 0.8;
        anillo.rotation.z += dt * 0.4;
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Configuración: satélites, huellas, rayos y comparación inicial/final.
  // ---------------------------------------------------------------------------
  mostrarConfiguracion(config: Configuracion, ev: Evaluacion, opciones: { animar: boolean; fantasma?: Configuracion | null }): void {
    const previos = this.sats.map((s) => s.actual);
    // Cada satélite nuevo "viaja" desde el previo más cercano (solo para la animación).
    const pareja = previos.length === config.length ? emparejar(config, previos) : null;
    this.limpiar(this.satGrupo);
    for (let i = this.clicables.length - 1; i >= 0; i--) if (this.clicables[i].userData.tipo === 'satelite') this.clicables.splice(i, 1);
    this.sats = config.map((p, i) => this.crearSatelite(p, i, pareja && opciones.animar ? previos[pareja[i]] : p));
    this.transicion = { inicio: performance.now(), duracion: 900, activa: !!pareja && opciones.animar };
    if (!this.transicion.activa) this.sats.forEach((s) => this.colocarSatelite(s, s.destino));
    this.actualizarRegiones(ev);
    this.dibujarRayos(config, ev);
    this.dibujarFantasma(opciones.fantasma ?? null, config);
  }

  private crearSatelite(p: LatLon, i: number, desde: LatLon): SateliteVisual {
    const grupo = modeloSatelite(semantica.satelite);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { tipo: 'satelite', indice: i };
    grupo.add(hit);
    this.clicables.push(hit);
    const et = etiqueta(`S${i + 1}`, 'sat', semantica.satelite);
    et.position.set(0, 0, -0.045);
    grupo.add(et);
    const anillo = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: semantica.huella, transparent: true, opacity: 0.9 }));
    const onda = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: semantica.huella, transparent: true, opacity: 0.5 }));
    const relleno = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: semantica.huella, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const cono = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: semantica.huella, transparent: true, opacity: 0.018, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const estela = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: semantica.satelite, transparent: true, opacity: 0 }));
    this.satGrupo.add(grupo, anillo, onda, relleno, cono, estela);
    return { grupo, etiqueta: et, anillo, onda, relleno, cono, estela, historialEstela: [], destino: { ...p }, desde: { ...desde }, actual: { ...desde } };
  }

  /** Dibuja el satélite y su huella en la posición `p` (puede ser intermedia en una transición). */
  private colocarSatelite(s: SateliteVisual, p: LatLon): void {
    s.actual = { ...p };
    orientar(s.grupo, p, RADIO_SATELITES);
    const borde = circuloGeodesico(p, this.semiAngulo, 96, 1.004);
    s.anillo.geometry.dispose();
    s.anillo.geometry = new THREE.BufferGeometry().setFromPoints(borde);
    s.relleno.geometry.dispose();
    s.relleno.geometry = discoGeodesico(p, this.semiAngulo, 1.0035, 6, 64);
    // Cono de visión: del satélite al borde de la huella.
    const apice = aVector3(p, RADIO_SATELITES);
    const pos: number[] = [];
    for (let k = 0; k < borde.length - 1; k++) pos.push(...apice.toArray(), ...borde[k].toArray(), ...borde[k + 1].toArray());
    s.cono.geometry.dispose();
    s.cono.geometry = new THREE.BufferGeometry();
    s.cono.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  }

  actualizarRegiones(ev: Evaluacion): void {
    for (const r of ev.regiones) {
      const v = this.regionesVisual.get(r.id);
      if (!v) continue;
      const c = new THREE.Color(colorEstado[r.estado]);
      (v.relleno.material as THREE.MeshBasicMaterial).color = c;
      (v.borde.material as THREE.LineBasicMaterial).color = c;
      (v.halo.material as THREE.LineBasicMaterial).color = c;
      (v.punto.material as THREE.MeshBasicMaterial).color = c;
      v.halo.userData.pulsar = r.estado !== 'cubierta' && r.estado !== 'inactiva';
      v.etiqueta.element.style.color = colorEstado[r.estado];
      v.etiqueta.element.textContent = `${r.nombre} · ${r.estado === 'inactiva' ? 'inactiva' : `${Math.round(r.fraccion * 100)} %`}`;
    }
  }

  private dibujarRayos(config: Configuracion, ev: Evaluacion): void {
    this.limpiar(this.rayosGrupo);
    for (const r of ev.regiones) {
      if (r.estado === 'inactiva') continue;
      const centro = this.regionesVisual.get(r.id)?.punto.position;
      if (!centro) continue;
      // Verde: satélites que cubren la región completa. Ámbar: el más cercano si solo es parcial.
      const fuentes = r.satelitesCompletos.length ? r.satelitesCompletos : r.estado === 'parcial' ? [r.sateliteMasCercano] : [];
      for (const i of fuentes) {
        const l = linea([aVector3(config[i], RADIO_SATELITES - 0.02), centro.clone()], r.satelitesCompletos.length ? semantica.rayo : semantica.regionParcial, 0.85, true);
        l.userData = { satelite: i };
        this.rayosGrupo.add(l);
      }
    }
  }

  private dibujarFantasma(inicial: Configuracion | null, final: Configuracion): void {
    this.limpiar(this.fantasmaGrupo);
    if (!inicial) return;
    const pareja = emparejar(final, inicial);
    final.forEach((p, i) => {
      const q = inicial[pareja[i]];
      const m = modeloSatelite(semantica.sateliteInicial, 0.75);
      m.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 0.55;
        }
      });
      orientar(m, q, RADIO_SATELITES);
      const huella = linea(circuloGeodesico(q, this.semiAngulo, 96, 1.004), semantica.sateliteInicial, 0.35, true);
      const arco: THREE.Vector3[] = [];
      for (let k = 0; k <= 48; k++) arco.push(aVector3(interpolar(q, p, k / 48), RADIO_SATELITES));
      this.fantasmaGrupo.add(m, huella, linea(arco, semantica.sateliteInicial, 0.8, true));
    });
  }

  ponerEtiquetasSatelites(visibles: boolean): void {
    this.etiquetasSat = visibles;
  }

  // ---------------------------------------------------------------------------
  // Animación (decorativa).
  // ---------------------------------------------------------------------------
  actualizar(dt: number, movimiento: boolean, camara: THREE.Camera): void {
    this.tiempo += dt;
    const t = this.tiempo;
    for (const a of this.animados) a.actualizar(t, dt, movimiento);

    // Transición entre configuraciones: interpolación por gran círculo.
    if (this.transicion.activa) {
      const u = movimiento ? Math.min(1, (performance.now() - this.transicion.inicio) / this.transicion.duracion) : 1;
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      for (const s of this.sats) {
        // Al llegar a u = 1 se usa la coordenada exacta del modelo, no la interpolada.
        const p = u >= 1 ? s.destino : interpolar(s.desde, s.destino, e);
        this.colocarSatelite(s, p);
        if (movimiento) {
          s.historialEstela.push(aVector3(p, RADIO_SATELITES));
          if (s.historialEstela.length > 40) s.historialEstela.shift();
          s.estela.geometry.dispose();
          s.estela.geometry = new THREE.BufferGeometry().setFromPoints(s.historialEstela);
          (s.estela.material as THREE.LineBasicMaterial).opacity = 0.75;
        }
      }
      if (u >= 1) this.transicion.activa = false;
    } else {
      for (const s of this.sats) {
        const m = s.estela.material as THREE.LineBasicMaterial;
        if (m.opacity > 0) m.opacity = Math.max(0, m.opacity - dt * 0.6);
      }
    }

    // Pulso de las huellas y onda que se expande desde el centro.
    const fase = (t * 0.45) % 1;
    for (const [i, s] of this.sats.entries()) {
      const pulso = movimiento ? 0.65 + 0.35 * Math.sin(t * 2.4 + i) : 0.85;
      (s.anillo.material as THREE.LineBasicMaterial).opacity = pulso;
      (s.relleno.material as THREE.MeshBasicMaterial).opacity = 0.025 + 0.02 * pulso;
      if (movimiento && !this.transicion.activa) {
        s.onda.visible = true;
        s.onda.geometry.dispose();
        s.onda.geometry = new THREE.BufferGeometry().setFromPoints(circuloGeodesico(s.destino, this.semiAngulo * ((fase + i * 0.125) % 1), 48, 1.0045));
        (s.onda.material as THREE.LineBasicMaterial).opacity = 0.55 * (1 - ((fase + i * 0.125) % 1));
      } else s.onda.visible = false;
    }
    for (const r of this.regionesVisual.values()) {
      const pulsa = r.halo.userData.pulsar && movimiento;
      r.halo.visible = !!r.halo.userData.pulsar;
      (r.halo.material as THREE.LineBasicMaterial).opacity = pulsa ? 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4)) : 0.6;
    }

    // Etiquetas: se ocultan las que quedan detrás del globo.
    const dirCam = camara.position.clone().normalize();
    this.raiz.traverse((o) => {
      if (!(o instanceof CSS2DObject)) return;
      const esSat = o.element.classList.contains('sat');
      const n: THREE.Vector3 = esSat ? o.getWorldPosition(new THREE.Vector3()).normalize() : (o.userData.normal as THREE.Vector3);
      const visible = n.dot(dirCam) > 0.15 && (!esSat || this.etiquetasSat);
      o.element.classList.toggle('oculta', !visible);
    });
  }

  private limpiar(g: THREE.Group): void {
    g.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    g.clear();
  }
}
