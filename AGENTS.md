# Instrucciones permanentes de AstroShield

Este archivo protege los requisitos del enunciado. La fuente de verdad es
[`docs/enunciado.md`](docs/enunciado.md). No cambies los datos iniciales ni
elimines capacidades exigidas para simplificar una tarea. Si el usuario pide
expresamente cambiar alguno de estos requisitos, explica el efecto sobre el
enunciado y actualiza código, pruebas, resultados y documentación de forma
coherente.

## Datos iniciales que deben permanecer reconocibles

- El escenario de referencia usa **8 satélites en una sola configuración**.
- Mantén las seis regiones iniciales, sus centros aproximados, prioridades y
  radio de observación de **300 km**:

  | Región | Latitud, longitud | Prioridad |
  | --- | --- | --- |
  | Península de Yucatán | 20.5°, -89.0° | Alta |
  | Amazonía brasileña | -3.5°, -62.0° | Alta |
  | California | 36.8°, -119.4° | Media |
  | Sahel | 15.0°, 0.0° | Media |
  | Japón | 36.0°, 138.0° | Media |
  | Interior de Australia | -25.0°, 133.0° | Normal |

- Mantén las tres zonas iniciales de desechos, con radios angulares: Atlántico
  Norte (45°, -35°; 12°), Pacífico Sur (-30°, -120°; 10°) y región polar norte
  (78°, 30°; 8°).
- Mantén los dos objetos ocupados y sus zonas de exclusión: Objeto A (10°, 45°;
  5°) y Objeto B (-15°, 110°; 5°).
- Los cambios de condiciones que haga el usuario deben producir escenarios
  derivados; no deben reescribir silenciosamente el escenario inicial. Este
  debe seguir disponible para comparar y reproducir resultados.

## Comportamiento que no debe perderse

- El sistema debe **generar, evaluar y mejorar** configuraciones mediante un
  algoritmo evolutivo ejecutable durante una cantidad configurable de
  generaciones. No sustituyas su resultado por posiciones fijas o una escena
  preparada de antemano.
- Las prioridades deben influir en el criterio de calidad, y el criterio de
  cobertura debe estar definido y documentado. Una puntuación alta no vuelve
  válida una configuración que incumple restricciones obligatorias.
- Las zonas de desechos y las posiciones ocupadas deben afectar realmente a
  la evaluación y a la selección de soluciones; dibujarlas no basta.
- Al cambiar prioridades, zonas u otras condiciones, reevalúa la configuración
  anterior con las condiciones nuevas e indica si sigue siendo válida.
- Conserva el historial de evolución y las métricas necesarias para comparar
  la configuración inicial con la final y analizar distintas ejecuciones.
- Conserva un globo terrestre **3D explorable** que represente los datos reales
  de la ejecución: regiones, ocho satélites, restricciones, objetos ocupados y
  cobertura. La vista no debe mostrar una constelación distinta de la calculada.
  El diseño visual debe seguir siendo personalizado y comprensible.

## Evidencia e interpretación que no deben falsearse

- Mantén pruebas y resultados documentados del escenario inicial, evolución,
  zonas de desechos, objetos ocupados, espacio reducido, condición difícil,
  variación entre ejecuciones y al menos una prueba adicional propia. Registra
  condiciones, resultados e interpretación, incluidos los fallos.
- No presentes una búsqueda sin solución como prueba matemática de
  inviabilidad. Distingue entre **«no se encontró una solución válida»** e
  **«inviabilidad demostrada»**. Tampoco afirmes optimalidad global solo porque
  la aptitud dejó de mejorar.
- No ajustes a mano resultados, capturas o cifras para que parezcan mejores.
  Deben corresponder al programa y a las condiciones documentadas.
- Conserva el código fuente, instrucciones de ejecución, documentación,
  recursos de visualización y un historial de commits coherente. Si se usó IA,
  conserva la explicación de su uso y de las verificaciones hechas por el equipo.

## Decisiones que sí pueden evolucionar

El enunciado **no fija** la fórmula de aptitud, los pesos numéricos, la huella
angular del satélite, la separación mínima entre satélites, los operadores del
algoritmo ni la tecnología gráfica. Se pueden mejorar con justificación,
pruebas y documentación, siempre que se respeten los datos iniciales, las
restricciones y la correspondencia entre cálculo, resultados y visualización.
