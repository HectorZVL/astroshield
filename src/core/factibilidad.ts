// Análisis de factibilidad previo a la evolución.
// Un algoritmo evolutivo NO puede demostrar que un escenario es inviable;
// solo puede no encontrar solución. Este análisis aporta evidencia adicional:
// - fracción del espacio libre (malla uniforme de puntos),
// - un "testigo": 8 posiciones válidas encontradas con un método voraz.
// Si hay testigo, el escenario es factible demostrado. Si no, es posiblemente inviable.
import { evaluar, preparar, violaciones } from './evaluacion';
import { distancia, mallaFibonacci } from './geo';
import type { Configuracion, Escenario } from './tipos';

export interface Factibilidad {
  puntosMalla: number;
  puntosLibres: number;
  /** Fracción de la superficie donde se puede colocar un satélite (0..1). */
  fraccionLibre: number;
  factibleDemostrado: boolean;
  testigo: Configuracion | null;
  mensaje: string;
}

export function analizarFactibilidad(escenario: Escenario, puntos = 20000): Factibilidad {
  const ctx = preparar(escenario);
  const n = escenario.modelo.numSatelites;
  const sep = escenario.modelo.separacionMinima;
  const malla = mallaFibonacci(puntos);

  // Un punto es libre si un satélite colocado ahí no viola ninguna zona.
  const libres = malla.filter((p) => violaciones([p], ctx).length === 0);

  // Voraz: recorre los puntos libres y toma cada uno que respete la separación.
  const testigo: Configuracion = [];
  for (const p of libres) {
    if (testigo.every((q) => distancia(p, q) >= sep)) {
      testigo.push(p);
      if (testigo.length === n) break;
    }
  }
  const factible = testigo.length === n && evaluar(testigo, ctx).valida;
  const fraccionLibre = libres.length / malla.length;

  let mensaje: string;
  if (factible) {
    mensaje = `Factible demostrado: existe al menos una configuración válida (espacio libre ${(fraccionLibre * 100).toFixed(1)} %).`;
  } else if (libres.length === 0) {
    mensaje = 'Inviable: ningún punto de la malla está libre de restricciones.';
  } else {
    mensaje = `Posiblemente inviable: solo caben ${testigo.length} de ${n} satélites con separación ≥ ${sep}° en el espacio libre (${(fraccionLibre * 100).toFixed(2)} %).`;
  }

  return {
    puntosMalla: malla.length,
    puntosLibres: libres.length,
    fraccionLibre,
    factibleDemostrado: factible,
    testigo: factible ? testigo : null,
    mensaje,
  };
}
