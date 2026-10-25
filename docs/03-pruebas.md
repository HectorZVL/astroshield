# Entregable 3 — Pruebas y validación

> **Documento generado automáticamente** por `npm run experimentos` (`experiments/run-all.ts`) a partir de ejecuciones reales. No se edita a mano: todos los números provienen de los archivos de `results/`. Todas las semillas son fijas, así que ejecutar de nuevo el comando produce los mismos resultados (salvo los tiempos de ejecución).

## Resumen

| Id | Prueba | Resultado | Resumen |
| --- | --- | --- | --- |
| P1 | Escenario inicial | ✅ PASA | VÁLIDA, 6/6 regiones cubiertas, F = 1.07692. |
| P2 | Evolución | ✅ PASA | la mejor aptitud mejora en las 30 ejecuciones y nunca disminuye. |
| P3 | Zonas restringidas | ✅ PASA | 0 invasiones en 31 configuraciones finales; con la zona trampa activa, 0/10 invasiones (sin ella, 3/10). |
| P4 | Posiciones ocupadas | ✅ PASA | 0 invasiones en 31 configuraciones finales; con los objetos sobre regiones, 0/10 invasiones (sin ellos, 6/10). |
| P5 | Espacio reducido | ✅ PASA | con espacio libre de 97.3 % a 41.2 %, ninguna solución inválida se reporta como válida; la cobertura media baja de 100.00 % a 38.46 %. |
| P6 | Condición difícil e inviable | ✅ PASA | difícil: 10/10 válidas y 0 falsas "satisfactorias"; inviable: 5/5 sin válida encontrada. |
| P7 | Variación de la ejecución | ✅ PASA | 30/30 válidas; 28/30 alcanzan F*; F = 1.07590 ± 0.00390. |
| P8 | Propia: AG contra búsqueda aleatoria | ✅ PASA | AG F = 1.0759 contra aleatoria F = 0.9385; p = < 1e-6. |
| P9 | Propia: ablación del cruce alineado | ✅ PASA | prueba descriptiva; con alineación 28/30 alcanzan F* (gen. media 46.1), sin alineación 20/30 (gen. media 61.4). |
| P10 | Propia: sensibilidad | ✅ PASA | prueba descriptiva; mejor σ: σ = 6°, mejor N: N = 80. |
| P11 | Cambio de condiciones | ✅ PASA | 2/7 cambios invalidan la configuración anterior; todas las reevoluciones terminan VÁLIDAS. |

- P1–P7 son las 7 pruebas obligatorias del enunciado. P8, P9 y P10 son pruebas propias del equipo. P11 documenta el cambio de condiciones (sección 3.3).
- **Verificación independiente:** cada una de las 318 ejecuciones de este documento se volvió a evaluar desde cero al terminar. Inconsistencias entre el estado reportado y la reevaluación: **0**. Ninguna solución inválida se reportó como válida.
- Cota teórica usada: F* = 1 + 0.1 · 10/13 = 1.07692 (docs/01, sección 7).
- Tiempo total de los experimentos: 212.4 s (Node v24.18.0).

## P1 — Escenario inicial

**Condiciones.** Escenario del enunciado sin cambios (6 regiones, 3 zonas de desechos, 2 objetos ocupados), semilla 42, parámetros base: población 80, 150 generaciones, torneo 3, pc = 0.9, pm = 0.25, σ = 6°, pr = 0.02, elitismo 2, cruce alineado. Archivo: `results/run-referencia.json` (es el que carga la visualización).

**Análisis de factibilidad previo.** Factible demostrado: existe al menos una configuración válida (espacio libre 97.3 %). (19453 de 20000 puntos de la malla libres).

**Resultados — resumen de la mejor configuración final.**

| Estado | Nivel | Aptitud F | Cobertura C | Redundancia R | Regiones cubiertas | Cota F* | Evaluaciones | Generación satisfactoria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VÁLIDA | Satisfactoria | 1.07692 | 100.0 % | 0.7692 | 6/6 | 1.07692 | 11780 | 5 |

**Regiones.**

| Región | Prioridad | Fracción observada | Estado | Satélites que la cubren completa | Distancia al satélite más cercano |
| --- | --- | --- | --- | --- | --- |
| Península de Yucatán | Alta | 100.0 % | cubierta | S1, S8 | 16.92° |
| Amazonía brasileña | Alta | 100.0 % | cubierta | S2, S5 | 12.56° |
| California | Media | 100.0 % | cubierta | S1, S8 | 14.13° |
| Sahel | Media | 100.0 % | cubierta | S6, S7 | 13.01° |
| Japón | Media | 100.0 % | cubierta | S3 | 14.11° |
| Interior de Australia | Normal | 100.0 % | cubierta | S4 | 12.91° |

**Satélites.**

| Satélite | Latitud | Longitud | Cubre completamente | Margen a desechos | Margen a objetos |
| --- | --- | --- | --- | --- | --- |
| S1 | 25.40° | -106.87° | Península de Yucatán + California | 46.8° (Pacífico Sur) | 130.2° (Objeto A) |
| S2 | -15.84° | -59.59° | Amazonía brasileña | 46.8° (Pacífico Sur) | 101.6° (Objeto A) |
| S3 | 35.87° | 155.44° | Japón | 53.6° (Región polar norte) | 61.6° (Objeto B) |
| S4 | -22.35° | 146.81° | Interior de Australia | 71.6° (Pacífico Sur) | 30.5° (Objeto B) |
| S5 | -10.81° | -46.38° | Amazonía brasileña | 44.7° (Atlántico Norte) | 88.2° (Objeto A) |
| S6 | 9.49° | -12.07° | Sahel | 28.6° (Atlántico Norte) | 51.2° (Objeto A) |
| S7 | 22.25° | -14.89° | Sahel | 16.1° (Atlántico Norte) | 53.5° (Objeto A) |
| S8 | 30.24° | -104.35° | Península de Yucatán + California | 43.1° (Atlántico Norte) | 125.1° (Objeto A) |

(El margen es la distancia al borde de la zona más cercana; positivo = fuera de la zona.)

**Interpretación.** La configuración final es **VÁLIDA** y cubre **6 de 6** regiones al 100 %. Alcanza exactamente la cota teórica F* = 1.07692: además de cubrir todo, duplica la cobertura de las regiones que la cota predice (Yucatán y California comparten satélites; Amazonía y una región Media reciben el segundo satélite). Para este criterio de evaluación la solución es óptima, no solo "buena". La configuración inicial (mejor de la generación 0) tenía F = 0.9252 y 5 regiones cubiertas.

**Resultado de la prueba: ✅ PASA** — VÁLIDA, 6/6 regiones cubiertas, F = 1.07692.

---

## P2 — Evolución de la calidad

**Condiciones.** Historial por generación de la ejecución de referencia (semilla 42) y de las 30 ejecuciones de P7 (semillas 1–30), escenario inicial y parámetros base. Datos completos: `results/historial-referencia.csv` y `results/p2-evolucion.json`.

**Resultados — ejecución de referencia.**

| Generación | Mejor F | Media F | Peor F | Válidos (de 80) | Diversidad (°) | Regiones cubiertas (mejor) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.9252 | 0.3470 | 0.1251 | 61 | 35.6 | 5 |
| 1 | 0.9252 | 0.4539 | 0.1468 | 78 | 32.5 | 5 |
| 2 | 0.9483 | 0.5638 | 0.2700 | 78 | 30.8 | 5 |
| 3 | 0.9549 | 0.6651 | 0.2871 | 79 | 28.7 | 3 |
| 5 | 1.0000 | 0.8449 | 0.4716 | 76 | 20.0 | 6 |
| 10 | 1.0385 | 0.9771 | 0.6730 | 78 | 15.1 | 6 |
| 20 | 1.0769 | 1.0303 | 0.8535 | 78 | 9.4 | 6 |
| 30 | 1.0769 | 1.0452 | 0.9128 | 76 | 8.8 | 6 |
| 50 | 1.0769 | 1.0532 | 0.8856 | 78 | 8.1 | 6 |
| 75 | 1.0769 | 1.0450 | 0.8524 | 76 | 8.2 | 6 |
| 100 | 1.0769 | 1.0491 | 0.8773 | 77 | 8.7 | 6 |
| 150 | 1.0769 | 1.0502 | 0.8484 | 79 | 9.3 | 6 |

**Resultados — media de las 30 ejecuciones.**

| Generación | Mejor F (media ± desv.) | Mejor F mínimo | Media de la población |
| --- | --- | --- | --- |
| 0 | 0.7232 ± 0.0617 | 0.6402 | 0.3687 |
| 1 | 0.7965 ± 0.0655 | 0.6738 | 0.4815 |
| 2 | 0.8731 ± 0.0512 | 0.7703 | 0.5921 |
| 3 | 0.9216 ± 0.0366 | 0.8567 | 0.6818 |
| 5 | 0.9903 ± 0.0206 | 0.9323 | 0.8203 |
| 10 | 1.0326 ± 0.0102 | 1.0154 | 0.9697 |
| 20 | 1.0590 ± 0.0093 | 1.0308 | 1.0252 |
| 30 | 1.0664 ± 0.0104 | 1.0385 | 1.0386 |
| 50 | 1.0715 ± 0.0079 | 1.0538 | 1.0444 |
| 75 | 1.0738 ± 0.0063 | 1.0615 | 1.0493 |
| 100 | 1.0749 ± 0.0053 | 1.0615 | 1.0486 |
| 150 | 1.0759 ± 0.0039 | 1.0615 | 1.0510 |

**Interpretación.** La mejor aptitud sube de 0.9252 (generación 0, configuraciones aleatorias) a 1.07692. La subida es rápida al principio: la generación satisfactoria (todas las regiones cubiertas) es la 5 y la cota F* se alcanza en la generación 18. Después la curva del mejor se estanca, porque ya está en el óptimo del criterio. La media de la población queda por debajo del mejor durante toda la ejecución: la mutación sigue generando variantes peores que se descartan, y eso indica que la búsqueda sigue explorando y no solo copia al mejor. La diversidad baja de 35.6° a 9.3°: la población converge alrededor de la solución, pero no colapsa a una sola configuración. Los válidos pasan de 61/80 en la población aleatoria a 79/80 al final, porque las reglas de Deb empujan a la población fuera de las zonas prohibidas. En las 30 ejecuciones el mejor nunca empeora (elitismo): verificado en todas.

**Resultado de la prueba: ✅ PASA** — la mejor aptitud mejora en las 30 ejecuciones y nunca disminuye.

---

## P3 — Zonas restringidas por desechos

**Condiciones.** (a) Configuraciones finales de las 31 ejecuciones del escenario inicial (referencia + 30 semillas). (b) **Prueba de efecto:** se agrega una zona de desechos ficticia de radio 10° centrada en Japón (36°, 138°) y se ejecutan 10 semillas **con** la zona activa y 10 **sin** ella (misma zona desactivada). Así se comprueba que la restricción cambia la solución y no es solo un dibujo.

**Resultados (a).**

| Métrica | Valor |
| --- | --- |
| Configuraciones finales con algún satélite dentro de una zona de desechos | 0 de 31 |
| Margen mínimo al borde de una zona (mínimo entre todas) | 14.93° |
| Margen mínimo (media entre ejecuciones) | 25.82° |
| Configuraciones inválidas en la población aleatoria inicial (media de 80) | 17.3 (mín 10, máx 25) |

**Resultados (b) — zona trampa sobre Japón (10 semillas).**

| Condición | Ejecuciones con un satélite a < 10° de Japón | Japón cubierta | Distancia mínima satélite–Japón (media) | Ejecuciones VÁLIDAS |
| --- | --- | --- | --- | --- |
| Zona trampa **activa** | 0/10 | 10/10 | 14.45° (mín 12.10°) | 10/10 |
| Zona trampa desactivada | 3/10 | 10/10 | 12.70° (mín 8.80°) | 10/10 |

**Interpretación.** Ninguna configuración final invade las tres zonas de desechos del enunciado. Esto no es casualidad: al inicio, en promedio 17.3 de las 80 configuraciones aleatorias son inválidas (por zonas o separación), y las reglas de Deb hacen que pierdan todos los torneos contra las válidas. La prueba de la zona trampa muestra el **efecto real** de la restricción. Sin la zona, 3 de 10 ejecuciones dejan un satélite a menos de 10° de Japón, porque es la posición natural para cubrirla. Con la zona activa, ninguna lo hace (0/10). El algoritmo mueve los satélites al anillo permitido entre 10° y 17.3° y, aun así, cubre Japón en 10/10 ejecuciones.

**Resultado de la prueba: ✅ PASA** — 0 invasiones en 31 configuraciones finales; con la zona trampa activa, 0/10 invasiones (sin ella, 3/10).

---

## P4 — Posiciones ocupadas

**Condiciones.** (a) Las mismas 31 configuraciones finales del escenario inicial. (b) **Prueba de efecto:** el Objeto A se mueve sobre el centro del Sahel (15°, 0°) y el Objeto B sobre el centro de Australia (−25°, 133°). Su exclusión se amplía a 12°: con los 5° originales, la restricción casi nunca compite con la cobertura (una versión anterior de esta prueba, con 5°, dio 0/10 invasiones con y sin objetos y no permitía ver ningún efecto). Se ejecutan 10 semillas con los objetos activos y 10 con los objetos desactivados.

**Resultados (a).**

| Métrica | Valor |
| --- | --- |
| Configuraciones finales con algún satélite en una zona de exclusión | 0 de 31 |
| Margen mínimo al borde de una exclusión (mínimo entre todas) | 4.15° |
| Margen mínimo (media) | 20.61° |

**Resultados (b) — objetos sobre Sahel y Australia con exclusión de 12° (10 semillas).**

| Condición | Ejecuciones con un satélite a < 12° de un objeto | Satélites dentro (total) | Distancia mínima satélite–objeto (media; mín) | Regiones cubiertas (media) | Aptitud F (media) | VÁLIDAS |
| --- | --- | --- | --- | --- | --- | --- |
| Objetos **activos** | 0/10 | 0 | 13.45°; 12.05° | 6.0 | 1.0738 | 10/10 |
| Objetos desactivados | 6/10 | 9 | 10.66°; 6.72° | 6.0 | 1.0738 | 10/10 |

**Interpretación.** En el escenario original los objetos están lejos de las regiones (el más cercano, B, está a 23.8° de Australia), así que evitarlos casi no cuesta. El margen mínimo de 4.15° confirma que ningún satélite entra en sus exclusiones. En la prueba de efecto, sin los objetos, 6/10 ejecuciones dejan algún satélite a menos de 12° de esos centros (9 satélites en total). Con los objetos activos, 0/10: la distancia mínima nunca baja de 12.05°. El algoritmo desplaza los satélites al anillo permitido (12°–17.3°) y sigue cubriendo las regiones (6.0 en promedio). En este caso la restricción **no tiene costo** en la aptitud (1.0738 en ambas condiciones): el anillo permitido deja espacio suficiente para cubrir y duplicar igual que sin los objetos. La restricción cambia **dónde** quedan los satélites, no **cuánto** cubren.

**Resultado de la prueba: ✅ PASA** — 0 invasiones en 31 configuraciones finales; con los objetos sobre regiones, 0/10 invasiones (sin ellos, 6/10).

---

## P5 — Espacio reducido

**Condiciones.** Se multiplican los radios de las tres zonas de desechos por un factor k ∈ {1, 2, 3, 4, 5, 6}; los objetos ocupados se mantienen. Para cada k: análisis de factibilidad (espacio libre en una malla de 20 000 puntos), 10 ejecuciones (semillas 1–10) y **reevaluación** de la configuración de referencia (P1) bajo las nuevas condiciones.

**Resultados.**

| k | Radios (°) | Espacio libre | Válidas | Satisfactorias | Cobertura C (media) | Regiones cubiertas (media; mín) | F (media ± desv.) | ¿La configuración de P1 sigue válida? | Regiones que alguna vez quedan sin cubrir |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ×1 | 12 / 10 / 8 | 97.3 % | 10/10 | 10/10 | 100.00 % | 6.0; 6 | 1.0754 ± 0.0049 | Sí | — |
| ×2 | 24 / 20 / 16 | 90.3 % | 10/10 | 10/10 | 100.00 % | 6.0; 6 | 1.0754 ± 0.0049 | Sí | — |
| ×3 | 36 / 30 / 24 | 80.4 % | 10/10 | 10/10 | 100.00 % | 6.0; 6 | 1.0754 ± 0.0049 | **No** (1 violaciones) | — |
| ×4 | 48 / 40 / 32 | 68.2 % | 10/10 | 10/10 | 100.00 % | 6.0; 6 | 1.0723 ± 0.0074 | **No** (2 violaciones) | — |
| ×5 | 60 / 50 / 40 | 53.9 % | 10/10 | 0/10 | 98.21 % | 5.0; 5 | 1.0431 ± 0.0070 | **No** (5 violaciones) | Sahel |
| ×6 | 72 / 60 / 48 | 41.2 % | 10/10 | 0/10 | 38.46 % | 3.0; 3 | 0.5752 ± 0.0068 | **No** (8 violaciones) | Península de Yucatán, Amazonía brasileña, Sahel |

**Interpretación.** Al reducir el espacio, el espacio libre baja de 97.3 % a 41.2 %. Mientras exista espacio, el sistema siempre entrega soluciones **válidas** (en todos los niveles factibles las 10 ejecuciones son válidas). Lo que se degrada es la **calidad**. Con ×5, 10 de 10 ejecuciones ya no cubren todas las regiones (sin cubrir: Sahel); con ×6 se cubren en promedio 3.0 regiones. Las zonas crecidas alcanzan los anillos desde donde se puede observar esas regiones. El algoritmo no "rompe" la restricción para cubrirlas: prefiere una solución válida con menos cobertura. La columna de reevaluación responde a la sección 3.3: la configuración que era óptima en el escenario original deja de ser válida desde ×3. Por eso, cuando cambian las condiciones, el sistema vuelve a validar y, si hace falta, vuelve a evolucionar.

**Resultado de la prueba: ✅ PASA** — con espacio libre de 97.3 % a 41.2 %, ninguna solución inválida se reporta como válida; la cobertura media baja de 100.00 % a 38.46 %.

---

## P6 — Condición difícil e inviable

Se construyeron dos escenarios. Representan dos formas distintas de "no poder cumplir":

1. **Difícil (objetivo inalcanzable):** existen configuraciones válidas, pero ninguna puede cubrir todas las regiones.
2. **Inviable (restricciones insatisfacibles):** no existe ninguna configuración válida.

### (a) Difícil: zona de 21° sobre Yucatán

**Condiciones.** Se agrega una zona de desechos de radio 21° centrada en Yucatán (20.5°, −89°); 10 semillas. **Por qué es imposible cubrir Yucatán:** todo satélite válido está a ≥ 21° del centro de Yucatán y la huella mide 20°, así que el centro de la región nunca puede observarse.

| Métrica | Valor |
| --- | --- |
| Ejecuciones VÁLIDAS | 10/10 |
| Ejecuciones satisfactorias (todo cubierto) | 0/10 |
| Fracción observada de Yucatán (media; máx) | 64.1 %; 78.4 % |
| Otras regiones cubiertas (media de 5) | 5.0 |
| Cobertura ponderada C (media) | 91.70 % |

**Interpretación.** El sistema no "hace trampa": las 10 soluciones son válidas y Yucatán queda **parcial** (se observa en promedio 64.1 % del disco, el borde más cercano a la zona permitida). El nivel reportado es *Aceptable* y no *Satisfactoria*: el reporte dice explícitamente que el objetivo no se cumplió. Las demás regiones se siguen cubriendo.

### (b) Inviable: casquete libre de 2°

**Condiciones.** Se agrega una zona de desechos de radio 178° centrada en (0°, 0°). Solo queda libre un casquete de radio 2° alrededor de (0°, 180°). En ese casquete no caben 8 satélites con separación ≥ 3°. 5 semillas.

**Análisis de factibilidad.** Posiblemente inviable: solo caben 2 de 8 satélites con separación ≥ 3° en el espacio libre (0.03 %). (7 puntos libres de 20000).

| Semilla | Estado reportado | Configuraciones válidas vistas en toda la ejecución | Violación de la mejor en gen. 0 | Violación de la mejor final |
| --- | --- | --- | --- | --- |
| 1 | **SIN_VALIDA** | 0 | 457.68° | 11.01° |
| 2 | **SIN_VALIDA** | 0 | 445.76° | 10.52° |
| 3 | **SIN_VALIDA** | 0 | 497.12° | 11.09° |
| 4 | **SIN_VALIDA** | 0 | 437.65° | 11.11° |
| 5 | **SIN_VALIDA** | 0 | 416.03° | 10.93° |

Evolución de la violación de la mejor (semilla 1): gen 0: 457.68° · gen 10: 163.49° · gen 25: 52.37° · gen 50: 13.54° · gen 100: 11.19° · gen 150: 11.01°.

La configuración de menor violación (semilla 1) tiene 6 violaciones de zona y 4 de separación. 2 de sus 8 satélites están dentro del casquete libre. Los que invaden la zona entran en promedio 1.58° (máximo 2.03°), y ningún satélite está a más de 4.03° de (0°, 180°): la evolución los amontona alrededor del único espacio libre. Esa configuración se guarda en `results/p6-inviable.json`. La UI la reproduce con el preset «Inviable» (semilla 1, parámetros base) y la marca con el chip **Sin válida encontrada**.

**Interpretación.** El análisis de factibilidad no encuentra un testigo en su malla (espacio libre muestreado: 0.035 %), y el algoritmo no encuentra ninguna configuración válida en sus cinco ejecuciones. Son observaciones de búsqueda, no pruebas de inviabilidad. Se entrega la configuración de **menor violación** para mostrar qué tan lejos quedó de cumplir. Como Deb compara las inválidas por violación, esa magnitud baja durante la evolución. En este escenario concreto, la imposibilidad se justifica por separado con el argumento geométrico: 8 puntos a ≥ 3° no caben en un casquete de 2°.

**Resultado de la prueba: ✅ PASA** — difícil: 10/10 válidas y 0 falsas "satisfactorias"; inviable: 5/5 sin válida encontrada.

---

## P7 — Variación entre ejecuciones

**Condiciones.** Escenario inicial y parámetros base. Solo cambia la semilla (1 a 30). Datos por semilla: `results/p7-variacion.json`.

**Resultados.**

| Métrica | Media | Desv. est. | Mínimo | Máximo | Mediana |
| --- | --- | --- | --- | --- | --- |
| Aptitud final F | 1.07590 | 0.00390 | 1.06154 | 1.07692 | 1.07692 |
| Cobertura C | 1.0000 | 0.0000 | 1.0000 | 1.0000 | 1.0000 |
| Redundancia R | 0.7590 | 0.0390 | 0.6154 | 0.7692 | 0.7692 |
| Regiones cubiertas | 6.00 | 0.00 | 6.00 | 6.00 | 6.00 |
| Generación satisfactoria | 6.1 | 1.6 | 3.0 | 9.0 | 6.5 |
| Generación en que se alcanza F* (28 ejecuciones) | 46.1 | 28.5 | 20.0 | 124.0 | 38.5 |
| Diversidad final (°) | 8.63 | 0.90 | 6.85 | 11.28 | 8.44 |
| Distancia entre configuraciones finales (°, 435 pares) | 10.41 | 2.11 | 5.58 | 18.13 | 10.12 |
| Tiempo por ejecución (ms) | 566 | 28 | 525 | 644 | 565 |

Regiones que reciben redundancia (≥ 2 satélites completos), en número de ejecuciones: Península de Yucatán 30/30, Amazonía brasileña 30/30, California 30/30, Sahel 16/30, Japón 12/30.

**Interpretación.** Las 30 ejecuciones terminan VÁLIDAS y todas cubren las 6 regiones. 28 de 30 alcanzan la cota teórica F* = 1.07692 (generación media 46.1, entre 20 y 124). Ninguna la supera (0 casos), lo que es consistente con el argumento de la cota y sirve como comprobación cruzada del modelo. Las 2 que no llegan (semillas 8, 15) terminan con F = 1.06154. Cubren todo y duplican Península de Yucatán, Amazonía brasileña, California, pero ni Sahel ni Japón tienen segundo satélite. El diagnóstico (`results/p7-variacion.json`, campo `diagnosticoNoAlcanzan`) muestra por qué. Para duplicar Yucatán y California usan 3 y 3 satélites (1 compartido, 1 solo para Yucatán y 1 solo para California), en lugar de los 2 compartidos de la solución óptima. Además, **ningún satélite sobra**: el aporte mínimo de un satélite a la aptitud es 0.0154 y 0.0154 > 0. Es un **óptimo local**. Para mejorar se necesitan dos cambios coordinados: meter un segundo satélite en la zona común Yucatán–California y llevar el que queda libre a Sahel o Japón, a 60–90° de distancia. La mutación de un solo satélite no produce ambos a la vez. Por eso el estancamiento **no** demuestra optimalidad (consideración 5 del enunciado). La variación en **calidad** es pequeña (desviación 0.00390). La variación en **forma** es grande: dos configuraciones finales están en promedio a 10.41° de distancia (Chamfer), y la redundancia de la región Media se reparte entre varias regiones según la semilla. Esto confirma que el óptimo **no es único**: el criterio tiene una meseta de configuraciones equivalentes, y cada ejecución termina en un punto distinto de ella. La diferencia entre ejecuciones se manifiesta sobre todo en **cuándo** se llega al óptimo y en **qué** configuración concreta se elige.

**Resultado de la prueba: ✅ PASA** — 30/30 válidas; 28/30 alcanzan F*; F = 1.07590 ± 0.00390.

---

## P8 — Prueba propia: ¿el algoritmo evolutivo aporta algo frente al azar?

**Pregunta.** Una curva que sube no prueba que la evolución sirva: cualquier búsqueda mejora si se evalúan más configuraciones. Se compara el AG contra una **búsqueda aleatoria pura** con **exactamente el mismo presupuesto** de 11780 evaluaciones. Si el AG no le gana, sus operadores no estarían aportando nada.

**Condiciones.** Escenario inicial; 30 semillas por método (las mismas 1–30). Búsqueda aleatoria: genera 11780 configuraciones uniformes y se queda con la mejor según las mismas reglas de Deb. Comparación estadística con la prueba U de Mann-Whitney (no supone normalidad).

**Resultados.**

| Método | F media ± desv. | F mín – máx | Cobertura C media | Regiones cubiertas (media) | Satisfactorias |
| --- | --- | --- | --- | --- | --- |
| Algoritmo genético | 1.0759 ± 0.0039 | 1.0615 – 1.0769 | 100.00 % | 6.00 | 30/30 |
| Búsqueda aleatoria | 0.9385 ± 0.0319 | 0.8769 – 0.9969 | 90.60 % | 4.20 | 0/30 |

Mann-Whitney: U = 900.0, z = 7.02, p = < 0.000001.

Mejor aptitud media según el número de evaluaciones (≈ 78 evaluaciones por generación):

| Evaluaciones aprox. | AG | Aleatoria |
| --- | --- | --- |
| 158 | 0.7965 | 0.7166 |
| 860 | 1.0326 | 0.8461 |
| 1640 | 1.0590 | 0.8720 |
| 3980 | 1.0715 | 0.9121 |
| 7880 | 1.0749 | 0.9212 |
| 11780 | 1.0759 | 0.9360 |

**Interpretación.** El AG es claramente superior: 30/30 ejecuciones cubren todo, frente a 0/30 de la búsqueda aleatoria, y la diferencia es estadísticamente significativa (p < 0.001). La razón es combinatoria. Cubrir las 6 regiones exige que 6 satélites caigan cada uno en un casquete de 17.3° alrededor de su región, a la vez. Al azar es extremadamente improbable. El AG, en cambio, conserva lo que ya funciona (selección y elitismo) y ajusta el resto de a poco (mutación), además de combinar satélites bien colocados de padres distintos (cruce alineado). Esta prueba es la evidencia más directa de que **la evolución, y no el volumen de evaluaciones, produce la solución**.

**Resultado de la prueba: ✅ PASA** — AG F = 1.0759 contra aleatoria F = 0.9385; p = < 1e-6.

---

## P9 — Prueba propia: ¿sirve alinear los satélites antes del cruce?

**Pregunta.** En docs/01 se justificó emparejar los satélites de los padres antes del cruce, porque el orden de los satélites no significa nada. Esta prueba mide si esa decisión tiene efecto real o es solo teoría.

**Condiciones.** Escenario inicial, parámetros base, 30 semillas con el cruce **alineado** (las de P7) y 30 con cruce uniforme **sin alinear** (satélite i con satélite i). Métrica principal: generación en que se alcanza la cota F*. Si una ejecución nunca la alcanza, cuenta como 151 para la prueba de Mann-Whitney.

**Resultados.**

| Cruce | Alcanzan F* | Generación para F* (media ± desv.) | Generación satisfactoria (media) | Mejor F en gen. 20 (media) | F final (media) |
| --- | --- | --- | --- | --- | --- |
| Alineado | 28/30 | 46.1 ± 28.5 | 6.1 | 1.0590 | 1.07590 |
| Sin alinear | 20/30 | 61.4 ± 38.2 | 7.4 | 1.0590 | 1.07205 |

Mann-Whitney sobre la generación para F*: z = -2.60, p = 0.0094.

**Interpretación.** Alinear acelera la convergencia: se llega a la cota antes (46.1 contra 61.4 generaciones en promedio) y la diferencia es estadísticamente significativa. Sin alinear, un hijo puede heredar dos satélites que cubren la misma región y ninguno para otra. Esa estructura se pierde y la mutación tiene que repararla. Ambas variantes llegan finalmente a soluciones de calidad parecida, porque la mutación y la selección bastan en un problema de este tamaño. El cruce alineado acelera la búsqueda, pero no es la razón por la que se llega a la solución.

**Resultado de la prueba: ✅ PASA** — prueba descriptiva; con alineación 28/30 alcanzan F* (gen. media 46.1), sin alineación 20/30 (gen. media 61.4).

---

## P10 — Prueba propia: sensibilidad a los parámetros

**Pregunta.** ¿Los valores iniciales de docs/01 (σ = 6°, N = 80) son razonables o el resultado depende mucho de ellos?

**Condiciones.** Escenario inicial, 8 semillas (1–8) por configuración. (a) Se varía el paso de mutación σ con el resto de parámetros base. (b) Se varía la población N **manteniendo el presupuesto** (≈ 11780 evaluaciones: las generaciones se ajustan como (presupuesto − N)/(N − 2)).

**Resultados (a) — paso de mutación σ.**

| Configuración | Alcanzan F* | F final (media ± desv.) | F mínimo | Evaluaciones hasta F* (media) | Diversidad final (°) |
| --- | --- | --- | --- | --- | --- |
| σ = 1° | 3/8 | 1.06538 ± 0.01088 | 1.04615 | 5774 | 3.97 |
| σ = 3° | 5/8 | 1.07115 ± 0.00796 | 1.06154 | 4604 | 6.84 |
| σ = 6° | 7/8 | 1.07500 ± 0.00544 | 1.06154 | 3345 | 8.66 |
| σ = 12° | 7/8 | 1.07500 ± 0.00544 | 1.06154 | 3779 | 11.61 |
| σ = 24° | 7/8 | 1.07500 ± 0.00544 | 1.06154 | 5027 | 16.17 |

**Resultados (b) — tamaño de población con presupuesto fijo.**

| Configuración | Alcanzan F* | F final (media ± desv.) | F mínimo | Evaluaciones hasta F* (media) | Diversidad final (°) |
| --- | --- | --- | --- | --- | --- |
| N = 20 | 6/8 | 1.07308 ± 0.00712 | 1.06154 | 4130 | 5.73 |
| N = 40 | 5/8 | 1.07115 ± 0.00796 | 1.06154 | 2670 | 7.48 |
| N = 80 | 7/8 | 1.07500 ± 0.00544 | 1.06154 | 3345 | 8.66 |
| N = 160 | 7/8 | 1.07500 ± 0.00544 | 1.06154 | 4155 | 10.11 |

**Interpretación.** Con estos datos, la configuración más eficiente es σ = 6° para la mutación y N = 80 para la población (criterio: más ejecuciones que alcanzan F*; si empatan, menos evaluaciones). El σ más pequeño (1°) es el peor: 3/8 alcanzan F* y la diversidad final es la más baja (3.97°). Con pasos tan cortos, mover un satélite hacia una región lejana requiere muchas mutaciones seguidas. Los σ grandes (12° y 24°) alcanzan la cota igual de seguido, pero necesitan más evaluaciones (3779 y 5027 contra 3345 con 6°). Un paso largo saca a menudo al satélite de su región y el ajuste fino se vuelve más lento. Con la población, las diferencias son menores, y con solo 8 semillas una diferencia de una ejecución no es concluyente. Los valores elegidos en docs/01 coinciden con los mejores encontrados.

**Resultado de la prueba: ✅ PASA** — prueba descriptiva; mejor σ: σ = 6°, mejor N: N = 80.

---

## P11 — Cambio de condiciones (sección 3.3)

**Pregunta.** Cuando la organización cambia las condiciones, ¿la configuración anterior sigue siendo válida? ¿Qué cuesta adaptarla?

**Condiciones.** Se toma la configuración final de referencia (P1) y se **reevalúa** sin cambios en seis escenarios modificados. Después se **reevoluciona** cada escenario de dos formas, con 5 semillas (101–105) cada una: **en caliente** (la configuración anterior entra a la población inicial) y **en frío** (población aleatoria).

**Resultados.**

| Cambio | Configuración anterior reevaluada | F antes → F reevaluada | Regiones cubiertas | Violaciones de la anterior | Reevolución caliente: F media; gen. satisfactoria | Reevolución fría: F media; gen. satisfactoria |
| --- | --- | --- | --- | --- | --- | --- |
| Se apaga la zona Atlántico Norte | **VÁLIDA** | 1.0769 → 1.0769 | 6/6 | — | 1.0769; 0.0 | 1.0708; 4.6 |
| Australia pasa a prioridad Alta | **VÁLIDA** | 1.0769 → 1.0667 | 6/6 | — | 1.0733; 0.0 | 1.0733; 5.4 |
| Japón deja de ser región de interés | **VÁLIDA** | 1.0769 → 1.0909 | 5/5 | — | 1.0982; 0.0 | 1.0945; 5.2 |
| Objeto A se mueve sobre el Sahel (15°, 0°) | **VÁLIDA** | 1.0769 → 1.0769 | 6/6 | — | 1.0769; 0.0 | 1.0708; 6.6 |
| Objeto A sobre el Sahel con exclusión ampliada a 15° | **INVÁLIDA** | 1.0769 → 1.0769 | 6/6 | S6 ocupada (objeto-a, 1.99°) | 1.0738; 6.2 | 1.0646; 6.8 |
| Nueva zona de desechos de 10° sobre Japón | **VÁLIDA** | 1.0769 → 1.0769 | 6/6 | — | 1.0769; 0.0 | 1.0738; 7.0 |
| Nueva zona de 15° entre Yucatán y California | **INVÁLIDA** | 1.0769 → 1.0769 | 6/6 | S1 desechos (nueva-golfo, 10.83°); S8 desechos (nueva-golfo, 13.75°) | 1.0462; 6.6 | 1.0462; 7.2 |

**Interpretación.** Los cambios se comportan como se espera del modelo. **Quitar** restricciones (apagar una zona) nunca invalida una configuración: solo amplía el espacio permitido. **Cambiar prioridades o regiones** tampoco la invalida, porque la validez depende solo de las restricciones. Lo que cambia es la aptitud: con Australia en Alta, la redundancia que antes era óptima deja de serlo y F baja. **Agregar o mover** zonas puede invalidarla, pero no siempre. Si la zona nueva cae donde no hay satélites (el Objeto A con 5° sobre el Sahel, o la zona de 10° sobre Japón), la configuración anterior sigue siendo válida. Cuando la zona sí alcanza a un satélite, el sistema dice exactamente qué satélite viola qué zona y por cuántos grados. 2 de 7 cambios invalidan la configuración anterior. Cuando la configuración anterior sigue siendo válida y satisfactoria, la reevolución en caliente parte de ella (generación satisfactoria 0) y nunca termina peor. En frío hay que volver a encontrarla. Cuando la anterior queda inválida, la ventaja del arranque en caliente se reduce: la solución vieja pierde todos los torneos contra cualquier válida, y solo sirve como material genético. Ambas estrategias producen soluciones válidas.

**Resultado de la prueba: ✅ PASA** — 2/7 cambios invalidan la configuración anterior; todas las reevoluciones terminan VÁLIDAS.

