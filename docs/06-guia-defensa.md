# Guía de defensa: preguntas probables y respuestas

Respuestas cortas, con el dato o el archivo que las respalda. Al final hay una propuesta de reparto para que cada integrante pueda demostrar una parte del sistema.

## A. Modelo y decisiones

**1. ¿Por qué representan una configuración solo con latitud y longitud?**
Porque es todo lo que el modelo usa: la altitud es la misma para los 8 satélites (supuesto S2), así que no aporta grados de libertad. Con 8 × 2 = 16 números la representación es mínima, legible y siempre tiene exactamente 8 satélites. Ver `src/core/tipos.ts`.

**2. ¿Por qué la huella mide 20°?**
Para un satélite a altura h con ángulo mínimo de elevación ε, el semiángulo central es λ = arccos(R·cos ε/(R+h)) − ε. Con h ≈ 900 km y ε = 10° da ≈ 20.3°: una órbita baja realista. Además, con 20° solo Yucatán y California (a 31.1°) pueden compartir satélite, lo que produce un problema con decisiones reales y una cota calculable.

**3. ¿Cuándo está "cubierta" una región?**
Cuando los 37 puntos de muestreo de su disco de 300 km están dentro de la huella de al menos un satélite. Cobertura parcial no cuenta como cubierta. `evaluar()` en `src/core/evaluacion.ts`.

**4. ¿Cómo entran las prioridades?**
Como pesos 3/2/1 en la cobertura ponderada C y en la redundancia R. Una región Alta pesa el triple que una Normal.

**5. ¿Para qué sirve el término de redundancia?**
Hay 8 satélites y 6 regiones. Sin R, todas las configuraciones que cubren todo empatarían. R premia tener 2 satélites sobre las regiones importantes, que es lo más útil que se puede hacer con los satélites sobrantes: tolera la falla de uno.

**6. ¿No podría el algoritmo sacrificar cobertura por redundancia?**
No. Quitar un satélite de la región i cuesta wᵢ/W en C y gana como máximo 0.1·wⱼ/W en R. Como 0.1 × 3 < 1, siempre pierde (docs/01 §3.2).

**7. ¿Para qué sirve la guía G? ¿No es hacer trampa?**
Al inicio casi ningún satélite aleatorio toca una región: la huella cubre el 3 % de la esfera. Sin G, casi todas las configuraciones tendrían el mismo valor y la búsqueda sería ciega. G vale 0 cuando todo está cubierto y, con γ = 0.5 < 1, nunca hace que una región parcial valga más que una cubierta. Lo verifica una prueba de `tests/evaluacion.test.ts`.

**8. ¿Cómo interpretaron las zonas de desechos?**
Como casquetes esféricos: centro + radio angular. Un satélite está dentro si su punto subsatelital cae en el casquete, lo que equivale a un cono desde el centro de la Tierra, así que no depende de la altitud. El borde está permitido.

**9. ¿Por qué agregaron una separación mínima de 3°?**
Sin ella, dos satélites podrían ocupar el mismo punto: colisión y satélite desperdiciado. 3° es pequeño frente a la huella y no impide la redundancia. Es un supuesto declarado (S8).

## B. Restricciones

**10. ¿Qué pasa con una configuración inválida?**
No se descarta, pero pierde **toda** comparación contra una válida (reglas de Deb, `comparar()` en `src/core/comparacion.ts`). Entre inválidas gana la que viola menos. Así siguen aportando material genético sin poder ganar nunca.

**11. ¿Por qué no usar una penalización (F − λ·V)?**
Porque el resultado dependería de λ: con λ pequeña, una solución que invade una zona pero cubre más podría ganar. Deb no tiene parámetros y garantiza que una inválida nunca gane a una válida.

**12. ¿Cómo demuestran que las restricciones tienen efecto real y no son solo un dibujo?**
Con experimentos de control (misma zona, activa o desactivada):
- Zona trampa de 10° sobre Japón: 3/10 invasiones sin la restricción, 0/10 con ella (P3).
- Objetos de 12° sobre Sahel y Australia: 6/10 sin ellos, 0/10 con ellos (P4).

Además, 0 de 31 configuraciones finales del escenario original invaden alguna zona.

**13. ¿Qué pasa si el escenario es inviable?**
El análisis de factibilidad lo advierte ("posiblemente inviable") y el algoritmo no encuentra ninguna válida. El sistema reporta **INVIABLE** y muestra la de menor violación: baja de 457.68° a 11.01° (P6). Nunca muestra nada como válido.

**14. ¿Pueden demostrar que un escenario es inviable?**
El algoritmo evolutivo no puede: solo puede no encontrar solución. Por eso el sistema dice "posiblemente inviable". La demostración la da el argumento geométrico (8 puntos a ≥ 3° no caben en un casquete de 2°). El análisis de factibilidad sí puede demostrar *factibilidad*: si encuentra un testigo, existe una solución.

## C. Algoritmo evolutivo

**15. Expliquen la selección por torneo.**
Se eligen 3 configuraciones al azar y gana la mejor según Deb. Las buenas ganan más torneos y por eso tienen más hijos, pero las malas también pueden ser elegidas a veces, lo que mantiene la diversidad.

**16. ¿Qué es el cruce alineado y por qué lo usan?**
El orden de los satélites no significa nada. Antes de cruzar, cada satélite de A se empareja con el más cercano de B, y el hijo hereda uno de cada pareja. Así se combinan satélites que "hacen el mismo trabajo". P9: con alineación, 28/30 ejecuciones llegan a F*; sin ella, 20/30 (p = 0.0094).

**17. ¿Cómo funciona la mutación?**
Cada satélite: con probabilidad 0.02 salta a un punto aleatorio; si no, con 0.25 se mueve |N(0, 6°)| en una dirección aleatoria sobre la esfera. Los pasos cortos ajustan y los saltos exploran.

**18. ¿Para qué sirve el elitismo?**
Las 2 mejores pasan intactas, así que la mejor solución nunca se pierde y la curva del mejor no baja. Está verificado en las 30 ejecuciones (P2).

**19. ¿Cómo eligieron los parámetros?**
Valores iniciales razonados (docs/01 §6) y después **validados con datos** (P10). σ = 6° y N = 80 resultaron los más eficientes de los probados. σ = 1° solo alcanza la cota en 3/8 ejecuciones.

**20. ¿El algoritmo sirve, o cualquier búsqueda lo lograría?**
Con el mismo presupuesto (11 780 evaluaciones), la búsqueda aleatoria cubre todo en 0/30 ejecuciones (F = 0.9385) y el AG en 30/30 (F = 1.0759), con p < 10⁻⁶ (P8).

## D. Resultados

**21. ¿Cómo saben que la solución es buena y no solo "la que salió"?**
Por la cota teórica F* = 1.07692, deducida a mano (docs/01 §7). La referencia la alcanza exactamente, igual que 28 de 30 semillas, y **ninguna** la supera. Eso además valida el argumento de la cota.

**22. ¿Por qué 2 ejecuciones no llegan a F*?**
Quedan en un óptimo local: usan 3 satélites para duplicar Yucatán y California en vez de 2 compartidos, y ningún satélite sobra. Para mejorar habría que mover dos satélites a la vez de forma coordinada (diagnóstico automático en P7). Por eso "dejar de mejorar" no prueba optimalidad.

**23. ¿Por qué cada ejecución da una configuración distinta?**
Porque hay muchas configuraciones igual de buenas (meseta de óptimos): las finales están en promedio a 10.4° una de otra, y el segundo satélite Media va a Sahel en 16 casos y a Japón en 12. La calidad casi no varía (desviación 0.0039).

**24. ¿Qué limitaciones tiene su criterio?**
Cobertura binaria (el borde vale igual que el centro), configuración estática (no hay órbitas), pesos elegidos por el equipo, redundancia limitada a 2 y una meseta donde el criterio no distingue entre soluciones. Detalle en docs/04 §6.

**25. ¿Qué pasa al cambiar las condiciones?**
La configuración anterior se reevalúa. Quitar restricciones o cambiar prioridades nunca la invalida (puede bajar su F). Agregar o mover zonas puede invalidarla: en P11, 2 de 7 cambios la invalidaron, y el sistema dice exactamente qué satélite viola qué. Reevolucionar en caliente parte de lo que sigue sirviendo.

## E. Implementación y visualización

**26. ¿Cómo garantizan que la visualización muestra el resultado real?**
La UI carga `results/run-referencia.json`, recalcula la aptitud en el navegador y muestra "✓ Verificado". La prueba `tests/referencia.test.ts` vuelve a ejecutar la semilla 42 y compara con ese archivo. Lo que se ejecuta en vivo corre en un Worker con el mismo código del núcleo.

**27. ¿Cómo garantizan que la UI no muestra una inválida como válida?**
El chip sale de `estadoParaMostrar()`, que usa la evaluación del núcleo en las condiciones actuales. `tests/estadoVista.test.ts` lo prueba con 400 configuraciones aleatorias en todos los contextos.

**28. ¿Por qué un Web Worker?**
Una evolución hace unas 12 000 evaluaciones. En el hilo principal congelaría la animación y la interfaz. En el Worker la UI sigue fluida y muestra el progreso generación por generación.

**29. ¿Cómo reproducen los resultados?**
`npm run experimentos` regenera todos los JSON de `results/` y `docs/03-pruebas.md`. Todas las semillas son fijas y solo cambian los tiempos.

**30. ¿Usaron IA?**
Sí. Ver [AI_USAGE.md](../AI_USAGE.md): para qué se usó, qué se verificó y qué errores se detectaron y corrigieron gracias a esas verificaciones.

## Propuesta de reparto para la demostración

| Integrante | Parte a explicar y demostrar | Archivos clave |
|---|---|---|
| 1 | Modelo: representación, cobertura, aptitud, cota F* | docs/01, `evaluacion.ts` |
| 2 | Restricciones y Deb; demo del preset «Inviable» y de mover una zona (chip INVÁLIDA) | `comparacion.ts`, `factibilidad.ts` |
| 3 | Operadores evolutivos; demo de la línea de tiempo y de la vista Comparar | `ag.ts`, docs/02 |
| 4 | Pruebas y análisis: P7, P8 y P9; correr `npm test` y `npm run experimentos` | `experiments/run-all.ts`, docs/03, docs/04 |
| 5 | Visualización: cómo los datos llegan al globo; cambiar un color en `tema.ts` | `src/app/*` |
