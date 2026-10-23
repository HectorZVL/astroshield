# AstroShield — Evolucionar una constelación inteligente

Algoritmo evolutivo que diseña una constelación de **8 satélites** para observar **6 regiones** de la Tierra, respetando **3 zonas de desechos** y **2 objetos ocupados**, con pruebas reproducibles y una visualización 3D interactiva del globo.

> Enunciado: [docs/enunciado.md](docs/enunciado.md)

## Resultado en una línea

Con la semilla de referencia (42), la mejor configuración es **VÁLIDA**, cubre las **6/6 regiones al 100 %** y alcanza **exactamente la cota teórica F\* = 1.07692**, es decir, es óptima para el criterio definido. En 30 semillas: 30/30 válidas y satisfactorias, y 28/30 en la cota. Contra búsqueda aleatoria con el mismo presupuesto, el AG gana con p < 10⁻⁶. Detalle en [docs/03-pruebas.md](docs/03-pruebas.md).

## Requisitos

- Node.js 20 o superior (probado con Node 25.8) y npm.
- Un navegador con WebGL para la visualización (Chrome, Edge, Firefox o Safari recientes).

## Instalación y ejecución

```bash
npm install
```

| Orden | Qué hace |
|---|---|
| `npm run dev` | Abre la visualización 3D en http://localhost:5173 (carga `results/run-referencia.json`) |
| `npm test` | Ejecuta las 63 pruebas automáticas (Vitest) |
| `npm run experimentos` | Ejecuta **todos** los experimentos (~4 min): regenera `results/*.json`, `results/*.csv` y `docs/03-pruebas.md` |
| `npm run evolucionar` | Ejecuta una evolución desde la terminal (ver opciones abajo) |
| `npm run verificar` | Tipado + pruebas + experimentos: **todo con una sola orden** |
| `npm run build` | Compila la visualización para producción en `dist/` |

### CLI

```bash
npm run evolucionar -- --semilla 7 --generaciones 300
```

```bash
npm run evolucionar -- --escenario inviable
```

```bash
npm run evolucionar -- --apagar atlantico-norte --prioridad australia=Alta
```

```bash
npm run evolucionar -- --escalar 5 --salida results/mi-run.json
```

```bash
npm run evolucionar -- --ayuda
```

La CLI imprime el estado (**VÁLIDA** o **INVIABLE**), la aptitud, la cobertura por región, las coordenadas de cada satélite y, si las hay, las violaciones. El estado sale de la misma función que usa la interfaz.

## Estructura del repositorio

```
astroshield/
├── src/
│   ├── core/                 Lógica del problema y del algoritmo (sin Three.js ni DOM)
│   │   ├── tipos.ts          Tipos compartidos
│   │   ├── rng.ts            Generador aleatorio con semilla (reproducibilidad)
│   │   ├── geo.ts            Geometría esférica
│   │   ├── escenario.ts      Datos del enunciado + cambios de condiciones
│   │   ├── evaluacion.ts     Cobertura, aptitud y restricciones
│   │   ├── comparacion.ts    Reglas de Deb y estados VÁLIDA/INVÁLIDA/INVIABLE
│   │   ├── ag.ts             Algoritmo genético
│   │   ├── factibilidad.ts   Análisis de espacio libre y testigo de factibilidad
│   │   ├── busquedaAleatoria.ts  Línea base de comparación
│   │   └── estadistica.ts    Media, desviación, Mann-Whitney
│   └── app/                  Visualización (Vite + Three.js)
│       ├── tema.ts           TODOS los colores (personalización)
│       ├── main.ts           Estado de la app y conexión de datos
│       ├── worker.ts         El algoritmo en un Web Worker
│       ├── estadoVista.ts    Qué chip de estado se muestra (probado)
│       ├── escena/           Globo, capas 3D, cámara, render
│       └── ui/               HUD y gráfica de evolución
├── experiments/
│   ├── run-all.ts            Todas las pruebas -> results/ + docs/03-pruebas.md
│   ├── comun.ts              Utilidades de los experimentos
│   └── cli.ts                Línea de comandos
├── tests/                    Pruebas automáticas (Vitest)
├── results/                  Resultados reales (JSON/CSV) generados por los experimentos
└── docs/                     Entregables
```

## Entregables

| Entregable | Documento |
|---|---|
| 1. Definición del problema | [docs/01-definicion-del-problema.md](docs/01-definicion-del-problema.md) |
| 2. Implementación funcional | `src/` + explicación didáctica en [docs/02-algoritmo.md](docs/02-algoritmo.md) |
| 3. Pruebas y validación | [docs/03-pruebas.md](docs/03-pruebas.md) (generado desde `results/`) y `tests/` |
| 4. Análisis de resultados | [docs/04-analisis.md](docs/04-analisis.md) |
| 5. Visualización 3D | `npm run dev` + [docs/05-visualizacion.md](docs/05-visualizacion.md) |
| 6. Repositorio y presentación | Este README, historial de git, [docs/06-guia-defensa.md](docs/06-guia-defensa.md) y [AI_USAGE.md](AI_USAGE.md) |

## Modelo en resumen

- **Configuración:** 8 pares (latitud, longitud). La altitud es común y fija.
- **Cobertura:** cada satélite ve un casquete de **20°** (≈ órbita baja de 900 km con 10° de elevación mínima). Una región (disco de 300 km, 37 puntos de muestreo) está **cubierta** si todos sus puntos están dentro de alguna huella.
- **Aptitud:** `F = C + 0.1·R + 0.5·G`. C es la cobertura ponderada por prioridad (Alta 3, Media 2, Normal 1), R la redundancia (regiones con 2 o más satélites completos) y G una guía de proximidad que solo actúa sobre regiones no cubiertas.
- **Restricciones duras:** fuera de las zonas de desechos, fuera de las exclusiones de los objetos y separación mínima de 3° entre satélites.
- **Manejo de restricciones:** reglas de factibilidad de Deb. Una configuración válida **siempre** le gana a una inválida. Si no se encuentra ninguna válida, el resultado se reporta como **INVIABLE**, con la configuración de menor violación.
- **AG:** población 80, 150 generaciones, torneo 3, cruce uniforme **alineado** (pc 0.9), mutación gaussiana sobre la esfera (pm 0.25, σ 6°) más reinicio (0.02), elitismo 2.

Justificación completa y supuestos (S1–S10): [docs/01-definicion-del-problema.md](docs/01-definicion-del-problema.md).

## Criterios de aceptación y cómo comprobarlos

| Criterio | Cómo se comprueba |
|---|---|
| Las pruebas pasan y los experimentos se reproducen con una orden | `npm run verificar` |
| Ninguna solución inválida se muestra como válida (CLI y UI) | `tests/evaluacion.test.ts` (reglas de Deb), `tests/estadoVista.test.ts` (chip de la UI) y la verificación independiente de 318 ejecuciones en docs/03 |
| La visualización muestra exactamente el run de referencia | La UI recalcula la aptitud al cargar ("✓ Verificado"); `tests/referencia.test.ts` vuelve a ejecutar la semilla 42 y la compara con `results/run-referencia.json` |
| 7 pruebas obligatorias + al menos 1 propia | P1–P7 + P8 (contra azar), P9 (ablación del cruce), P10 (sensibilidad) y P11 (cambio de condiciones) en docs/03 |
| Decisiones justificadas y supuestos declarados | docs/01 (supuestos S1–S10) y docs/04 §6 (limitaciones) |
| Historial de git coherente | `git log --oneline` |

## Equipo

| Integrante | GitHub |
|---|---|
| Carlos Daniel Cocom García | [@cocom288](https://github.com/cocom288) |
| Saúl Alejandro Rendón Cocom | [@Elitesou1](https://github.com/Elitesou1) |
| Ángel Fernando Ocampo García | [@fernandoagg](https://github.com/fernandoagg) |
| hectorzvl13 | [@hectorzvl13](https://github.com/hectorzvl13) |

Reparto propuesto para la demostración: [docs/06-guia-defensa.md](docs/06-guia-defensa.md#propuesta-de-reparto-para-la-demostración).

## Créditos de datos

Costas: [Natural Earth](https://www.naturalearthdata.com/) (dominio público), a través del paquete npm `world-atlas`. El dibujo del globo (colores, puntos, brillo y retícula) es propio del proyecto.
