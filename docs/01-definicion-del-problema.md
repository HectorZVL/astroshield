# Entregable 1 — Definición del problema

Este documento convierte el escenario de AstroShield en un problema computacional. Se escribió **antes** de implementar el algoritmo; cada decisión indica *qué* se decidió, *por qué* y *qué supuesto* introduce. Los supuestos están numerados (S1, S2, …) y se vuelven a discutir en el análisis de resultados.

## 0. Modelo geométrico (base común de todas las decisiones)

- La Tierra es una **esfera perfecta** de radio 6 371 km (S1).
- Toda posición se expresa como (latitud, longitud) en grados. Las distancias se miden como **ángulo central** (distancia de gran círculo) con la fórmula de *haversine*, que es numéricamente estable para distancias cortas.
- 300 km sobre la superficie equivalen a 300 / 6 371 rad = **2.698°** de ángulo central.
- Un satélite se modela por su **punto subsatelital** (la proyección radial del satélite sobre la superficie). La altitud es la misma para los 8 satélites y no forma parte de la búsqueda (S2). No se modela movimiento orbital: la configuración es una "foto" de posiciones, como permite el enunciado (S3).

## 1. Representación de una configuración

Una configuración es una **lista ordenada de 8 satélites**, cada uno con `(lat, lon)` en grados:

```
configuración = [ (lat₁, lon₁), (lat₂, lon₂), …, (lat₈, lon₈) ]
lat ∈ [-90°, 90°],  lon ∈ (-180°, 180°]
```

**Por qué así:**
- Es la representación mínima que contiene toda la información que el modelo usa (S2: la altitud es fija y no aporta grados de libertad).
- "Todos los satélites deben formar parte de una misma configuración": la longitud fija de 8 lo garantiza por construcción; no existe un individuo con 7 o 9 satélites.
- Es legible: cualquier integrante puede leer un individuo y ubicarlo en un mapa.

**Detalle de implementación que importa:** las operaciones que *mueven* satélites (mutación, interpolación visual) se hacen con vectores 3D unitarios y luego se convierten a lat/lon. Así se evita la distorsión cerca de los polos que tendría sumar grados de longitud directamente (cerca del polo, 10° de longitud son casi nada de distancia real).

El orden de los satélites **no tiene significado físico** (la configuración {A,B} es la misma que {B,A}). Esto se tiene en cuenta en el cruce (sección 5).

## 2. ¿Cuándo una región está cubierta?

### 2.1 Huella de cobertura de un satélite

Cada satélite observa un **casquete esférico** (huella) centrado en su punto subsatelital, con semiángulo central **θ = 20°** (parámetro configurable).

**Justificación del valor 20°:** para un satélite a altura *h* con ángulo mínimo de elevación *ε* sobre el horizonte, el semiángulo central de la huella es
λ = arccos( R·cos ε / (R + h) ) − ε.
Con R = 6 371 km, h ≈ 900 km y ε = 10° se obtiene λ ≈ 20.3°. Por lo tanto 20° corresponde a una órbita baja (LEO) plausible con un ángulo de elevación razonable (S4). El valor también es conveniente para el análisis: la pareja de regiones más próxima (Yucatán–California, 31.1°) puede compartir un satélite, pero ninguna otra pareja puede, lo que hace que el problema tenga decisiones reales sin ser trivial (ver sección 7).

### 2.2 Región de observación

Cada región es un **disco** de 300 km (ρ = 2.698°) alrededor de su centro. Para medir qué parte del disco se observa, el disco se representa con **37 puntos de muestreo**: el centro y tres anillos a ρ/3, 2ρ/3 y ρ con 6, 12 y 18 puntos.

### 2.3 Definiciones

- **Fracción cubierta** `fᵢ`: proporción de los 37 puntos de la región *i* que están dentro de la huella de **al menos un** satélite (unión de huellas). Vale entre 0 y 1.
- **Región cubierta**: `fᵢ = 1`, es decir, **todo** el disco de 300 km se observa. No se acepta cobertura parcial como "cubierta" porque el enunciado pide observar la región, no tocarla.
- **Región parcialmente cubierta**: `0 < fᵢ < 1`. **No cubierta**: `fᵢ = 0`.
- **Satélite que cubre completamente la región** (para redundancia): `d(sat, centro) + ρ ≤ θ`. Es la condición exacta de que el disco entero cabe en la huella de ese único satélite; con θ = 20° equivale a `d ≤ 17.302°`.

**Supuesto S5:** la observación es binaria dentro de la huella (un punto se ve igual en el centro que en el borde). No se modela resolución ni nubosidad.

## 3. Calidad de una configuración y prioridades

### 3.1 Pesos de prioridad

| Prioridad | Peso wᵢ |
|---|---|
| Alta | 3 |
| Media | 2 |
| Normal | 1 |

Con las prioridades iniciales la suma es W = 3+3+2+2+2+1 = 13. La escala 3:2:1 es la traducción lineal más simple de tres niveles ordenados; se declara como supuesto (S6) y es configurable.

### 3.2 Función de aptitud (fitness)

```
F = C + β·R + γ·G          con β = 0.10 y γ = 0.50
```

| Término | Fórmula | Rango | Qué mide |
|---|---|---|---|
| **C** Cobertura ponderada | Σ wᵢ·fᵢ / W | [0, 1] | Objetivo principal: cuánto de cada región se observa, pesado por prioridad. |
| **R** Redundancia ponderada | Σ wᵢ·[kᵢ ≥ 2] / W | [0, 1] | Bono: regiones con al menos 2 satélites que la cubren completamente (kᵢ = número de satélites con d + ρ ≤ θ). Si un satélite falla, la región sigue observada. |
| **G** Guía de proximidad | Σ wᵢ·(1 − fᵢ)·exp(−máx(0, dminᵢ − (θ − ρ)) / 20°) / W | [0, 1) | Pista para el algoritmo: premia acercarse a regiones que todavía no están completamente cubiertas. Vale 0 cuando todas están cubiertas. |

**Por qué cada término y cada constante:**
- **C** es el objetivo pedido por el enunciado. Usar la fracción `fᵢ` (y no solo cubierta/no cubierta) da al algoritmo una señal gradual: cubrir 30 de 37 puntos es mejor que 10.
- **R** da un uso concreto a los 2 satélites "sobrantes" (6 regiones, 8 satélites) y prefiere que la redundancia vaya a regiones de alta prioridad. Sin R, todas las configuraciones con cobertura total empatarían y la búsqueda no distinguiría una constelación robusta de una frágil.
- **β = 0.10** se eligió para que **nunca convenga sacrificar cobertura por redundancia**: quitar un satélite de la región *i* para duplicar la región *j* cuesta wᵢ/W en C y gana β·wⱼ/W en R; como β·w_máx = 0.3 < 1 = w_mín, la pérdida siempre es mayor que la ganancia.
- **G** resuelve un problema práctico: al inicio, un satélite aleatorio casi nunca toca una región (la huella cubre el 3 % de la esfera), y sin G todas esas configuraciones tendrían aptitud 0 y la búsqueda sería ciega. **γ = 0.5 < 1** garantiza que la pista nunca vale más que cubrir de verdad: para cada región fᵢ + γ·(1 − fᵢ)·g < 1, así que una región parcialmente cubierta con buena "pista" siempre vale menos que una cubierta.
- El rango de F es [0, 1.1]. La UI y los reportes muestran F y además C en porcentaje, que es más fácil de interpretar.

**Supuesto S7:** la redundancia solo cuenta hasta 2 satélites (tener 3 no suma más). Es la decisión más simple que expresa "tolerancia a un fallo".

## 4. Condiciones de invalidez (restricciones duras)

Una configuración es **inválida** si cumple al menos una de estas condiciones:

| # | Restricción | Condición de violación | Medida de violación |
|---|---|---|---|
| R1 | Zonas de desechos activas (3) | d(sat, centro de zona) < radio de zona | radio − d (grados) |
| R2 | Zonas de exclusión de objetos ocupados activos (2) | d(sat, objeto) < radio de exclusión | radio − d (grados) |
| R3 | Separación mínima entre satélites | d(satᵢ, satⱼ) < 3° | 3° − d (grados) |

**Interpretación de las zonas (pedida por el enunciado):** cada zona es un **casquete esférico** definido por su centro y su radio angular. Un satélite está "dentro" si su punto subsatelital cae en el casquete. Geométricamente esto equivale a un **cono con vértice en el centro de la Tierra**, por lo que la interpretación no depende de la altitud elegida (coherente con S2). El borde se considera permitido (d = radio es válido).

**R3 es una restricción agregada por el equipo (S8):** dos satélites en el mismo punto serían una colisión en el modelo y, además, desperdiciarían un satélite. 3° (≈ 330 km) es una separación pequeña que no interfiere con la cobertura (dos satélites pueden cubrir completamente la misma región a 3° de distancia).

**Violación total** V = suma de todas las medidas de violación (en grados). V = 0 ⇔ configuración válida.

**Qué ocurre con una configuración inválida — reglas de factibilidad de Deb.** Al comparar dos configuraciones:
1. Si una es válida y la otra no, **gana la válida, sin importar su aptitud**.
2. Si ambas son válidas, gana la de mayor aptitud F.
3. Si ambas son inválidas, gana la de **menor violación V**.

Esta regla se usa en **todos** los lugares donde se elige: torneo, elitismo y "mejor solución encontrada". Por eso una solución inválida **nunca** puede ganarle a una válida ni presentarse como la mejor si existe alguna válida.

**Por qué no penalizar la aptitud (F − λ·V):** con una penalización, el resultado depende de λ; si λ es pequeña, una configuración que invade una zona pero cubre más podría ganar. Las reglas de Deb no tienen parámetros que ajustar y garantizan la propiedad que pide el enunciado. Las configuraciones inválidas **no se descartan**: se conservan en la población porque pueden aportar material genético útil, pero pierden toda comparación contra las válidas.

**Escenario inviable:** si al terminar no existe ninguna configuración válida, el sistema reporta **INVIABLE** y muestra la configuración de **menor violación**, marcada como tal. Además, antes de evolucionar se ejecuta un **análisis de factibilidad**: se recorre una malla de 20 000 puntos uniformes sobre la esfera, se calcula la fracción de espacio libre y se intenta colocar 8 satélites con un método voraz. Si lo logra, el escenario es *factible demostrado* (existe al menos un testigo). Si no, se reporta *posiblemente inviable*. Un algoritmo evolutivo no puede demostrar inviabilidad, y el sistema lo dice así.

## 5. Estrategia del algoritmo evolutivo

Algoritmo genético generacional con elitismo:

```
1. Población inicial: N configuraciones con satélites uniformes sobre la esfera.
2. Evaluar cada configuración (F, V).
3. Repetir G generaciones:
   a. Elitismo: copiar las E mejores (según reglas de Deb) a la nueva población.
   b. Mientras falten individuos:
      - Seleccionar 2 padres por torneo de tamaño k (gana el mejor según Deb).
      - Con probabilidad pc: cruce uniforme alineado; si no, copiar al padre 1.
      - Mutar el hijo.
   c. Evaluar y registrar estadísticas de la generación.
4. Devolver la mejor configuración encontrada (según Deb) y el historial.
```

**Operadores y su justificación:**

- **Inicialización uniforme sobre la esfera:** z ~ U(−1, 1), lon ~ U(−180°, 180°], lat = asin(z). Muestrear lat uniforme concentraría satélites en los polos.
- **Selección por torneo (k = 3):** sencilla, no requiere escalar la aptitud y funciona directamente con la comparación de Deb (que no es numérica).
- **Cruce uniforme alineado:** cada satélite del hijo se toma del padre A o del padre B con probabilidad 0.5. Como el orden de los satélites no tiene significado, antes del cruce se **empareja** cada satélite de A con el satélite más cercano todavía libre de B (emparejamiento voraz). Sin alinear, el satélite 1 de A podría estar sobre Japón y el satélite 1 de B sobre Yucatán; mezclarlos al azar destruiría la estructura de ambos padres. Alineados, el cruce combina satélites que "hacen el mismo trabajo". El efecto de esta decisión se mide en una prueba propia (ablación).
- **Mutación gaussiana sobre la esfera:** cada satélite, con probabilidad pm, se desplaza una distancia |N(0, σ)| grados en una dirección aleatoria (rotación sobre la esfera). Mutaciones pequeñas ajustan; la cola de la normal permite saltos mayores.
- **Mutación de reinicio:** con probabilidad pr cada satélite se recoloca en un punto aleatorio de la esfera. Mantiene la exploración global cuando la población converge.
- **Elitismo (E = 2):** la mejor configuración nunca se pierde, así que la curva del "mejor" es monótona.

## 6. Parámetros y valores iniciales

| Parámetro | Valor inicial | Cómo se determinó |
|---|---|---|
| Satélites | 8 | Dato del enunciado. |
| Radio de región | 300 km | Dato del enunciado. |
| Semiángulo de huella θ | 20° | Física aproximada (sección 2.1) y análisis de distancias entre regiones. |
| Separación mínima | 3° | Supuesto S8: pequeño frente a θ, evita colisiones. |
| Pesos de prioridad | 3 / 2 / 1 | Escala lineal más simple (S6). |
| β, γ | 0.10, 0.50 | Derivados de las desigualdades de la sección 3.2. |
| Población N | 80 | Regla práctica de unas 5 veces el número de genes (16 números); probado en la prueba de sensibilidad. |
| Generaciones G | 150 | Presupuesto ≈ 12 000 evaluaciones; suficiente para que la curva se estabilice en ejecuciones piloto. |
| Torneo k | 3 | Presión de selección moderada. |
| Probabilidad de cruce pc | 0.9 | Valor estándar en la literatura de AG. |
| Probabilidad de mutación pm (por satélite) | 0.25 | Unos 2 satélites mutados por hijo. |
| Paso de mutación σ | 6° | Del orden del margen de colocación (θ − ρ ≈ 17°); se valida con la prueba de sensibilidad. |
| Probabilidad de reinicio pr | 0.02 | Exploración baja pero constante. |
| Elitismo E | 2 | Protege a la mejor sin reducir mucho la diversidad. |
| Semilla | 42 (referencia) | Toda la aleatoriedad usa un generador con semilla: la misma semilla produce exactamente el mismo resultado. |

Todos los parámetros son configurables desde la CLI y desde la interfaz. Los valores de N, σ y la alineación del cruce **se validan experimentalmente** en las pruebas propias, no solo se asumen.

## 7. ¿Cuándo una solución es suficientemente buena?

Se definen tres niveles, medidos sobre la mejor configuración final:

1. **Aceptable:** es **válida** (V = 0). Requisito mínimo: sin validez no hay solución.
2. **Satisfactoria:** válida **y** con todas las regiones activas cubiertas (C = 1).
3. **Óptima según la cota:** satisfactoria y con la redundancia máxima posible.

**Cota superior de la redundancia en el escenario inicial** (argumento de conteo que se puede verificar a mano):
- Un satélite cubre completamente una región si está a ≤ 17.302° de su centro. Dos regiones pueden compartir un satélite solo si sus centros están a ≤ 34.6°. La única pareja que lo cumple es Yucatán–California (31.1°); Yucatán–Amazonía está a 35.7°.
- Para duplicar Yucatán (3) y California (2) basta con 2 satélites en la zona común. Los 6 restantes cubren Amazonía, Sahel, Japón y Australia (uno cada una) y sobran 2. La mejor forma de usarlos es duplicar Amazonía (3) y una región Media (2).
- Redundancia máxima: R* = (3 + 2 + 3 + 2)/13 = **10/13 ≈ 0.769**, y por lo tanto **F* = 1 + 0.1·10/13 ≈ 1.0769**.

Si el algoritmo alcanza F*, se puede afirmar con evidencia que encontró una configuración óptima **para este criterio**. Si se detiene antes, el hecho de que deje de mejorar **no** demuestra optimalidad, y se reporta la distancia a la cota.

En escenarios modificados la cota anterior deja de aplicar. Ahí se usan los niveles 1 y 2 y la comparación entre ejecuciones.

## 8. Resumen de supuestos

| Id | Supuesto | Efecto si no se cumple |
|---|---|---|
| S1 | Tierra esférica de 6 371 km | Errores < 0.5 % en distancias; irrelevante a esta escala. |
| S2 | Altitud común y fija, posición = punto subsatelital | No se optimiza la altura; la huella es la misma para todos. |
| S3 | Configuración estática (sin dinámica orbital) | No representa la cobertura en el tiempo; es una "foto". |
| S4 | Huella de 20° (≈ LEO 900 km, elevación 10°) | Otra θ cambia qué regiones pueden compartir satélite (parámetro configurable). |
| S5 | Observación binaria dentro de la huella | No distingue calidad de observación centro/borde. |
| S6 | Pesos 3/2/1 | Otra escala cambia qué región recibe la redundancia. |
| S7 | Redundancia útil hasta 2 satélites | No premia triple cobertura. |
| S8 | Separación mínima de 3° entre satélites | Evita colisiones; reduce levemente el espacio disponible. |
| S9 | Zonas = casquetes (conos desde el centro de la Tierra), borde permitido | Independiente de la altitud. |
| S10 | Disco de región muestreado con 37 puntos | Con cobertura por unión de varias huellas, podría quedar sin ver una franja muy delgada del borde entre dos muestras. Cuando la cubre un solo satélite no hay error, porque la redundancia y la cobertura completa individual usan la condición exacta d + ρ ≤ θ. |
