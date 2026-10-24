// Cámara: animación de entrada, rotación automática que se detiene al
// interactuar y vuelo hacia una región. Con prefers-reduced-motion todo es
// instantáneo y no hay rotación automática.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LatLon } from '../../core/tipos';
import { aVector3 } from './coordenadas';

const suavizar = (u: number) => 1 - Math.pow(1 - u, 3);

export class ControlCamara {
  readonly controles: OrbitControls;
  private vuelo: { a: THREE.Vector3; q: THREE.Quaternion; d0: number; d1: number; inicio: number; duracion: number } | null = null;
  alInteractuar: () => void = () => {};

  /** `movimiento` se consulta en cada uso: si el usuario activa prefers-reduced-motion, se respeta al instante. */
  constructor(
    readonly camara: THREE.PerspectiveCamera,
    dom: HTMLElement,
    private movimiento: () => boolean,
  ) {
    this.controles = new OrbitControls(camara, dom);
    this.controles.enableDamping = true;
    this.controles.dampingFactor = 0.07;
    this.controles.minDistance = 1.45;
    this.controles.maxDistance = 9;
    this.controles.enablePan = false;
    this.controles.rotateSpeed = 0.6;
    this.controles.autoRotate = movimiento();
    this.controles.autoRotateSpeed = 0.45;
    // Al primer gesto del usuario se detiene la rotación automática y se cancela cualquier vuelo.
    this.controles.addEventListener('start', () => {
      this.controles.autoRotate = false;
      this.vuelo = null;
      this.alInteractuar();
    });
  }

  private iniciarVuelo(hasta: THREE.Vector3, duracion: number): void {
    const a = this.camara.position.clone().normalize();
    const b = hasta.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(a, b);
    this.vuelo = { a, q, d0: this.camara.position.length(), d1: hasta.length(), inicio: performance.now(), duracion };
  }

  /** Entrada: desde lejos hacia la vista inicial, sobre América. */
  entrada(): void {
    const final = aVector3({ lat: 18, lon: -80 }, 3.6);
    if (!this.movimiento()) {
      this.camara.position.copy(final);
      return;
    }
    this.camara.position.copy(aVector3({ lat: 40, lon: -170 }, 14));
    this.iniciarVuelo(final, 2800);
  }

  /** Vuela hasta tener `p` en el centro de la vista, a la distancia `distancia`. */
  volarA(p: LatLon, distancia = 2.4): void {
    this.controles.autoRotate = false;
    const hasta = aVector3(p, distancia);
    if (!this.movimiento()) {
      this.camara.position.copy(hasta);
      return;
    }
    this.iniciarVuelo(hasta, 1300);
  }

  set rotacionAutomatica(v: boolean) {
    this.controles.autoRotate = v && this.movimiento();
  }
  get rotacionAutomatica(): boolean {
    return this.controles.autoRotate;
  }

  actualizar(): void {
    const mov = this.movimiento();
    if (!mov) this.controles.autoRotate = false;
    if (this.vuelo) {
      // Sin movimiento, un vuelo en curso termina de inmediato en su destino.
      const u = mov ? Math.min(1, (performance.now() - this.vuelo.inicio) / this.vuelo.duracion) : 1;
      const e = suavizar(u);
      // Se interpola la dirección por la esfera (cuaternión) y la distancia por separado.
      const qInterp = new THREE.Quaternion().slerp(this.vuelo.q, e);
      const dir = this.vuelo.a.clone().applyQuaternion(qInterp);
      this.camara.position.copy(dir.multiplyScalar(this.vuelo.d0 + (this.vuelo.d1 - this.vuelo.d0) * e));
      if (u >= 1) this.vuelo = null;
    }
    this.controles.update();
  }
}
