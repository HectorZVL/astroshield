# Entregable 4 — Análisis de resultados

Todas las cifras de este documento salen de ejecuciones reales del sistema, guardadas en `results/` y presentadas con detalle en [03-pruebas.md](03-pruebas.md). Para regenerarlas: `npm run experimentos` (las semillas son fijas, así que los números vuelven a salir iguales). Entre paréntesis se indica la prueba y el archivo de donde sale cada dato.

## 1. ¿Qué tan bien se observan las regiones solicitadas en la configuración final?

**Muy bien, según el criterio definido, y con evidencia de optimalidad.**

- La configuración de referencia (semilla 42) es **VÁLIDA** y observa el **100 %** de las 6 regiones (37/37 puntos de muestreo en cada una) (P1, `run-referencia.json`).
- Además, **duplica** la cobertura de Yucatán, Amazonía, California y Sahel. Su aptitud es F = 1.07692, que es **exactamente la cota teórica F*** calculada a mano en docs/01 §7. Para este criterio, no existe una configuración mejor.
- No es un resultado aislado. En 30 semillas distintas, **30/30** cubren las 6 regiones y **28/30** alcanzan F* (P7, `p7-variacion.json`).
- Distancia del satélite más cercano al centro de cada región en la referencia: entre 12.56° (Amazonía) y 16.92° (Yucatán). Todas quedan por debajo de 17.30°, el límite para que un satélite vea la región completa (P1).

**Matiz importante:** "bien observada" significa "dentro de la huella de 20° según nuestro modelo binario" (supuesto S5). El modelo no distingue entre ver una región en el centro de la huella o en su borde. Ver la pregunta 6.

## 2. ¿Cómo cambió la calidad de la solución durante el proceso evolutivo?

Tres fases claras (P2, `historial-referencia.csv`, `p2-evolucion.json`):

| Fase | Generaciones | Mejor F (media de 30 ejecuciones) | Qué pasa |
|---|---|---|---|
| Inicial (aleatoria) | 0 | 0.7232 ± 0.0617 | Satélites al azar: ninguna constelación cubre todo |
| Exploración | 0 → 10 | 0.72 → 1.0326 | La selección descarta lo malo; en promedio se cubren las 6 regiones en la generación 6.1 ± 1.6 |
| Refinamiento | 10 → 50 | 1.0326 → 1.0715 | Los satélites sobrantes se reubican para dar redundancia a las regiones prioritarias |
| Meseta | 50 → 150 | 1.0715 → 1.0759 | Casi todas ya están en F*; mejoras raras y pequeñas |

Otros indicadores de la referencia: la **diversidad** baja de 35.6° a 9.3° (la población converge sin colapsar) y las configuraciones **válidas** pasan de 61/80 a 79/80. En las 30 ejecuciones, el mejor **nunca empeora** de una generación a otra, gracias al elitismo (P2, verificado automáticamente).

## 3. ¿Qué diferencias se encontraron entre distintas ejecuciones?

(P7, `p7-variacion.json`, 30 semillas)

| Métrica | Media ± desv. | Mín – máx |
|---|---|---|
| Aptitud final F | 1.07590 ± 0.00390 | 1.06154 – 1.07692 |
| Generación en que cubre todo | 6.1 ± 1.6 | 3 – 9 |
| Generación en que alcanza F* (28 ejecuciones) | 46.1 ± 28.5 | 20 – 124 |
| Distancia entre configuraciones finales | 10.41° ± 2.11° | 5.58° – 18.13° |

- **En calidad, las diferencias son mínimas.** 28 ejecuciones terminan exactamente en F* y 2 (semillas 8 y 15) en F = 1.06154.
- **En forma, son grandes.** Dos configuraciones finales están en promedio a 10.4° una de otra, y la segunda región Media duplicada cambia según la semilla: Sahel en 16 ejecuciones, Japón en 12. **El óptimo no es único:** hay una meseta de configuraciones igual de buenas.
- **En velocidad, también hay variación.** Alcanzar F* tomó entre 20 y 124 generaciones.
- **Las 2 ejecuciones que no llegan a F* están atrapadas en un óptimo local** (diagnóstico automático en P7). Usan 3 satélites para duplicar Yucatán y California en lugar de 2 compartidos, y ninguno de sus 8 satélites sobra: el aporte mínimo de cada uno es 0.0154. Mejorar exigiría dos cambios coordinados a la vez. Esto confirma la consideración del enunciado: *que el algoritmo deje de mejorar no demuestra que encontró el óptimo*. Lo que lo demuestra en las otras 28 es la **cota teórica**, no el estancamiento.

## 4. ¿Qué efecto tuvieron las restricciones espaciales sobre la solución?

**En el escenario original, poco costo pero efecto real**, y un efecto mucho mayor cuando se endurecen:

- **Cumplimiento:** 0 de 31 configuraciones finales invaden zonas de desechos; el margen mínimo es 14.93°. 0 de 31 invaden exclusiones de objetos; el margen mínimo es 4.15° (P3, P4).
- **Las restricciones actúan durante la búsqueda.** En la población aleatoria inicial, en promedio 17.3 de 80 constelaciones son inválidas, y las reglas de Deb las eliminan de la competencia (P3).
- **Prueba de efecto causal** (misma zona, activa o desactivada):
  - Zona trampa de 10° sobre Japón: sin la restricción, 3/10 ejecuciones ponen un satélite dentro; con ella, 0/10. Japón sigue cubierta en 10/10 (P3).
  - Objetos con exclusión de 12° sobre Sahel y Australia: sin ellos, 6/10 ejecuciones (9 satélites) quedan dentro; con ellos, 0/10. La aptitud no cambia (1.0738 en ambos casos): la restricción cambia **dónde** quedan los satélites, no **cuánto** cubren (P4).
- **Espacio reducido** (P5, zonas de desechos con radio ×k):

| k | Espacio libre | Satisfactorias | Cobertura media | ¿Sigue válida la configuración de referencia? |
|---|---|---|---|---|
| ×1 | 97.3 % | 10/10 | 100.00 % | Sí |
| ×3 | 80.4 % | 10/10 | 100.00 % | **No** |
| ×4 | 68.2 % | 10/10 | 100.00 % | **No** |
| ×5 | 53.9 % | 0/10 | 98.21 % (Sahel parcial) | **No** |
| ×6 | 41.2 % | 0/10 | 38.46 % (Yucatán, Amazonía y Sahel sin cubrir) | **No** |

  Hasta ×4 el algoritmo se adapta sin perder cobertura, aunque la configuración original ya no sirva desde ×3. Desde ×5, las zonas crecidas cubren los únicos lugares desde donde se podía observar el Sahel, y luego Yucatán y Amazonía. El sistema **no rompe la restricción para cubrirlas**: entrega soluciones válidas con menos cobertura.

## 5. ¿Qué sucede cuando el sistema no puede satisfacer todas las condiciones?

Se distinguieron dos casos (P6, `p6-inviable.json`):

**a) Objetivo inalcanzable, pero hay soluciones válidas** (zona de 21° sobre Yucatán). Todo satélite válido está a ≥ 21° del centro de Yucatán y la huella mide 20°, así que es geométricamente imposible verla completa. Resultado: 10/10 soluciones **VÁLIDAS**, 0/10 satisfactorias, Yucatán observada al 64.1 % en promedio (máximo 78.4 %) y las otras 5 regiones cubiertas. El sistema reporta el nivel *Aceptable* (no *Satisfactoria*) e indica qué región falta.

**b) Restricciones insatisfacibles** (zona de 178° que deja libre un casquete de 2°, donde no caben 8 satélites a ≥ 3°):
- El **análisis de factibilidad** no encuentra un testigo en su malla: "Posiblemente inviable: solo caben 2 de 8 satélites…", con 0.035 % de espacio libre muestreado. Por sí solo no demuestra que el escenario sea imposible.
- El algoritmo no encuentra **ninguna** configuración válida en 5/5 ejecuciones, y las 5 se reportan **SIN_VALIDA**.
- No se presenta nada como válido. Se entrega la configuración de **menor violación**: la violación baja de 457.68° en la generación 0 a 11.01° al final (semilla 1). Los satélites se amontonan alrededor del único espacio libre.
- **Limitación honesta:** ni la malla ni el algoritmo evolutivo pueden *demostrar* que no hay solución. En este caso concreto, la demostración es el argumento geométrico; el sistema solo informa lo que encontró la búsqueda.

## 6. ¿Qué limitaciones tiene el criterio utilizado para evaluar las configuraciones?

1. **Cobertura binaria (S5).** Un punto en el borde de la huella cuenta igual que uno en el centro. En la práctica, la calidad de observación cae hacia el borde (ángulo de elevación bajo). Una solución con todos los satélites a 17° de sus regiones vale lo mismo que una con satélites encima.
2. **Configuración estática (S3).** Se evalúa una "foto": los satélites reales se mueven y la cobertura cambia con el tiempo. El criterio no mide revisita ni tiempo de cobertura.
3. **Meseta de óptimos.** Muchas configuraciones distintas tienen F = F* (P7: configuraciones finales a 10.4° de distancia entre sí). El criterio no tiene cómo preferir una sobre otra, por ejemplo la que deja más margen respecto a las zonas prohibidas.
4. **Pesos arbitrarios (S6).** La escala 3/2/1 y β = 0.1 son decisiones del equipo. Con otros pesos cambiaría a qué región va el segundo satélite. Lo que sí está garantizado por construcción es el **orden** de importancia: cubrir > redundancia > guía.
5. **Redundancia limitada a 2 (S7).** Un tercer satélite sobre una región no suma nada.
6. **Muestreo de 37 puntos (S10).** Con cobertura por unión de varias huellas, una franja muy delgada del borde podría quedar sin ver entre muestras.
7. **La guía G puede atraer a óptimos locales.** Empuja satélites hacia la región no cubierta más cercana, que no siempre es la que conviene cubrir.

Ninguna de estas limitaciones afecta la **validez**: las restricciones se verifican exactamente (distancias de gran círculo, sin muestreo).

## 7. ¿Qué evidencia permite afirmar que una solución es mejor que otra?

Se usan cuatro niveles de evidencia, de más débil a más fuerte:

1. **Comparación individual con reglas explícitas.** Entre dos configuraciones, primero se mira la validez, luego F y luego la violación (reglas de Deb). Es reproducible y no depende de la visualización: `comparar()` en `src/core/comparacion.ts`.
2. **Comparación contra una cota teórica.** F* = 1.07692 se dedujo a mano (docs/01 §7). Que 28/30 ejecuciones lleguen exactamente a ese valor y **ninguna lo supere** confirma tanto la optimalidad de esas soluciones como el argumento de la cota.
3. **Comparación estadística entre métodos.** Con el mismo presupuesto de 11 780 evaluaciones (P8):
   - El AG obtiene F = 1.0759 ± 0.0039 y la búsqueda aleatoria F = 0.9385 ± 0.0319.
   - El AG es satisfactorio en 30/30 ejecuciones; la búsqueda aleatoria, en 0/30.
   - Mann-Whitney U = 900 (separación total entre las dos muestras), p < 10⁻⁶.

   Esto demuestra que la mejora viene de los operadores evolutivos y no del volumen de evaluaciones.
4. **Experimentos de ablación y sensibilidad.** Quitar la alineación del cruce reduce las ejecuciones que alcanzan F* de 28/30 a 20/30 (p = 0.0094, P9). Un σ de 1° reduce los éxitos a 3/8 (P10). Cada decisión de diseño tiene una prueba que la respalda o la cuestiona.

Además, toda solución reportada como válida se **reevalúa desde cero** al terminar los experimentos: 0 inconsistencias en 318 ejecuciones. La interfaz recalcula la aptitud del run cargado y la compara con la guardada.
