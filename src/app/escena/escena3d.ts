// Render 3D: renderer WebGL, luz lateral suave, etiquetas HTML y selección por
// clic. No conoce el algoritmo: recibe datos y los dibuja.
// Sin posprocesado (antes había bloom): el estilo no usa brillos y así se
// ahorra un pase completo de render por cuadro.
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { paleta } from '../tema';
import { ControlCamara } from './camara';
import { CapasEscena } from './capas';
import { crearEstrellas, crearGlobo, type Globo } from './globo';

export function hayWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export type Seleccion = { tipo: 'region'; id: string } | { tipo: 'satelite'; indice: number };

export class Escena3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly escena = new THREE.Scene();
  readonly camara = new THREE.PerspectiveCamera(42, 1, 0.01, 200);
  readonly capas = new CapasEscena();
  readonly control: ControlCamara;
  private etiquetas = new CSS2DRenderer();
  private reloj = new THREE.Clock();
  private estrellas: THREE.Points;
  private globo: Globo;
  private sol: THREE.DirectionalLight;
  private aux = { a: new THREE.Vector3(), b: new THREE.Vector3() };
  private tamano = { w: 1, h: 1 };
  /** Desplazamiento del centro de proyección (px) para centrar el globo en el hueco entre paneles. */
  private encuadre = { x: 0, y: 0, objX: 0, objY: 0 };
  alSeleccionar: (s: Seleccion) => void = () => {};

  constructor(
    private contenedor: HTMLElement,
    contenedorEtiquetas: HTMLElement,
    private movimiento: () => boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(new THREE.Color(paleta.fondo), 1);
    contenedor.appendChild(this.renderer.domElement);
    contenedorEtiquetas.appendChild(this.etiquetas.domElement);
    this.etiquetas.domElement.style.position = 'absolute';
    this.etiquetas.domElement.style.inset = '0';
    this.etiquetas.domElement.style.pointerEvents = 'none';

    this.escena.background = new THREE.Color(paleta.fondo);
    // Cielo cálido y suelo frío: el lado en sombra conserva detalle (nunca queda negro).
    this.escena.add(new THREE.HemisphereLight(paleta.luzCielo, paleta.luzSuelo, 0.9));
    this.escena.add(new THREE.AmbientLight(paleta.luzAmbiente, 0.25));
    this.sol = new THREE.DirectionalLight(paleta.luzSol, 2.1);
    // El sol acompaña a la cámara, de lado: lo que se mira siempre está iluminado
    // y el terminador queda visible en el borde izquierdo del globo.
    this.sol.position.set(5, 2.2, 1.6);
    this.camara.add(this.sol);
    this.escena.add(this.camara);
    this.globo = crearGlobo();
    this.escena.add(this.globo.grupo);
    this.estrellas = crearEstrellas();
    this.escena.add(this.estrellas);
    this.escena.add(this.capas.raiz);

    this.control = new ControlCamara(this.camara, this.renderer.domElement, movimiento);

    this.configurarClic();
    window.addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
    this.control.entrada();
    this.renderer.setAnimationLoop(() => this.cuadro());
  }

  private redimensionar(): void {
    const w = this.contenedor.clientWidth || window.innerWidth;
    const h = this.contenedor.clientHeight || window.innerHeight;
    // Con tamaño 0 (pestaña o panel oculto) WebGL crea framebuffers vacíos y
    // llena la consola de advertencias; se espera al siguiente resize con tamaño real.
    if (w < 1 || h < 1) return;
    this.tamano = { w, h };
    this.camara.aspect = w / h;
    this.aplicarEncuadre();
    this.renderer.setSize(w, h);
    this.etiquetas.setSize(w, h);
  }

  /**
   * Centra el globo en el punto (cx, cy) de la pantalla, o en el centro con `null`.
   * Solo mueve el centro de la proyección (no la cámara ni los datos); el clic y las
   * etiquetas siguen funcionando porque usan la misma matriz de proyección.
   */
  centrarEn(punto: { x: number; y: number } | null): void {
    this.encuadre.objX = punto ? this.tamano.w / 2 - punto.x : 0;
    this.encuadre.objY = punto ? this.tamano.h / 2 - punto.y : 0;
    if (!this.movimiento()) {
      this.encuadre.x = this.encuadre.objX;
      this.encuadre.y = this.encuadre.objY;
      this.aplicarEncuadre();
    }
  }

  private aplicarEncuadre(): void {
    const { w, h } = this.tamano;
    if (Math.abs(this.encuadre.x) < 0.5 && Math.abs(this.encuadre.y) < 0.5) this.camara.clearViewOffset();
    else this.camara.setViewOffset(w, h, this.encuadre.x, this.encuadre.y, w, h);
    this.camara.updateProjectionMatrix();
  }

  private configurarClic(): void {
    const ray = new THREE.Raycaster();
    let abajo: { x: number; y: number } | null = null;
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => (abajo = { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      // Un arrastre (girar el globo) no cuenta como clic.
      if (!abajo || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 5) return;
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camara);
      const tierra = this.escena.getObjectByName('tierra')!;
      const golpes = ray.intersectObjects([...this.capas.clicables, tierra], false);
      const primero = golpes[0];
      if (!primero || primero.object === tierra) return;
      const d = primero.object.userData;
      if (d.tipo === 'region') this.alSeleccionar({ tipo: 'region', id: d.id });
      if (d.tipo === 'satelite') this.alSeleccionar({ tipo: 'satelite', indice: d.indice });
    });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camara);
      el.style.cursor = ray.intersectObjects(this.capas.clicables, false).length ? 'pointer' : 'grab';
    });
  }

  private cuadro(): void {
    const dt = Math.min(0.05, this.reloj.getDelta());
    const mov = this.movimiento();
    const e = this.encuadre;
    if (e.x !== e.objX || e.y !== e.objY) {
      // El globo se desliza suavemente al plegar o desplegar un panel.
      const k = mov ? Math.min(1, dt * 7) : 1;
      e.x = Math.abs(e.objX - e.x) < 0.5 ? e.objX : e.x + (e.objX - e.x) * k;
      e.y = Math.abs(e.objY - e.y) < 0.5 ? e.objY : e.y + (e.objY - e.y) * k;
      this.aplicarEncuadre();
    }
    this.control.actualizar();
    this.capas.actualizar(dt, mov, this.camara);
    if (mov) this.estrellas.rotation.y += dt * 0.003;
    if (this.renderer.domElement.width < 1 || this.renderer.domElement.height < 1) return;
    // Dirección del sol en espacio de vista para el color de la atmósfera.
    this.camara.updateMatrixWorld();
    const { a, b } = this.aux;
    this.sol.getWorldPosition(a).sub(this.sol.target.getWorldPosition(b)).normalize().transformDirection(this.camara.matrixWorldInverse);
    this.globo.solVista.value.copy(a);
    this.renderer.render(this.escena, this.camara);
    this.etiquetas.render(this.escena, this.camara);
  }
}
