# AstroShield — Evolucionar una constelación inteligente

> Enunciado oficial del proyecto (transcrito tal como fue entregado).

## Contexto del problema

Una organización necesita diseñar una constelación de satélites para observar distintas regiones de la Tierra. Cuenta con un número limitado de satélites y no puede colocarlos en cualquier posición: existen zonas restringidas por acumulación de desechos espaciales y posiciones que ya están ocupadas por otros objetos.

El reto consiste en desarrollar un sistema que utilice un algoritmo evolutivo para generar, evaluar y mejorar distintas configuraciones de la constelación. No basta con generar una distribución que parezca adecuada: deberán demostrar, mediante pruebas y resultados, qué tan buena es la solución obtenida y qué limitaciones presenta.

El sistema deberá permitir observar la distribución resultante sobre un globo terrestre en 3D.

## 1. Datos iniciales del problema

Todos los equipos trabajarán con el mismo escenario y deberán utilizar los siguientes datos como punto de partida.

### 1.1. Constelación

- La organización dispone de 8 satélites para diseñar la constelación.
- Todos los satélites deben formar parte de una misma configuración.
- El espacio disponible es limitado y existen posiciones que no pueden utilizarse.
- El modelo 3D será una simulación educativa. No es necesario reproducir con exactitud la mecánica orbital real.

### 1.2. Regiones que se deben observar

| Región | Centro aproximado (lat, lon) | Prioridad inicial |
|---|---|---|
| Península de Yucatán, México | 20.5°, -89.0° | Alta |
| Amazonía brasileña | -3.5°, -62.0° | Alta |
| California, Estados Unidos | 36.8°, -119.4° | Media |
| Región del Sahel, África | 15.0°, 0.0° | Media |
| Japón | 36.0°, 138.0° | Media |
| Interior de Australia | -25.0°, 133.0° | Normal |

Nota: Las coordenadas son aproximadas y sirven como referencia para construir la simulación. La prioridad indicada establece la importancia relativa inicial de cada región, pero cada equipo deberá definir cómo traducir esas prioridades en un criterio de evaluación.

Para facilitar la comparación entre equipos, se utilizará inicialmente un radio de observación de 300 km alrededor del centro de cada región. El sistema deberá determinar, según el modelo que propongan, cuándo una región se considera cubierta.

No se espera que todos los equipos obtengan exactamente la misma configuración. Se evaluará la calidad del planteamiento, su funcionamiento y las evidencias que respalden los resultados.

## 2. Primera etapa: encontrar una buena configuración

El primer objetivo es desarrollar un algoritmo evolutivo que permita explorar diferentes distribuciones de los 8 satélites y mejorar las configuraciones que genera.

Antes de comenzar a programar, cada equipo deberá definir y justificar las decisiones necesarias para convertir el escenario en un problema computacional.

No se les proporciona una implementación específica ni una fórmula de evaluación. Parte del reto consiste en determinar qué necesita el sistema para distinguir una configuración conveniente de otra que no lo sea.

Durante esta etapa deberán considerar, entre otros aspectos, cómo representar una configuración, cómo evaluar su calidad, cómo generar alternativas y cómo conservar o descartar soluciones durante la evolución.

El algoritmo deberá producir resultados que puedan analizarse y compararse. Una configuración visualmente atractiva no será suficiente para demostrar que el algoritmo está resolviendo el problema.

## 3. Segunda etapa: incorporar restricciones espaciales

Una vez que el sistema produzca configuraciones iniciales, la organización informa que el espacio disponible tiene restricciones adicionales.

### 3.1. Zonas restringidas por desechos espaciales

Se identificaron tres regiones donde no se permite colocar satélites dentro del modelo simplificado:

| Zona | Centro aproximado | Radio de restricción |
|---|---|---|
| Atlántico Norte | 45°, -35° | 12° |
| Pacífico Sur | -30°, -120° | 10° |
| Región polar norte | 78°, 30° | 8° |

Los radios están expresados en grados angulares sobre el modelo esférico. El equipo deberá establecer cómo interpretar estas zonas dentro de su representación espacial.

### 3.2. Posiciones ocupadas

También existen dos posiciones ocupadas por objetos que no forman parte de la constelación que están diseñando:

| Objeto existente | Posición aproximada | Radio de exclusión |
|---|---|---|
| Objeto A | 10°, 45° | 5° |
| Objeto B | -15°, 110° | 5° |

Los satélites nuevos no deben invadir las zonas de exclusión correspondientes.

Estas restricciones deben tener un efecto real sobre las configuraciones que produce el algoritmo. No es suficiente dibujarlas en el globo si el sistema sigue aceptando soluciones que las incumplen.

Los equipos deberán decidir cómo incorporar las restricciones a su proceso de búsqueda y qué debe ocurrir cuando una configuración no cumpla las condiciones establecidas.

### 3.3. Cambio en las condiciones

La organización también puede modificar las condiciones del problema. Por ejemplo, una zona puede dejar de estar disponible o cambiar la prioridad de una región de observación.

El sistema deberá permitir evaluar qué ocurre cuando cambian las condiciones y explicar si las configuraciones anteriores siguen siendo válidas.

## 4. Entregables y evidencias requeridas

Los entregables deben mostrar tanto el resultado como el razonamiento técnico detrás de él. No se calificará únicamente que el programa se ejecute.

### Entregable 1. Definición del problema

Antes de implementar el algoritmo, cada equipo deberá preparar un documento breve que deje claras las decisiones que tomó para convertir el escenario en un problema resoluble.

El documento deberá explicar:

- Cómo se representa una configuración de los 8 satélites y qué información contiene.
- Qué significa que una región esté cubierta y cómo se determina.
- Cómo se evaluará la calidad de una configuración y cómo se considerarán las prioridades de las regiones.
- Qué condiciones hacen que una configuración sea inválida.
- Qué estrategia general utilizará el algoritmo evolutivo para explorar y mejorar configuraciones.
- Qué parámetros necesitará el sistema y cómo se determinarán sus valores iniciales.
- Qué condiciones utilizará el equipo para considerar que una solución es suficientemente buena para el escenario.

No se requiere una extensión determinada. Se evaluará que las decisiones sean comprensibles, coherentes entre sí y adecuadas para el problema.

### Entregable 2. Implementación funcional

Se deberá entregar el código fuente de un sistema que permita ejecutar el proceso de búsqueda y obtener una configuración final.

El sistema debe ser capaz de:

- Generar configuraciones de satélites.
- Evaluar las configuraciones producidas.
- Ejecutar el proceso evolutivo durante una cantidad configurable de iteraciones o generaciones.
- Conservar información que permita analizar cómo cambia la calidad de las soluciones.
- Considerar las restricciones espaciales y las posiciones ocupadas.
- Mostrar la configuración obtenida y sus resultados.

La estructura interna del programa y las decisiones de implementación quedan a criterio del equipo, siempre que puedan explicar cómo funcionan.

### Entregable 3. Pruebas y validación

Se entregará evidencia de que el sistema fue probado en diferentes condiciones, no solamente en una ejecución favorable.

Como mínimo, deberán documentarse pruebas que permitan analizar:

- **Escenario inicial:** qué configuración se obtiene y qué regiones quedan cubiertas.
- **Evolución:** cómo cambia la calidad de las configuraciones a lo largo de las generaciones.
- **Zonas restringidas:** si el sistema respeta las tres zonas de desechos espaciales.
- **Posiciones ocupadas:** si evita las dos posiciones existentes y sus zonas de exclusión.
- **Espacio reducido:** qué ocurre cuando se agregan restricciones o se reduce el espacio disponible.
- **Condición difícil o inviable:** qué ocurre cuando las restricciones impiden satisfacer todas las condiciones deseadas.
- **Variación de la ejecución:** qué diferencias aparecen al ejecutar nuevamente el algoritmo bajo condiciones comparables.

Para cada prueba deberán registrar las condiciones utilizadas, los resultados obtenidos y una interpretación. Si alguna prueba falla, deberán explicar el fallo y su efecto sobre la validez de la solución.

Además, cada equipo diseñará al menos una prueba adicional propia, relacionada con el comportamiento o las limitaciones del sistema.

### Entregable 4. Análisis de resultados

Se deberá presentar un análisis que permita responder, con evidencia de las ejecuciones, preguntas como las siguientes:

- ¿Qué tan bien se observan las regiones solicitadas en la configuración final?
- ¿Cómo cambió la calidad de la solución durante el proceso evolutivo?
- ¿Qué diferencias se encontraron entre distintas ejecuciones?
- ¿Qué efecto tuvieron las restricciones espaciales sobre la solución?
- ¿Qué sucede cuando el sistema no puede satisfacer todas las condiciones?
- ¿Qué limitaciones tiene el criterio utilizado para evaluar las configuraciones?
- ¿Qué evidencia permite afirmar que una solución es mejor que otra?

El equipo deberá utilizar resultados reales de su programa. No bastará con responder únicamente a partir de lo que se observa en la visualización.

### Entregable 5. Visualización de la constelación en 3D

El proyecto deberá incluir una visualización de un globo terrestre en tres dimensiones que permita explorar la configuración obtenida.

La visualización deberá distinguir claramente:

- La Tierra y las regiones que se deben observar.
- Los 8 satélites de la constelación propuesta.
- Las zonas restringidas por desechos espaciales.
- Las posiciones ocupadas por los objetos existentes.
- Las regiones cubiertas y aquellas que no se alcanzan a cubrir, de acuerdo con el modelo del equipo.

También deberá permitir examinar la distribución desde distintos ángulos, por ejemplo, girando el globo.

La visualización debe corresponder a los datos reales de la ejecución. No se aceptará una representación fija que muestre una constelación diferente de la que obtuvo el algoritmo.

Cuando sea posible, deberán permitir comparar una configuración inicial con la configuración final, para que pueda apreciarse qué cambió durante el proceso.

No se exige una herramienta gráfica específica ni una simulación orbital físicamente exacta. Sí se exige que la representación sea comprensible y consistente con el modelo utilizado.

### Entregable 6. Repositorio y presentación del proyecto

El repositorio deberá contener el código fuente, los archivos necesarios para ejecutar el proyecto, las pruebas realizadas, la documentación y los recursos de visualización que correspondan.

El equipo deberá mantener un historial de commits que permita reconocer el avance del trabajo. Los cambios deben ser coherentes con las tareas realizadas y no concentrarse artificialmente en una única entrega final.

Durante la revisión, cada integrante deberá poder explicar las decisiones principales del proyecto y demostrar el funcionamiento de una parte del sistema.

Si se utilizaron herramientas de inteligencia artificial, se deberá indicar para qué se utilizaron y qué verificaciones realizó el equipo sobre los resultados obtenidos.

## 5. Consideraciones importantes

- No existe una única configuración correcta que todos los equipos deban obtener.
- Una solución con una puntuación alta no necesariamente es válida si incumple restricciones obligatorias.
- Que el algoritmo deje de mejorar no demuestra por sí solo que haya encontrado la mejor solución posible.
- Las diferencias entre ejecuciones deben analizarse, no ocultarse.
- El modelo puede ser simplificado, pero sus supuestos deben estar identificados y sus resultados deben ser coherentes con ellos.
- Las decisiones técnicas que no estén determinadas por los datos iniciales deberán ser definidas y justificadas por cada equipo.

La pregunta central del proyecto no es solamente si el algoritmo logra colocar satélites, sino qué significa que una constelación sea buena, cómo se demuestra que cumple las condiciones y qué evidencia permite defender la solución obtenida.

## 6. Rúbrica de evaluación

| Criterio | Descripción | Peso |
|---|---|---|
| Solución funcional | Implementación del algoritmo evolutivo, generación y evaluación de configuraciones, mejora de soluciones, cumplimiento de restricciones y funcionamiento de la visualización 3D. | 40% |
| Pruebas y validación | Pruebas del escenario inicial, evolución, zonas restringidas, posiciones ocupadas, condiciones difíciles, variación entre ejecuciones y prueba adicional diseñada por el equipo. | 25% |
| Comprensión y organización del código | Justificación del modelo y del criterio de evaluación, comprensión del proceso evolutivo, decisiones sobre restricciones, claridad del código y coherencia entre algoritmo, datos y visualización. | 20% |
| Organización del trabajo y Git | Commits coherentes, historial que muestre el avance, estructura del repositorio y organización de los entregables. | 15% |

### Desglose de la rúbrica

**1. Solución funcional — 40 puntos**

- 16 puntos: el algoritmo evolutivo genera, evalúa y mejora configuraciones de forma funcional.
- 10 puntos: las configuraciones resultantes consideran la cobertura solicitada y las condiciones del problema.
- 8 puntos: las restricciones y posiciones ocupadas se aplican correctamente, incluyendo condiciones difíciles.
- 6 puntos: la visualización 3D representa fielmente los resultados y permite comprender la configuración.

**2. Pruebas y validación — 25 puntos**

- 7 puntos: pruebas del escenario inicial y evidencia de la evolución de las soluciones.
- 7 puntos: validación de zonas restringidas, posiciones ocupadas y condiciones límite.
- 6 puntos: comparación de ejecuciones mediante resultados o métricas obtenidos del programa.
- 5 puntos: prueba adicional propia, con resultados e interpretación, y correspondencia entre los datos y la visualización.

**3. Comprensión y Personalización — 20 puntos**

- 6 puntos: Diseño personalizado, entendible, colores personalizados.
- 6 puntos: comprensión de las operaciones del algoritmo evolutivo y su efecto sobre las soluciones.
- 4 puntos: justificación del tratamiento de restricciones y de las principales decisiones técnicas.
- 4 puntos: Visualización final en globo terráqueo 3D.

**4. Organización del trabajo y Git — 15 puntos**

- 5 puntos: commits coherentes con los cambios realizados.
- 5 puntos: historial que permita identificar el avance y las aportaciones al proyecto.
- 5 puntos: repositorio ordenado, instrucciones de ejecución y entregables completos.

La evaluación considerará la evidencia presentada y la capacidad del equipo para explicar sus decisiones, no solamente el valor final que arroje el algoritmo.
