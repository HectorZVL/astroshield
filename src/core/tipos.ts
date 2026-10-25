// Tipos compartidos por el algoritmo, los experimentos y la visualización.
// El núcleo (src/core) no depende de Three.js ni del DOM: así se puede probar
// en Node y ejecutar dentro de un Web Worker sin cambios.

export type Prioridad = 'Alta' | 'Media' | 'Normal';

/** Posición sobre la esfera en grados. */
export interface LatLon {
  lat: number;
  lon: number;
}

/** Una configuración es una lista de satélites (puntos subsatelitales). */
export type Configuracion = LatLon[];

export interface Region extends LatLon {
  id: string;
  nombre: string;
  radioKm: number;
  prioridad: Prioridad;
  activa: boolean;
}

/** Casquete esférico prohibido: zona de desechos u objeto ocupado. */
export interface ZonaProhibida extends LatLon {
  id: string;
  nombre: string;
  radioGrados: number;
  activa: boolean;
}

export interface ModeloCobertura {
  numSatelites: number;
  /** Semiángulo central de la huella de cada satélite (grados). */
  semiAnguloHuella: number;
  /** Separación mínima entre satélites (grados). */
  separacionMinima: number;
  radioTierraKm: number;
  pesos: Record<Prioridad, number>;
  /** Peso del bono de redundancia en la aptitud. */
  beta: number;
  /** Peso de la guía de proximidad en la aptitud. */
  gamma: number;
}

export interface Escenario {
  nombre: string;
  regiones: Region[];
  desechos: ZonaProhibida[];
  ocupadas: ZonaProhibida[];
  modelo: ModeloCobertura;
}

export type TipoViolacion = 'desechos' | 'ocupada' | 'separacion';

export interface Violacion {
  tipo: TipoViolacion;
  satelite: number;
  /** Zona invadida o, para separación, el índice del otro satélite. */
  contra: string;
  /** Cuántos grados invade (siempre > 0). */
  magnitud: number;
}

export type EstadoRegion = 'cubierta' | 'parcial' | 'no cubierta' | 'inactiva';

export interface EvaluacionRegion {
  id: string;
  nombre: string;
  prioridad: Prioridad;
  peso: number;
  /** Fracción de los puntos de muestreo observados (0..1). */
  fraccion: number;
  /** Satélites que cubren la región completa por sí solos. */
  satelitesCompletos: number[];
  /** Distancia del centro al satélite más cercano (grados). */
  distanciaMinima: number;
  /** Índice del satélite más cercano. */
  sateliteMasCercano: number;
  estado: EstadoRegion;
}

export interface Evaluacion {
  fitness: number;
  cobertura: number;
  redundancia: number;
  guia: number;
  regiones: EvaluacionRegion[];
  regionesCubiertas: number;
  regionesActivas: number;
  violaciones: Violacion[];
  violacionTotal: number;
  valida: boolean;
}

export interface ParametrosAG {
  poblacion: number;
  generaciones: number;
  torneo: number;
  probCruce: number;
  /** Probabilidad de mutar cada satélite del hijo. */
  probMutacion: number;
  /** Desviación del paso de mutación (grados). */
  sigmaMutacion: number;
  /** Probabilidad de recolocar un satélite al azar. */
  probReinicio: number;
  elitismo: number;
  semilla: number;
  /** Emparejar satélites antes del cruce (ver docs). */
  alinearCruce: boolean;
}

export interface RegistroGeneracion {
  generacion: number;
  mejor: number;
  media: number;
  peor: number;
  /** Media de la aptitud solo entre configuraciones válidas (null si no hay). */
  mediaValidos: number | null;
  validos: number;
  diversidad: number;
  mejorValida: boolean;
  mejorViolacion: number;
  mejorCobertura: number;
  mejorRegionesCubiertas: number;
  mejorConfig: Configuracion;
}

/** SIN_VALIDA indica que la búsqueda no encontró una configuración válida; no demuestra inviabilidad. */
export type EstadoSolucion = 'VÁLIDA' | 'INVÁLIDA' | 'SIN_VALIDA';

export interface Individuo {
  config: Configuracion;
  eval: Evaluacion;
}

export interface ResultadoEjecucion {
  parametros: ParametrosAG;
  escenario: Escenario;
  historial: RegistroGeneracion[];
  inicial: Individuo;
  final: Individuo;
  estado: EstadoSolucion;
  /** Primera generación en que la mejor fue válida y cubrió todo (-1 si nunca). */
  generacionSatisfactoria: number;
  evaluaciones: number;
  tiempoMs: number;
}
