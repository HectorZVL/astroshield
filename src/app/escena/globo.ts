// Globo terrestre con textura procedural propia.
// Las costas vienen de Natural Earth (paquete world-atlas, 1:50 m) y se dibujan
// aquí, en un canvas, con el estilo del proyecto: océano con plataforma
// continental más clara, tierra coloreada por franjas de latitud (hielo,
// templada, árida, tropical), relieve suave y una retícula discreta cada 30°.
// La proyección es equirectangular: tests/coordenadas.test.ts comprueba que
// coincide con la conversión lat/lon -> 3D que usan los satélites.
import * as THREE from 'three';
import { feature } from 'topojson-client';
import tierra50 from 'world-atlas/land-50m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { conAlfa, paleta, tecnicos } from '../tema';
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
      if (!anillo.length) continue;
      anillo.forEach(([lon, lat], i) => {
        if (i === 0) {
          ctx.moveTo(x(lon), y(lat));
          return;
        }
        const [prevLon, prevLat] = anillo[i - 1];
        const dLon = lon - prevLon;
        if (dLon > 180) {
          const denom = lon - 360 - prevLon;
          const t = denom !== 0 ? (-180 - prevLon) / denom : 0;
          const yMid = y(prevLat + t * (lat - prevLat));
          ctx.lineTo(0, yMid);
          ctx.moveTo(W, yMid);
          ctx.lineTo(x(lon), y(lat));
        } else if (dLon < -180) {
          const denom = lon + 360 - prevLon;
          const t = denom !== 0 ? (180 - prevLon) / denom : 0;
          const yMid = y(prevLat + t * (lat - prevLat));
          ctx.lineTo(W, yMid);
          ctx.moveTo(0, yMid);
          ctx.lineTo(x(lon), y(lat));
        } else {
          ctx.lineTo(x(lon), y(lat));
        }
      });
      ctx.closePath();
    }
  }
}

function reticula(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.strokeStyle = conAlfa(paleta.reticula, 0.07);
  ctx.lineWidth = 1.5;
  for (let lon = -180; lon <= 180; lon += 30) {
    const px = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.strokeStyle = conAlfa(paleta.reticula, lat === 0 ? 0.13 : 0.07);
    const py = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }
}

/** Franjas de latitud de la tierra (lat -> color), de norte a sur. */
const FRANJAS: Array<[number, string]> = [
  [90, paleta.tierraHielo],
  [68, paleta.tierraHielo],
  [58, paleta.tierraTemplada],
  [40, paleta.tierraTemplada],
  [30, paleta.tierraArida],
  [17, paleta.tierraArida],
  [8, paleta.tierraTropical],
  [-10, paleta.tierraTropical],
  [-18, paleta.tierraArida],
  [-32, paleta.tierraArida],
  [-42, paleta.tierraTemplada],
  [-58, paleta.tierraTemplada],
  [-66, paleta.tierraHielo],
  [-90, paleta.tierraHielo],
];

function crearTexturas(W = 4096, H = 2048) {
  const poligonos = anillosDeTierra();
  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const c = color.getContext('2d')!;

  // Océano: más profundo hacia los polos.
  const mar = c.createLinearGradient(0, 0, 0, H);
  mar.addColorStop(0, paleta.oceanoProfundo);
  mar.addColorStop(0.5, paleta.oceano);
  mar.addColorStop(1, paleta.oceanoProfundo);
  c.fillStyle = mar;
  c.fillRect(0, 0, W, H);

  // Plataforma continental: un borde claro y difuso alrededor de las costas.
  trazar(c, poligonos, W, H);
  c.save();
  c.filter = 'blur(10px)';
  c.strokeStyle = conAlfa(paleta.oceanoSomero, 0.55);
  c.lineWidth = 22;
  c.stroke();
  c.restore();

  reticula(c, W, H);

  // Tierra por franjas de latitud.
  const tierra = c.createLinearGradient(0, 0, 0, H);
  for (const [lat, col] of FRANJAS) tierra.addColorStop((90 - lat) / 180, col);
  trazar(c, poligonos, W, H);
  c.fillStyle = tierra;
  c.fill('evenodd');

  // Relieve suave: manchas claras y oscuras dentro de la tierra (semilla fija, decorativo).
  c.save();
  trazar(c, poligonos, W, H);
  c.clip('evenodd');
  const rng = crearRng(7);
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = conAlfa(rng.siguiente() < 0.5 ? tecnicos.negro : tecnicos.blanco, rng.rango(0.03, 0.07));
    c.beginPath();
    c.arc(rng.rango(0, W), rng.rango(0, H), rng.rango(3, 16), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // Costa fina, sin brillo.
  trazar(c, poligonos, W, H);
  c.strokeStyle = conAlfa(paleta.costa, 0.32);
  c.lineWidth = 1.4;
  c.stroke();

  // Rugosidad: el mar refleja un poco la luz y la tierra es mate (canal verde).
  const rug = document.createElement('canvas');
  rug.width = W / 4;
  rug.height = H / 4;
  const r = rug.getContext('2d')!;
  r.fillStyle = conAlfa(tecnicos.blanco, 1);
  r.fillRect(0, 0, rug.width, rug.height);
  r.fillStyle = conAlfa(tecnicos.negro, 0.32);
  r.fillRect(0, 0, rug.width, rug.height);
  trazar(r, poligonos, rug.width, rug.height);
  r.fillStyle = conAlfa(tecnicos.blanco, 1);
  r.fill('evenodd');

  const mapa = new THREE.CanvasTexture(color);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.anisotropy = 8;
  const rugosidad = new THREE.CanvasTexture(rug);
  return { mapa, rugosidad };
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
  uniform vec3 uDia;
  uniform vec3 uOcaso;
  uniform vec3 uNoche;
  uniform vec3 uSol;
  uniform float uPotencia;
  uniform float uIntensidad;
  uniform float uInterior;
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    float d = dot(vNormal, vVista);
    // Halo exterior (cara trasera) o borde interior tipo Fresnel (cara frontal).
    float f = uInterior > 0.5 ? pow(1.0 - max(d, 0.0), uPotencia) : pow(max(0.0, 0.62 + d), uPotencia);
    // Color según la luz: cielo del lado del sol, tono cálido en el terminador y azul tenue de noche.
    float luz = dot(vNormal, uSol);
    vec3 color = mix(uNoche, uDia, smoothstep(-0.25, 0.55, luz));
    color = mix(color, uOcaso, exp(-pow(luz * 3.2, 2.0)) * 0.75);
    float brillo = 0.35 + 0.65 * smoothstep(-0.6, 0.35, luz);
    gl_FragColor = vec4(color, 1.0) * f * uIntensidad * brillo;
  }`;

function materialAtmosfera(interior: boolean, potencia: number, intensidad: number, sol: { value: THREE.Vector3 }) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT_ATMOSFERA,
    fragmentShader: FRAG_ATMOSFERA,
    uniforms: {
      uDia: { value: new THREE.Color(paleta.atmosferaDia) },
      uOcaso: { value: new THREE.Color(paleta.atmosferaOcaso) },
      uNoche: { value: new THREE.Color(paleta.atmosferaNoche) },
      uSol: sol,
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

export interface Globo {
  grupo: THREE.Group;
  /** Dirección del sol en espacio de vista; la escena la actualiza en cada cuadro. */
  solVista: { value: THREE.Vector3 };
}

export function crearGlobo(): Globo {
  const grupo = new THREE.Group();
  const { mapa, rugosidad } = crearTexturas();
  const tierra = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshStandardMaterial({ map: mapa, roughnessMap: rugosidad, roughness: 1, metalness: 0 }),
  );
  tierra.name = 'tierra';
  grupo.add(tierra);
  const solVista = { value: new THREE.Vector3(1, 0, 0) };
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), materialAtmosfera(true, 3.4, 0.75, solVista)));
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(1.14, 96, 64), materialAtmosfera(false, 5, 0.8, solVista)));
  return { grupo, solVista };
}

/** Fondo de estrellas. La semilla fija es decorativa: el cielo se ve igual siempre. */
export function crearEstrellas(cantidad = 2600): THREE.Points {
  const rng = crearRng(2024);
  const pos = new Float32Array(cantidad * 3);
  const col = new Float32Array(cantidad * 3);
  const base = new THREE.Color(paleta.estrellas);
  const tintes = [new THREE.Color(paleta.acentoSuave), new THREE.Color(paleta.pizarra)];
  for (let i = 0; i < cantidad; i++) {
    const z = rng.rango(-1, 1);
    const t = rng.rango(0, Math.PI * 2);
    const r = rng.rango(40, 90);
    const s = Math.sqrt(1 - z * z);
    pos.set([r * s * Math.cos(t), r * z, r * s * Math.sin(t)], i * 3);
    const c = base.clone().lerp(tintes[i % 2], rng.rango(0, 0.3)).multiplyScalar(rng.rango(0.25, 0.85));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(
    g,
    new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }),
  );
}
