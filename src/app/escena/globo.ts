// Globo terrestre con textura procedural propia.
// Las costas vienen de Natural Earth (paquete world-atlas, 1:50 m) y se dibujan
// aquí, en un canvas, con el estilo del proyecto: océano en degradado,
// continentes con matriz de puntos, costas luminosas y retícula cada 15°.
import * as THREE from 'three';
import { feature } from 'topojson-client';
import tierra50 from 'world-atlas/land-50m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { paleta } from '../tema';
import { crearRng } from '../../core/rng';

type Anillo = number[][];

function anillosDeTierra(): Anillo[][] {
  const topo = tierra50 as unknown as Topology<{ land: GeometryCollection }>;
  const fc = feature(topo, topo.objects.land) as unknown as {
    features: Array<{ geometry: { type: string; coordinates: Anillo[] | Anillo[][] } }>;
  };
  const poligonos: Anillo[][] = [];
  for (const ft of fc.features) {
    const g = ft.geometry;
    if (g.type === 'Polygon') poligonos.push(g.coordinates as Anillo[]);
    else if (g.type === 'MultiPolygon') poligonos.push(...(g.coordinates as Anillo[][]));
  }
  return poligonos;
}

/** Traza los polígonos en coordenadas equirectangulares (lon -180 a la izquierda). */
function trazar(ctx: CanvasRenderingContext2D, poligonos: Anillo[][], W: number, H: number): void {
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.beginPath();
  for (const pol of poligonos) {
    for (const anillo of pol) {
      anillo.forEach(([lon, lat], i) => (i === 0 ? ctx.moveTo(x(lon), y(lat)) : ctx.lineTo(x(lon), y(lat))));
      ctx.closePath();
    }
  }
}

function reticula(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, ancho: number): void {
  ctx.strokeStyle = color;
  for (let lon = -180; lon <= 180; lon += 15) {
    ctx.lineWidth = lon === 0 ? ancho * 2 : ancho;
    const px = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.lineWidth = lat === 0 ? ancho * 2 : ancho;
    const py = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }
}

/** Matriz de puntos sobre la tierra, con separación corregida por latitud. */
function puntos(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, paso: number): void {
  ctx.fillStyle = color;
  for (let py = paso / 2; py < H; py += paso) {
    const lat = 90 - (py / H) * 180;
    const c = Math.max(0.08, Math.cos((lat * Math.PI) / 180));
    const pasoX = paso / c; // en el globo, los puntos quedan equiespaciados
    for (let px = (py / paso) % 2 ? pasoX / 2 : 0; px < W; px += pasoX) {
      ctx.beginPath();
      ctx.arc(px, py, paso * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function crearTexturas(W = 4096, H = 2048) {
  const poligonos = anillosDeTierra();

  // Mapa de color.
  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const c = color.getContext('2d')!;
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, paleta.oceano);
  grad.addColorStop(0.5, paleta.oceanoClaro);
  grad.addColorStop(1, paleta.oceano);
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  reticula(c, W, H, paleta.reticula, 1.2);
  trazar(c, poligonos, W, H);
  c.fillStyle = paleta.tierra;
  c.fill('evenodd');

  // Puntos solo dentro de la tierra: se dibujan aparte y se recortan con la forma.
  const capa = document.createElement('canvas');
  capa.width = W;
  capa.height = H;
  const p = capa.getContext('2d')!;
  puntos(p, W, H, paleta.puntosTierra, 9);
  p.globalCompositeOperation = 'destination-in';
  trazar(p, poligonos, W, H);
  p.fill('evenodd');
  c.drawImage(capa, 0, 0);

  // Mapa de emisión: solo lo que debe brillar (costas y retícula tenue) para el bloom.
  const emision = document.createElement('canvas');
  emision.width = W;
  emision.height = H;
  const e = emision.getContext('2d')!;
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  reticula(e, W, H, paleta.reticula, 1);
  e.drawImage(capa, 0, 0);
  e.globalAlpha = 0.35;
  e.drawImage(capa, 0, 0);
  e.globalAlpha = 1;
  trazar(e, poligonos, W, H);
  e.shadowColor = paleta.costa;
  e.shadowBlur = 10;
  e.strokeStyle = paleta.costa;
  e.lineWidth = 2.2;
  e.stroke();

  // La costa también en el mapa de color, para que se vea sin bloom.
  trazar(c, poligonos, W, H);
  c.strokeStyle = paleta.costa;
  c.globalAlpha = 0.65;
  c.lineWidth = 1.6;
  c.stroke();
  c.globalAlpha = 1;

  const aTextura = (cv: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { mapa: aTextura(color), emision: aTextura(emision) };
}

const VERT_ATMOSFERA = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vVista = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG_ATMOSFERA = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPotencia;
  uniform float uIntensidad;
  uniform float uInterior;
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    float d = dot(vNormal, vVista);
    // Halo exterior (cara trasera) o borde interior tipo Fresnel (cara frontal).
    float f = uInterior > 0.5 ? pow(1.0 - max(d, 0.0), uPotencia) : pow(max(0.0, 0.62 + d), uPotencia);
    gl_FragColor = vec4(uColor, 1.0) * f * uIntensidad;
  }`;

function materialAtmosfera(interior: boolean, potencia: number, intensidad: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT_ATMOSFERA,
    fragmentShader: FRAG_ATMOSFERA,
    uniforms: {
      uColor: { value: new THREE.Color(paleta.atmosfera) },
      uPotencia: { value: potencia },
      uIntensidad: { value: intensidad },
      uInterior: { value: interior ? 1 : 0 },
    },
    side: interior ? THREE.FrontSide : THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

export function crearGlobo(): THREE.Group {
  const grupo = new THREE.Group();
  const { mapa, emision } = crearTexturas();
  const tierra = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshStandardMaterial({
      map: mapa,
      emissiveMap: emision,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.85,
      roughness: 0.9,
      metalness: 0.05,
    }),
  );
  tierra.name = 'tierra';
  grupo.add(tierra);
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), materialAtmosfera(true, 3.2, 0.9)));
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 64), materialAtmosfera(false, 4.5, 1.1)));
  return grupo;
}

/** Fondo de estrellas. La semilla fija es decorativa: el cielo se ve igual siempre. */
export function crearEstrellas(cantidad = 5000): THREE.Points {
  const rng = crearRng(2024);
  const pos = new Float32Array(cantidad * 3);
  const col = new Float32Array(cantidad * 3);
  const base = new THREE.Color(paleta.estrellas);
  const tintes = [new THREE.Color(paleta.cian), new THREE.Color(paleta.violeta), new THREE.Color(paleta.ambar)];
  for (let i = 0; i < cantidad; i++) {
    const z = rng.rango(-1, 1);
    const t = rng.rango(0, Math.PI * 2);
    const r = rng.rango(40, 90);
    const s = Math.sqrt(1 - z * z);
    pos.set([r * s * Math.cos(t), r * z, r * s * Math.sin(t)], i * 3);
    const c = base.clone().lerp(tintes[i % 3], rng.rango(0, 0.35)).multiplyScalar(rng.rango(0.35, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(
    g,
    new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
  );
}
