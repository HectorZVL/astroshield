# Uso de inteligencia artificial

El enunciado pide declarar si se usaron herramientas de IA, para qué y qué verificaciones se hicieron. Esta es la declaración.

## Herramienta

- **Claude Code** (agente de programación de Anthropic, modelo Claude Opus 5.5), usado desde la aplicación de escritorio.

## Para qué se usó

Se usó como asistente de ingeniería sobre un encargo detallado del equipo (stack, rúbrica, nivel visual, reglas de Git y criterios de aceptación). La IA:

1. Propuso el modelo (representación, cobertura, aptitud, restricciones) y lo documentó con su justificación en `docs/01`.
2. Escribió el código del núcleo (`src/core`), los experimentos (`experiments/`), las pruebas (`tests/`) y la visualización (`src/app`).
3. Ejecutó las pruebas y los experimentos. Generó `docs/03-pruebas.md` **automáticamente a partir de los resultados**, sin escribir números a mano.
4. Redactó la documentación (docs/02, 04, 05, 06 y este archivo) citando los resultados reales.
5. Hizo los commits del historial, uno por tarea lógica.

## Verificaciones realizadas

| Verificación | Cómo | Resultado |
|---|---|---|
| Pruebas unitarias del modelo | 63 pruebas en Vitest: geometría, cobertura, restricciones, reglas de Deb, operadores, reproducibilidad, inviabilidad y chip de la UI | Todas pasan (`npm test`) |
| Números de la documentación | docs/03 se genera desde `results/`; docs/04 y la guía citan esos archivos | Cada cifra se puede rastrear a un archivo de `results/` |
| Reproducibilidad | `tests/referencia.test.ts` vuelve a ejecutar la semilla 42 y compara con el archivo que carga la UI | Idéntico |
| Validez de lo reportado | Al terminar los experimentos, cada una de las 318 ejecuciones se reevalúa desde cero | 0 inconsistencias |
| Coherencia con la teoría | La cota F* = 1.07692 se dedujo a mano (docs/01 §7) **antes** de ejecutar; luego se comprobó que ninguna ejecución la supera | 0 de 30 la superan; 28 la alcanzan |
| UI = datos reales | La UI recalcula la aptitud del run cargado; el preset «Inviable» en el navegador reproduce el valor de la CLI (violación 11.01°) | Coinciden |
| Visualización | Se probó en el navegador: carga, vista Comparar, línea de tiempo, vuelo de cámara, preset Inviable con evolución en el Worker, chip INVÁLIDA al cambiar condiciones, y diseño en escritorio, tablet y teléfono | Funciona; se corrigieron los problemas de diseño encontrados |

## Errores que las verificaciones detectaron y que se corrigieron

Se documentan porque muestran que las verificaciones tuvieron efecto:

1. **Precisión numérica.** Una prueba falló porque `acos` pierde precisión con ángulos casi nulos: la violación de un satélite en el centro de una zona de 12° salía 11.9999991°. Se cambió a `atan2(|a×b|, a·b)`, que es estable.
2. **Radio de región global.** La primera versión calculaba la condición de cobertura completa con el radio de la primera región para todas. Se corrigió para usar el radio de cada región, por si alguien cambia uno.
3. **Prueba P4 sin efecto visible.** En la primera ejecución, mover los objetos (exclusión de 5°) sobre las regiones dio 0/10 invasiones **con y sin** la restricción: la prueba no demostraba nada. Se rediseñó con exclusión de 12° (6/10 sin la restricción, 0/10 con ella), y docs/03 explica el cambio.
4. **Interpretaciones que no coincidían con los datos.** En la revisión del reporte generado se encontraron frases que no cuadraban con los números: "en algunas ejecuciones" cuando eran 10/10, un "costo" de la restricción cuando la aptitud era idéntica, y "ninguna región Media duplicada" cuando California sí lo estaba. Se reemplazaron por textos condicionados a los datos.
5. **Causa del óptimo local.** La primera explicación de por qué 2 semillas no llegaban a F* era una hipótesis. Se escribió un diagnóstico (aporte de cada satélite) y se reemplazó por la causa medida: 3 satélites para duplicar Yucatán y California en lugar de 2, y ningún satélite sobrante.
6. **Afirmación de "todos los colores en un archivo".** Una búsqueda encontró colores escritos fuera de `tema.ts` (luces y materiales). Se movieron al tema.
7. **Dependencias con vulnerabilidades.** Las versiones iniciales de Vite y Vitest tenían avisos de `npm audit`. Se actualizaron a Vite 7 y Vitest 4, con 0 vulnerabilidades.

## Lo que el equipo debe revisar por su cuenta

- Leer docs/01 y docs/02 y poder explicar cada decisión **sin** el documento delante (la guía docs/06 ayuda).
- Ejecutar `npm run verificar` en su propia máquina.
- Cambiar al menos un parámetro (por ejemplo `--sigma 1`) y comprobar que el efecto coincide con lo que dice P10.

## Autoría de los commits

Los commits se hicieron desde la sesión de Claude Code con la identidad de git del dueño del repositorio (`hectorzvl13`). Cada mensaje incluye la línea `Co-Authored-By: Claude`, que declara la participación de la IA. Las fechas son las reales de la sesión de trabajo; no se modificaron.
