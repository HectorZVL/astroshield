// Render 3D: renderer WebGL, posprocesado con bloom moderado, etiquetas HTML
// y selección por clic. No conoce el algoritmo: recibe datos y los dibuja.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { paleta } from '../tema';
import { ControlCamara } from './camara';
import { CapasEscena } from './capas';
import { crearEstrellas, crearGlobo } from './globo';

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
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private etiquetas = new CSS2DRenderer();
  private reloj = new THREE.Clock();
  private estrellas: THREE.Points;
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
    this.escena.add(new THREE.AmbientLight('#9fb6ff', 0.55));
    const sol = new THREE.DirectionalLight('#ffffff', 1.6);
    sol.position.set(4, 2.5, 3);
    // La luz acompaña a la cámara para que el lado visible del globo siempre esté iluminado.
    this.camara.add(sol);
    this.escena.add(this.camara);
    this.escena.add(crearGlobo());
    this.estrellas = crearEstrellas();
    this.escena.add(this.estrellas);
    this.escena.add(this.capas.raiz);

    this.control = new ControlCamara(this.camara, this.renderer.domElement, movimiento());

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    // Bloom moderado: solo brillan las costas, las huellas y los elementos emisivos.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.configurarClic();
    window.addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
    this.control.entrada();
    this.renderer.setAnimationLoop(() => this.cuadro());
  }

  private redimensionar(): void {
    const w = this.contenedor.clientWidth || window.innerWidth;
    const h = this.contenedor.clientHeight || window.innerHeight;
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.etiquetas.setSize(w, h);
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
    this.control.actualizar();
    this.capas.actualizar(dt, mov, this.camara);
    if (mov) this.estrellas.rotation.y += dt * 0.004;
    this.composer.render();
    this.etiquetas.render(this.escena, this.camara);
  }
}
