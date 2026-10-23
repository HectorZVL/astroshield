# Entregable 5 — Visualización 3D

## Cómo abrirla

```bash
npm install
npm run dev
```

Abre la dirección que imprime Vite (por defecto http://localhost:5173).

## Qué datos muestra (y de dónde salen)

**La visualización no inventa nada.** Al abrirse carga `results/run-referencia.json`, la ejecución real con semilla 42 que genera `npm run experimentos`. Al instante:

1. **Vuelve a evaluar** la configuración final con el mismo código del núcleo (`evaluarEn`) y muestra en la barra superior: *"✓ Verificado: aptitud recalculada = guardada (1.07692)"*. Si los números no coincidieran, aparecería en rojo.
2. Dibuja cada satélite en la latitud y longitud exactas de la configuración.
3. Colorea cada región según la evaluación del núcleo (cubierta / parcial / no cubierta).

Cuando se pulsa **Evolucionar**, el algoritmo corre en un **Web Worker** con el mismo `MotorEvolutivo` que usan la CLI y las pruebas. Con la misma semilla y el mismo escenario el resultado es idéntico. Por ejemplo, el preset «Inviable» termina con violación 11.01°, igual que la prueba P6.

La prueba automática `tests/referencia.test.ts` vuelve a ejecutar la semilla 42 y comprueba que el resultado sea idéntico al archivo que carga la UI.

Cada escenario rápido fija las condiciones **y la semilla** de una ejecución documentada en docs/03 ([presets.ts](../src/app/presets.ts)): «Inicial» = P1 (semilla 42), «Espacio reducido ×4» = P5 con factor 4 (semilla 1), «Difícil: Yucatán» = P6 (a) (semilla 1) e «Inviable» = P6 (b) (semilla 1). Lo comprueba `tests/presets.test.ts`.

`tests/coordenadas.test.ts` comprueba que lo dibujado corresponde a los datos: la conversión lat/lon → 3D de la escena es la misma del núcleo, cada satélite del run de referencia queda en su coordenada exacta, la textura del globo coincide con esa conversión (las costas están donde dicen sus coordenadas) y las huellas y zonas se dibujan con el radio angular del modelo.

## Qué distingue (requisitos del enunciado)

| Requisito | Cómo se ve |
|---|---|
| La Tierra | Globo con costas reales (Natural Earth 1:50 m) dibujadas con un estilo propio: océano en degradado, continentes con matriz de puntos, costas luminosas, retícula cada 15°, atmósfera y bloom |
| Regiones a observar | Disco de 300 km a escala real, punto central, etiqueta con el % observado |
| Los 8 satélites | Modelo 3D propio (cuerpo, paneles, antena), halo y etiqueta S1…S8 |
| Huella de cobertura | Círculo de 20° sobre la superficie con pulso, onda expansiva y cono de visión desde el satélite |
| Regiones cubiertas / no cubiertas | Verde = cubierta, ámbar = parcial, rojo = no cubierta (con halo parpadeante). Rayos verdes punteados desde cada satélite que cubre la región completa |
| Zonas de desechos | Casquete con franjas de peligro animadas, borde rojo y partículas de desechos orbitando |
| Objetos ocupados | Octaedro ámbar a la altura de los satélites, anillo de exclusión y círculo de exclusión en la superficie |
| Girar el globo | Arrastrar con el ratón o el dedo y rueda para zoom. La rotación automática se detiene al interactuar |
| Inicial contra final | Botones **Inicial / Final / Comparar**. En *Comparar*, los satélites iniciales aparecen en violeta con un arco punteado hasta su posición final |

## Interfaz (HUD)

- **Barra superior:** origen del run, verificación, aptitud F, cobertura, redundancia, regiones cubiertas, **semilla y parámetros del run** (N, G, σ, pm, pc), evaluaciones, y el chip **VÁLIDA / INVÁLIDA / INVIABLE** con su contexto y nivel (Aceptable / Satisfactoria).
- **Panel izquierdo:** presets de escenario (inicial, espacio reducido, difícil, inviable), regiones con prioridad y activación, zonas de desechos y objetos (activar, mover, cambiar radio, agregar y borrar), parámetros del modelo y del algoritmo, arranque en caliente y botón **Evolucionar**. Al editar las condiciones se muestra el análisis de factibilidad.
- **Panel derecho:** tabla de regiones (prioridad, % observado, satélites que la cubren completa, estado); un clic hace volar la cámara a la región. Debajo, la leyenda.
- **Dock inferior:** gráfica propia en canvas (mejor, media, peor, válidos y cota F*), con tooltip y clic para saltar a una generación. Línea de tiempo con reproducción para ver la mejor configuración de cada generación.
- **Clic en un satélite:** tarjeta con coordenadas, regiones que cubre, margen a la zona prohibida más cercana y violaciones.

## Cambio de condiciones en la interfaz (sección 3.3)

Al cambiar cualquier condición (apagar una zona, moverla, cambiar una prioridad o agregar una zona), la configuración mostrada se **reevalúa al instante** con el núcleo:

- el chip pasa a **INVÁLIDA** si ahora viola algo, y la tabla y los colores se actualizan;
- un aviso explica: *"Condiciones modificadas… Reevaluada ahora: INVÁLIDA"*, con la lista de qué satélite invade qué zona y por cuántos grados;
- **Evolucionar** adapta la constelación. Con *arranque en caliente*, la configuración anterior entra a la población inicial.

## Garantía: nunca se muestra una inválida como válida

El chip lo decide `estadoParaMostrar()` ([estadoVista.ts](../src/app/estadoVista.ts)) a partir de la evaluación del núcleo **en las condiciones actuales**. La prueba `tests/estadoVista.test.ts` evalúa 400 configuraciones aleatorias en todos los contextos posibles y verifica que ninguna inválida produzca el chip VÁLIDA.

## Las animaciones son decorativas

- Las transiciones entre configuraciones interpolan por gran círculo **solo durante la animación**. Al terminar, cada satélite queda en la coordenada exacta del modelo (`capas.ts`, comentario en `actualizar`).
- La altitud visual de los satélites (1.24 radios terrestres) es decorativa: el modelo no usa altitud (supuesto S2).
- Con `prefers-reduced-motion` no hay rotación automática, pulsos, partículas, estelas ni vuelos animados: todo cambia al instante.
- Sin WebGL se muestra un mensaje y el HUD sigue mostrando los datos (tabla, gráfica, métricas).

## Personalización de colores

Todos los colores están en un solo archivo: [`src/app/tema.ts`](../src/app/tema.ts). La escena 3D los lee directamente y el CSS los recibe como variables (`--cian`, `--rojo`, …). `estilos.css` no tiene ningún color escrito a mano. Paleta inicial: fondo `#04060f`, cian `#22d3ee`, violeta `#8b5cf6`, ámbar `#fbbf24`, verde `#34d399`, rojo `#fb3b5c`.
