// Datos oficiales del enunciado (secciones 1.2, 3.1 y 3.2) y funciones para
// modificar las condiciones (sección 3.3). Las modificaciones nunca alteran
// el escenario original: devuelven una copia, así siempre se puede comparar
// "antes" contra "después".
import type { Escenario, ModeloCobertura, Prioridad, Region, ZonaProhibida } from './tipos';

export const MODELO_BASE: ModeloCobertura = {
  numSatelites: 8,
  semiAnguloHuella: 20,
  separacionMinima: 3,
  radioTierraKm: 6371,
  pesos: { Alta: 3, Media: 2, Normal: 1 },
  beta: 0.1,
  gamma: 0.5,
};

const REGIONES: Region[] = [
  { id: 'yucatan', nombre: 'Península de Yucatán', lat: 20.5, lon: -89.0, radioKm: 300, prioridad: 'Alta', activa: true },
  { id: 'amazonia', nombre: 'Amazonía brasileña', lat: -3.5, lon: -62.0, radioKm: 300, prioridad: 'Alta', activa: true },
  { id: 'california', nombre: 'California', lat: 36.8, lon: -119.4, radioKm: 300, prioridad: 'Media', activa: true },
  { id: 'sahel', nombre: 'Sahel', lat: 15.0, lon: 0.0, radioKm: 300, prioridad: 'Media', activa: true },
  { id: 'japon', nombre: 'Japón', lat: 36.0, lon: 138.0, radioKm: 300, prioridad: 'Media', activa: true },
  { id: 'australia', nombre: 'Interior de Australia', lat: -25.0, lon: 133.0, radioKm: 300, prioridad: 'Normal', activa: true },
];

const DESECHOS: ZonaProhibida[] = [
  { id: 'atlantico-norte', nombre: 'Atlántico Norte', lat: 45, lon: -35, radioGrados: 12, activa: true },
  { id: 'pacifico-sur', nombre: 'Pacífico Sur', lat: -30, lon: -120, radioGrados: 10, activa: true },
  { id: 'polar-norte', nombre: 'Región polar norte', lat: 78, lon: 30, radioGrados: 8, activa: true },
];

const OCUPADAS: ZonaProhibida[] = [
  { id: 'objeto-a', nombre: 'Objeto A', lat: 10, lon: 45, radioGrados: 5, activa: true },
  { id: 'objeto-b', nombre: 'Objeto B', lat: -15, lon: 110, radioGrados: 5, activa: true },
];

/** Escenario inicial del enunciado, siempre como copia nueva. */
export function escenarioInicial(): Escenario {
  return clonarEscenario({
    nombre: 'Escenario inicial (enunciado)',
    regiones: REGIONES,
    desechos: DESECHOS,
    ocupadas: OCUPADAS,
    modelo: MODELO_BASE,
  });
}

export function clonarEscenario(e: Escenario): Escenario {
  return JSON.parse(JSON.stringify(e)) as Escenario;
}

// ---- Cambios de condiciones (sección 3.3) ----------------------------------

export type TipoZona = 'desechos' | 'ocupadas';

function buscarZona(e: Escenario, id: string): ZonaProhibida {
  const z = [...e.desechos, ...e.ocupadas].find((x) => x.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}

function buscarRegion(e: Escenario, id: string): Region {
  const r = e.regiones.find((x) => x.id === id);
  if (!r) throw new Error(`Región desconocida: ${id}`);
  return r;
}

export function renombrar(e: Escenario, nombre: string): Escenario {
  const c = clonarEscenario(e);
  c.nombre = nombre;
  return c;
}

/** Activa o desactiva una zona prohibida. */
export function activarZona(e: Escenario, id: string, activa: boolean): Escenario {
  const c = clonarEscenario(e);
  buscarZona(c, id).activa = activa;
  return c;
}

export function activarRegion(e: Escenario, id: string, activa: boolean): Escenario {
  const c = clonarEscenario(e);
  buscarRegion(c, id).activa = activa;
  return c;
}

export function cambiarPrioridad(e: Escenario, id: string, prioridad: Prioridad): Escenario {
  const c = clonarEscenario(e);
  buscarRegion(c, id).prioridad = prioridad;
  return c;
}

/** Mueve (y opcionalmente redimensiona) una zona prohibida. */
export function moverZona(e: Escenario, id: string, lat: number, lon: number, radioGrados?: number): Escenario {
  const c = clonarEscenario(e);
  const z = buscarZona(c, id);
  z.lat = lat;
  z.lon = lon;
  if (radioGrados !== undefined) z.radioGrados = radioGrados;
  return c;
}

export function agregarZona(e: Escenario, tipo: TipoZona, zona: ZonaProhibida): Escenario {
  const c = clonarEscenario(e);
  if ([...c.desechos, ...c.ocupadas].some((z) => z.id === zona.id)) {
    throw new Error(`Ya existe una zona con id ${zona.id}`);
  }
  c[tipo].push({ ...zona });
  return c;
}

/** Multiplica el radio de todas las zonas de desechos (espacio reducido). */
export function escalarDesechos(e: Escenario, factor: number): Escenario {
  const c = clonarEscenario(e);
  for (const z of c.desechos) z.radioGrados *= factor;
  return c;
}

export function cambiarModelo(e: Escenario, cambios: Partial<ModeloCobertura>): Escenario {
  const c = clonarEscenario(e);
  c.modelo = { ...c.modelo, ...cambios };
  return c;
}
