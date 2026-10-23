# Cómo funciona el algoritmo evolutivo (explicación didáctica)

Este documento explica el algoritmo paso a paso, con ejemplos de la ejecución de referencia (semilla 42) y el archivo de código donde está cada parte. Las decisiones y su justificación formal están en [01-definicion-del-problema.md](01-definicion-del-problema.md).

## 1. La idea en una frase

Se crean muchas constelaciones al azar, se miden y se hace que **las mejores tengan "hijos"** que mezclan sus satélites y los mueven un poco. Generación tras generación, la población se llena de constelaciones cada vez mejores. Es la misma lógica de la selección natural: variación + selección + herencia.

## 2. El recorrido completo, con datos reales

| Paso | Qué ocurre | Ejemplo real (semilla 42) | Código |
|---|---|---|---|
| 1. Población inicial | 80 constelaciones de 8 satélites puestos al azar sobre la esfera | La mejor de las 80 tiene F = 0.9252 y cubre 5 de 6 regiones. 61 de las 80 son válidas | `MotorEvolutivo` constructor, `configuracionAleatoria` en [ag.ts](../src/core/ag.ts) |
| 2. Evaluación | A cada constelación se le calcula su aptitud F y su violación V | — | `evaluar` en [evaluacion.ts](../src/core/evaluacion.ts) |
| 3. Selección | Para elegir cada padre se toman 3 constelaciones al azar y gana la mejor (torneo) | — | `torneo` en ag.ts |
| 4. Cruce | El hijo toma cada satélite del padre A o del B (50 %), tras emparejar satélites parecidos | — | `emparejar`, `cruzar` |
| 5. Mutación | Algunos satélites del hijo se mueven unos grados; muy pocos saltan a cualquier lugar | — | `mutar` |
| 6. Elitismo | Las 2 mejores pasan intactas a la siguiente generación | La curva del mejor nunca baja | `paso()` |
| 7. Repetir | Pasos 2–6 durante 150 generaciones | Gen. 5: cubre las 6 regiones. Gen. 18: alcanza F* = 1.07692 (óptimo del criterio) | `paso()` |
| 8. Resultado | La mejor constelación encontrada y el historial de cada generación | `results/run-referencia.json` | `resultado()` |

## 3. ¿Qué es una "constelación" para el programa?

Una lista de 8 pares (latitud, longitud):

```ts
// src/core/tipos.ts
type Configuracion = { lat: number; lon: number }[];   // siempre 8 elementos
```

No se guarda la altitud porque es la misma para todos (supuesto S2). Es la representación más simple que contiene todo lo que el modelo usa.

## 4. ¿Cómo se mide si una constelación es buena? (aptitud)

### 4.1 ¿Qué ve un satélite?

Cada satélite ve un círculo de 20° de radio sobre la Tierra (su **huella**). Un punto del suelo se ve si está a ≤ 20° del punto debajo del satélite.

### 4.2 ¿Qué tanto se ve cada región?

Cada región (un disco de 300 km) se representa con 37 puntos. Si 37 de 37 puntos están dentro de alguna huella, la región está **cubierta**. Si están 20 de 37, la fracción observada es 54 %.

### 4.3 La fórmula

```
F = C + 0.1·R + 0.5·G
```

- **C (cobertura):** promedio de las fracciones observadas, ponderado por prioridad (Alta = 3, Media = 2, Normal = 1). Es lo más importante y vale de 0 a 1.
- **R (redundancia):** qué parte de la prioridad total tiene **2 o más** satélites que cubren la región completa. Es un bono: si un satélite falla, esa región sigue observada.
- **G (guía):** una pista para regiones que todavía no se ven completas. Vale más cuanto más cerca está el satélite más cercano. Desaparece cuando todo está cubierto.

**Ejemplo con números:** la configuración final de referencia cubre todo (C = 1) y duplica Yucatán (3), Amazonía (3), California (2) y Sahel (2), o sea R = 10/13 = 0.769. Por lo tanto F = 1 + 0.1·0.769 + 0 = **1.07692**.

**¿Por qué 0.1 y 0.5?** Están elegidos para que el orden de importancia sea siempre el mismo: cubrir más vale más que tener redundancia, y la pista nunca vale más que cubrir de verdad. La demostración está en docs/01 §3.2.

## 5. ¿Cómo se respetan las restricciones? (reglas de Deb)

Una constelación es **inválida** si algún satélite está dentro de una zona de desechos, dentro de la exclusión de un objeto ocupado o a menos de 3° de otro satélite. La **violación V** suma cuántos grados invade.

Para decidir cuál de dos constelaciones es mejor, el programa **siempre** usa estas tres reglas (`comparar` en [comparacion.ts](../src/core/comparacion.ts)):

1. Válida contra inválida: **gana la válida**, aunque la inválida tenga una aptitud altísima.
2. Válida contra válida: gana la de mayor F.
3. Inválida contra inválida: gana la que **viola menos**.

Analogía: es como una competencia en la que primero se descalifica a quien rompió las reglas y solo después se mira la puntuación. Entre dos descalificados, se prefiere al que rompió menos.

**Consecuencias:**
- Si existe al menos una constelación válida, la mejor reportada **siempre** es válida.
- Si nunca aparece ninguna válida, la mejor reportada es la de menor violación y la ejecución se marca **INVIABLE** (prueba P6).
- Las inválidas no se borran: pueden seguir teniendo hijos válidos. Simplemente pierden todos los torneos contra las válidas.

## 6. Los operadores, uno por uno

### 6.1 Selección por torneo (k = 3)

```
elegir 3 constelaciones al azar  →  gana la mejor según Deb  →  ese es el padre
```

Las buenas ganan más torneos y por eso tienen más hijos. Las malas también pueden ser elegidas a veces (si les tocan rivales peores), y eso mantiene variedad en la población.

### 6.2 Cruce uniforme alineado

Problema: el orden de los satélites no significa nada. El satélite 1 del padre A puede estar sobre Japón y el satélite 1 del padre B sobre Yucatán. Mezclarlos por posición en la lista produce hijos con dos satélites en Japón y ninguno en Yucatán.

Solución: antes de cruzar, cada satélite de A se **empareja** con el satélite más cercano de B. Después, para cada pareja, el hijo hereda uno de los dos con probabilidad 50 %.

```
Padre A:  [Japón, Yucatán, Sahel, …]
Padre B:  [Yucatán', Sahel', Japón', …]      (mismas regiones, otro orden)
Emparejar: Japón↔Japón', Yucatán↔Yucatán', Sahel↔Sahel'
Hijo:     [Japón', Yucatán, Sahel', …]       ← conserva un satélite por región
```

La prueba P9 midió que el cruce alineado alcanza la cota en 28/30 ejecuciones (generación media 46.1), contra 20/30 (generación 61.4) sin alinear, con p = 0.0094.

### 6.3 Mutación

Cada satélite del hijo:
- con probabilidad 0.02 **salta** a un punto aleatorio del planeta (exploración global);
- si no salta, con probabilidad 0.25 se **mueve** una distancia |N(0, 6°)| en una dirección aleatoria (ajuste fino).

El movimiento se calcula sobre la esfera con la fórmula de destino de gran círculo, no sumando grados. Cerca de los polos, sumar grados de longitud deformaría la distancia.

### 6.4 Elitismo (E = 2)

Las 2 mejores pasan sin cambios. Garantiza que la mejor solución nunca se pierda, así que la curva "mejor" de la gráfica no puede bajar.

## 7. ¿Cómo se ve la evolución en los datos?

Ejecución de referencia (tabla completa en [03-pruebas.md](03-pruebas.md), P2):

| Generación | Mejor F | Media F | Válidos | Diversidad |
|---|---|---|---|---|
| 0 | 0.9252 | 0.3470 | 61/80 | 35.6° |
| 5 | 1.0000 | 0.8449 | 76/80 | 20.0° |
| 20 | 1.0769 | 1.0303 | 78/80 | 9.4° |
| 150 | 1.0769 | 1.0502 | 79/80 | 9.3° |

Se distinguen tres fases:
1. **Exploración (gen. 0–5):** la media sube rápido porque la selección elimina constelaciones malas. En la generación 5 ya se cubren las 6 regiones.
2. **Refinamiento (gen. 5–20):** los satélites sobrantes se reacomodan para dar redundancia a las regiones de mayor prioridad, hasta alcanzar la cota F*.
3. **Meseta (gen. 20–150):** el mejor ya no mejora porque llegó al óptimo del criterio. La media sigue por debajo porque la mutación sigue generando variantes peores que se descartan.

## 8. Reproducibilidad

Toda la aleatoriedad sale de un único generador con semilla (mulberry32, [rng.ts](../src/core/rng.ts)), consumido siempre en el mismo orden. Por eso:
- `npm run evolucionar -- --semilla 42` da siempre el mismo resultado;
- la interfaz, que ejecuta el mismo `MotorEvolutivo` en un Web Worker, reproduce exactamente los números de la CLI. Por ejemplo, el preset «Inviable» termina con violación 11.01°, igual que P6;
- la prueba `tests/referencia.test.ts` vuelve a ejecutar la semilla 42 y comprueba que el resultado sea idéntico al guardado en `results/run-referencia.json`.

## 9. Mapa del código

| Archivo | Responsabilidad |
|---|---|
| `src/core/tipos.ts` | Tipos de datos compartidos |
| `src/core/rng.ts` | Generador aleatorio con semilla |
| `src/core/geo.ts` | Geometría sobre la esfera (distancias, destino, muestreo) |
| `src/core/escenario.ts` | Datos del enunciado y funciones para cambiar condiciones |
| `src/core/evaluacion.ts` | Cobertura, aptitud F y restricciones (violación V) |
| `src/core/comparacion.ts` | Reglas de Deb y estados VÁLIDA / INVÁLIDA / INVIABLE |
| `src/core/ag.ts` | Algoritmo genético (operadores, motor, historial) |
| `src/core/factibilidad.ts` | Análisis previo: espacio libre y testigo de factibilidad |
| `src/core/busquedaAleatoria.ts` | Línea base para la prueba P8 |
| `src/core/estadistica.ts` | Media, desviación, Mann-Whitney |
| `src/app/worker.ts` | Ejecuta el motor en segundo plano para la UI |
| `src/app/main.ts` | Conecta datos, escena 3D y HUD |
| `src/app/estadoVista.ts` | Qué chip mostrar (probado en `tests/estadoVista.test.ts`) |
| `src/app/escena/*` | Globo, capas 3D y cámara |
| `src/app/tema.ts` | Todos los colores |
| `experiments/run-all.ts` | Todos los experimentos y el documento de pruebas |
| `experiments/cli.ts` | Ejecutar una evolución desde la terminal |
