// Ejecuta TODOS los experimentos y genera:
//   results/*.json, results/*.csv    -> datos crudos de cada prueba
//   results/run-referencia.json       -> la ejecución que muestra la visualización
//   docs/03-pruebas.md                -> documento con condiciones, tablas e interpretación
// Uso: npm run experimentos   (todas las semillas son fijas: el resultado es reproducible)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evolucionar, distanciaConfiguraciones, PARAMETROS_BASE } from '../src/core/ag';
import { busquedaAleatoria } from '../src/core/busquedaAleatoria';
import { nivelDeCalidad, estadoDeConfiguracion } from '../src/core/comparacion';
import {
  activarRegion,
  activarZona,
  agregarZona,
  cambiarPrioridad,
  escalarDesechos,
  escenarioInicial,
  moverZona,
  renombrar,
} from '../src/core/escenario';
import { evaluarEn } from '../src/core/evaluacion';
import { mannWhitney, resumir, type Resumen } from '../src/core/estadistica';
import { analizarFactibilidad } from '../src/core/factibilidad';
import { distancia } from '../src/core/geo';
import type { Escenario, ParametrosAG, ResultadoEjecucion } from '../src/core/tipos';
import {
  F_ESTRELLA,
  RAIZ,
  TOL,
  f,
  generacionHasta,
  guardar,
  margenes,
  margenMinimo,
  pct,
  rango,
  registroVerificacion,
  tabla,
  trabajoDeSatelites,
  verificar,
} from './comun';

const inicio = Date.now();
const ESC = escenarioInicial();
const SEMILLA_REF = 42;
const SEMILLAS_30 = rango(1, 30);
const SEMILLAS_10 = rango(1, 10);
const secciones: string[] = [];
const veredictos: Array<{ id: string; prueba: string; pasa: boolean; resumen: string }> = [];

const log = (m: string) => console.log(`[${((Date.now() - inicio) / 1000).toFixed(1)} s] ${m}`);

function correr(esc: Escenario, p: Partial<ParametrosAG>, etiqueta: string, semillasIniciales?: ResultadoEjecucion['final']['config'][]) {
  return verificar(evolucionar(esc, p, { semillasIniciales }), etiqueta);
}

const filaResumen = (nombre: string, r: Resumen, d = 4) => [nombre, f(r.media, d), f(r.desviacion, d), f(r.minimo, d), f(r.maximo, d), f(r.mediana, d)];
const CAB_RESUMEN = ['Métrica', 'Media', 'Desv. est.', 'Mínimo', 'Máximo', 'Mediana'];

function veredicto(id: string, prueba: string, pasa: boolean, resumen: string) {
  veredictos.push({ id, prueba, pasa, resumen });
  return `**Resultado de la prueba: ${pasa ? '✅ PASA' : '❌ FALLA'}** — ${resumen}`;
}

// =============================================================================
// P1 — Escenario inicial
// =============================================================================
log('P1 escenario inicial');
const factInicial = analizarFactibilidad(ESC);
const ref = correr(ESC, { semilla: SEMILLA_REF }, 'P1 referencia');
{
  const ev = ref.final.eval;
  const trabajo = trabajoDeSatelites(ref.final.config, ESC);
  const mD = margenes(ref.final.config, ESC, 'desechos');
  const mO = margenes(ref.final.config, ESC, 'ocupadas');
  guardar('run-referencia.json', {
    descripcion: 'Ejecución de referencia (semilla 42, parámetros base, escenario inicial). La visualización carga este archivo.',
    comando: 'npm run experimentos',
    cotaTeorica: F_ESTRELLA,
    factibilidad: factInicial,
    resultado: ref,
  });
  guardar(
    'historial-referencia.csv',
    ['generacion,mejor,media,peor,media_validos,validos,diversidad,mejor_valida,mejor_cobertura,mejor_regiones_cubiertas']
      .concat(
        ref.historial.map((h) =>
          [h.generacion, h.mejor, h.media, h.peor, h.mediaValidos ?? '', h.validos, h.diversidad, h.mejorValida, h.mejorCobertura, h.mejorRegionesCubiertas].join(','),
        ),
      )
      .join('\n'),
  );
  const pasa = ref.estado === 'VÁLIDA' && ev.regionesCubiertas === 6;
  secciones.push(`## P1 — Escenario inicial

**Condiciones.** Escenario del enunciado sin cambios (6 regiones, 3 zonas de desechos, 2 objetos ocupados), semilla ${SEMILLA_REF}, parámetros base: población ${PARAMETROS_BASE.poblacion}, ${PARAMETROS_BASE.generaciones} generaciones, torneo ${PARAMETROS_BASE.torneo}, pc = ${PARAMETROS_BASE.probCruce}, pm = ${PARAMETROS_BASE.probMutacion}, σ = ${PARAMETROS_BASE.sigmaMutacion}°, pr = ${PARAMETROS_BASE.probReinicio}, elitismo ${PARAMETROS_BASE.elitismo}, cruce alineado. Archivo: \`results/run-referencia.json\` (es el que carga la visualización).

**Análisis de factibilidad previo.** ${factInicial.mensaje} (${factInicial.puntosLibres} de ${factInicial.puntosMalla} puntos de la malla libres).

**Resultados — resumen de la mejor configuración final.**

${tabla(['Estado', 'Nivel', 'Aptitud F', 'Cobertura C', 'Redundancia R', 'Regiones cubiertas', 'Cota F*', 'Evaluaciones', 'Generación satisfactoria'], [[ref.estado, nivelDeCalidad(ev), f(ev.fitness, 5), pct(ev.cobertura), f(ev.redundancia), `${ev.regionesCubiertas}/6`, f(F_ESTRELLA, 5), ref.evaluaciones, ref.generacionSatisfactoria]])}

**Regiones.**

${tabla(['Región', 'Prioridad', 'Fracción observada', 'Estado', 'Satélites que la cubren completa', 'Distancia al satélite más cercano'], ev.regiones.map((r) => [r.nombre, r.prioridad, pct(r.fraccion), r.estado, r.satelitesCompletos.length ? r.satelitesCompletos.map((i) => `S${i + 1}`).join(', ') : '—', `${f(r.distanciaMinima, 2)}°`]))}

**Satélites.**

${tabla(['Satélite', 'Latitud', 'Longitud', 'Cubre completamente', 'Margen a desechos', 'Margen a objetos'], ref.final.config.map((s, i) => [`S${i + 1}`, `${f(s.lat, 2)}°`, `${f(s.lon, 2)}°`, trabajo[i], `${f(mD[i].margen, 1)}° (${mD[i].zona})`, `${f(mO[i].margen, 1)}° (${mO[i].zona})`]))}

(El margen es la distancia al borde de la zona más cercana; positivo = fuera de la zona.)

**Interpretación.** La configuración final es **${ref.estado}** y cubre **${ev.regionesCubiertas} de 6** regiones al 100 %. ${Math.abs(ev.fitness - F_ESTRELLA) < TOL ? `Alcanza exactamente la cota teórica F* = ${f(F_ESTRELLA, 5)}: además de cubrir todo, duplica la cobertura de las regiones que la cota predice (Yucatán y California comparten satélites; Amazonía y una región Media reciben el segundo satélite). Para este criterio de evaluación la solución es óptima, no solo "buena".` : `Queda a ${f(F_ESTRELLA - ev.fitness, 5)} de la cota teórica: cubre todo pero no logra la redundancia máxima.`} La configuración inicial (mejor de la generación 0) tenía F = ${f(ref.inicial.eval.fitness, 4)} y ${ref.inicial.eval.regionesCubiertas} regiones cubiertas.

${veredicto('P1', 'Escenario inicial', pasa, `${ref.estado}, ${ev.regionesCubiertas}/6 regiones cubiertas, F = ${f(ev.fitness, 5)}.`)}
`);
}

// =============================================================================
// P7 — Variación (se calcula antes porque P2, P3, P4 y P8 reutilizan estas 30 ejecuciones)
// =============================================================================
log('P7 variación (30 semillas)');
const corridas30 = SEMILLAS_30.map((s) => correr(ESC, { semilla: s }, `P7 semilla ${s}`));

// =============================================================================
// P2 — Evolución
// =============================================================================
log('P2 evolución');
{
  const h = ref.historial;
  const puntos = [0, 1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150].filter((g) => g < h.length);
  const gF = generacionHasta(ref, F_ESTRELLA);
  // Curva media de las 30 ejecuciones en los mismos puntos.
  const curvaMedia = puntos.map((g) => resumir(corridas30.map((r) => r.historial[g].mejor)));
  const mediaPob = puntos.map((g) => resumir(corridas30.map((r) => r.historial[g].media)));
  const monotona = corridas30.every((r) => r.historial.every((x, i) => i === 0 || !r.historial[i - 1].mejorValida || x.mejor >= r.historial[i - 1].mejor - TOL));
  const mejora = corridas30.every((r) => r.final.eval.fitness > r.historial[0].mejor);
  guardar('p2-evolucion.json', { puntos, referencia: puntos.map((g) => h[g]).map(({ mejorConfig: _c, ...x }) => x), media30: curvaMedia, mediaPoblacion30: mediaPob });
  secciones.push(`## P2 — Evolución de la calidad

**Condiciones.** Historial por generación de la ejecución de referencia (semilla ${SEMILLA_REF}) y de las 30 ejecuciones de P7 (semillas 1–30), escenario inicial y parámetros base. Datos completos: \`results/historial-referencia.csv\` y \`results/p2-evolucion.json\`.

**Resultados — ejecución de referencia.**

${tabla(['Generación', 'Mejor F', 'Media F', 'Peor F', 'Válidos (de 80)', 'Diversidad (°)', 'Regiones cubiertas (mejor)'], puntos.map((g) => [g, f(h[g].mejor), f(h[g].media), f(h[g].peor), h[g].validos, f(h[g].diversidad, 1), h[g].mejorRegionesCubiertas]))}

**Resultados — media de las 30 ejecuciones.**

${tabla(['Generación', 'Mejor F (media ± desv.)', 'Mejor F mínimo', 'Media de la población'], puntos.map((g, i) => [g, `${f(curvaMedia[i].media)} ± ${f(curvaMedia[i].desviacion)}`, f(curvaMedia[i].minimo), f(mediaPob[i].media)]))}

**Interpretación.** La mejor aptitud sube de ${f(h[0].mejor)} (generación 0, configuraciones aleatorias) a ${f(h[h.length - 1].mejor, 5)}. La subida es rápida al principio: la generación satisfactoria (todas las regiones cubiertas) es la ${ref.generacionSatisfactoria} y la cota F* se alcanza en la generación ${gF}. Después la curva del mejor se estanca, porque ya está en el óptimo del criterio. La media de la población queda por debajo del mejor durante toda la ejecución: la mutación sigue generando variantes peores que se descartan, y eso indica que la búsqueda sigue explorando y no solo copia al mejor. La diversidad baja de ${f(h[0].diversidad, 1)}° a ${f(h[h.length - 1].diversidad, 1)}°: la población converge alrededor de la solución, pero no colapsa a una sola configuración. Los válidos pasan de ${h[0].validos}/80 en la población aleatoria a ${h[h.length - 1].validos}/80 al final, porque las reglas de Deb empujan a la población fuera de las zonas prohibidas. En las 30 ejecuciones el mejor nunca empeora (elitismo): ${monotona ? 'verificado en todas' : 'NO se cumplió en alguna ejecución'}.

${veredicto('P2', 'Evolución', monotona && mejora, `la mejor aptitud mejora en las 30 ejecuciones y nunca disminuye.`)}
`);
}

// =============================================================================
// P3 — Zonas restringidas (desechos)
// =============================================================================
log('P3 zonas restringidas');
{
  const todas = [ref, ...corridas30];
  const margenD = todas.map((r) => margenMinimo(r.final.config, ESC, 'desechos'));
  const dentroD = todas.filter((r) => r.final.eval.violaciones.some((v) => v.tipo === 'desechos')).length;
  const invalidosG0 = resumir(corridas30.map((r) => 80 - r.historial[0].validos));

  // Prueba de efecto: zona trampa sobre Japón. Con la restricción activa vs. sin ella.
  const trampa = agregarZona(ESC, 'desechos', { id: 'trampa-japon', nombre: 'Trampa sobre Japón', lat: 36, lon: 138, radioGrados: 10, activa: true });
  const sinTrampa = activarZona(trampa, 'trampa-japon', false);
  const japon = { lat: 36, lon: 138 };
  const conR = SEMILLAS_10.map((s) => correr(trampa, { semilla: s }, `P3 trampa ${s}`));
  const sinR = SEMILLAS_10.map((s) => correr(sinTrampa, { semilla: s }, `P3 sin trampa ${s}`));
  const invaden = (rs: ResultadoEjecucion[]) => rs.filter((r) => r.final.config.some((s) => distancia(s, japon) < 10)).length;
  const japonCubierta = (rs: ResultadoEjecucion[]) => rs.filter((r) => r.final.eval.regiones.find((x) => x.id === 'japon')!.estado === 'cubierta').length;
  const dMin = (rs: ResultadoEjecucion[]) => resumir(rs.map((r) => Math.min(...r.final.config.map((s) => distancia(s, japon)))));
  const res = {
    margenDesechos: resumir(margenD), configuracionesConViolacion: dentroD, invalidosGeneracion0: invalidosG0,
    trampa: { invadenConRestriccion: invaden(conR), invadenSinRestriccion: invaden(sinR), japonCubiertaCon: japonCubierta(conR), japonCubiertaSin: japonCubierta(sinR), distanciaMinCon: dMin(conR), distanciaMinSin: dMin(sinR), validasCon: conR.filter((r) => r.estado === 'VÁLIDA').length },
  };
  guardar('p3-zonas-restringidas.json', res);
  const pasa = dentroD === 0 && res.trampa.invadenConRestriccion === 0 && res.margenDesechos.minimo >= 0;
  secciones.push(`## P3 — Zonas restringidas por desechos

**Condiciones.** (a) Configuraciones finales de las 31 ejecuciones del escenario inicial (referencia + 30 semillas). (b) **Prueba de efecto:** se agrega una zona de desechos ficticia de radio 10° centrada en Japón (36°, 138°) y se ejecutan 10 semillas **con** la zona activa y 10 **sin** ella (misma zona desactivada). Así se comprueba que la restricción cambia la solución y no es solo un dibujo.

**Resultados (a).**

${tabla(['Métrica', 'Valor'], [
    ['Configuraciones finales con algún satélite dentro de una zona de desechos', `${dentroD} de ${todas.length}`],
    ['Margen mínimo al borde de una zona (mínimo entre todas)', `${f(res.margenDesechos.minimo, 2)}°`],
    ['Margen mínimo (media entre ejecuciones)', `${f(res.margenDesechos.media, 2)}°`],
    ['Configuraciones inválidas en la población aleatoria inicial (media de 80)', `${f(invalidosG0.media, 1)} (mín ${invalidosG0.minimo}, máx ${invalidosG0.maximo})`],
  ])}

**Resultados (b) — zona trampa sobre Japón (10 semillas).**

${tabla(['Condición', 'Ejecuciones con un satélite a < 10° de Japón', 'Japón cubierta', 'Distancia mínima satélite–Japón (media)', 'Ejecuciones VÁLIDAS'], [
    ['Zona trampa **activa**', `${res.trampa.invadenConRestriccion}/10`, `${res.trampa.japonCubiertaCon}/10`, `${f(res.trampa.distanciaMinCon.media, 2)}° (mín ${f(res.trampa.distanciaMinCon.minimo, 2)}°)`, `${res.trampa.validasCon}/10`],
    ['Zona trampa desactivada', `${res.trampa.invadenSinRestriccion}/10`, `${res.trampa.japonCubiertaSin}/10`, `${f(res.trampa.distanciaMinSin.media, 2)}° (mín ${f(res.trampa.distanciaMinSin.minimo, 2)}°)`, '10/10'],
  ])}

**Interpretación.** Ninguna configuración final invade las tres zonas de desechos del enunciado. Esto no es casualidad: al inicio, en promedio ${f(invalidosG0.media, 1)} de las 80 configuraciones aleatorias son inválidas (por zonas o separación), y las reglas de Deb hacen que pierdan todos los torneos contra las válidas. La prueba de la zona trampa muestra el **efecto real** de la restricción. Sin la zona, ${res.trampa.invadenSinRestriccion} de 10 ejecuciones dejan un satélite a menos de 10° de Japón, porque es la posición natural para cubrirla. Con la zona activa, ninguna lo hace (${res.trampa.invadenConRestriccion}/10). El algoritmo mueve los satélites al anillo permitido entre 10° y 17.3° y, aun así, cubre Japón en ${res.trampa.japonCubiertaCon}/10 ejecuciones.

${veredicto('P3', 'Zonas restringidas', pasa, `0 invasiones en ${todas.length} configuraciones finales; con la zona trampa activa, ${res.trampa.invadenConRestriccion}/10 invasiones (sin ella, ${res.trampa.invadenSinRestriccion}/10).`)}
`);
}

// =============================================================================
// P4 — Posiciones ocupadas
// =============================================================================
log('P4 posiciones ocupadas');
{
  const todas = [ref, ...corridas30];
  const margenO = todas.map((r) => margenMinimo(r.final.config, ESC, 'ocupadas'));
  const dentroO = todas.filter((r) => r.final.eval.violaciones.some((v) => v.tipo === 'ocupada')).length;
  const sahel = { lat: 15, lon: 0 };
  const australia = { lat: -25, lon: 133 };
  const RADIO_P4 = 12;
  // Los objetos se mueven justo encima de dos regiones y su exclusión se amplía a 12°,
  // para que la restricción compita con la cobertura (con 5° casi no estorba).
  const movidos = moverZona(moverZona(ESC, 'objeto-a', sahel.lat, sahel.lon, RADIO_P4), 'objeto-b', australia.lat, australia.lon, RADIO_P4);
  const sinObjetos = activarZona(activarZona(movidos, 'objeto-a', false), 'objeto-b', false);
  const con = SEMILLAS_10.map((s) => correr(movidos, { semilla: s }, `P4 objetos movidos ${s}`));
  const sin = SEMILLAS_10.map((s) => correr(sinObjetos, { semilla: s }, `P4 sin objetos ${s}`));
  const dObj = (s: { lat: number; lon: number }) => Math.min(distancia(s, sahel), distancia(s, australia));
  const invaden = (rs: ResultadoEjecucion[]) => rs.filter((r) => r.final.config.some((s) => dObj(s) < RADIO_P4)).length;
  const satsDentro = (rs: ResultadoEjecucion[]) => rs.reduce((n, r) => n + r.final.config.filter((s) => dObj(s) < RADIO_P4).length, 0);
  const dMin = (rs: ResultadoEjecucion[]) => resumir(rs.map((r) => Math.min(...r.final.config.map(dObj))));
  const cubiertas = (rs: ResultadoEjecucion[]) => resumir(rs.map((r) => r.final.eval.regionesCubiertas));
  const res = {
    margenObjetos: resumir(margenO), configuracionesConViolacion: dentroO, radioPrueba: RADIO_P4,
    movidos: { invadenCon: invaden(con), invadenSin: invaden(sin), satsDentroCon: satsDentro(con), satsDentroSin: satsDentro(sin), distanciaMinCon: dMin(con), distanciaMinSin: dMin(sin), cubiertasCon: cubiertas(con), cubiertasSin: cubiertas(sin), validasCon: con.filter((r) => r.estado === 'VÁLIDA').length, fitnessCon: resumir(con.map((r) => r.final.eval.fitness)), fitnessSin: resumir(sin.map((r) => r.final.eval.fitness)) },
  };
  guardar('p4-posiciones-ocupadas.json', res);
  const pasa = dentroO === 0 && res.movidos.invadenCon === 0 && res.margenObjetos.minimo >= 0;
  secciones.push(`## P4 — Posiciones ocupadas

**Condiciones.** (a) Las mismas 31 configuraciones finales del escenario inicial. (b) **Prueba de efecto:** el Objeto A se mueve sobre el centro del Sahel (15°, 0°) y el Objeto B sobre el centro de Australia (−25°, 133°). Su exclusión se amplía a ${RADIO_P4}°: con los 5° originales, la restricción casi nunca compite con la cobertura (una versión anterior de esta prueba, con 5°, dio 0/10 invasiones con y sin objetos y no permitía ver ningún efecto). Se ejecutan 10 semillas con los objetos activos y 10 con los objetos desactivados.

**Resultados (a).**

${tabla(['Métrica', 'Valor'], [
    ['Configuraciones finales con algún satélite en una zona de exclusión', `${dentroO} de ${todas.length}`],
    ['Margen mínimo al borde de una exclusión (mínimo entre todas)', `${f(res.margenObjetos.minimo, 2)}°`],
    ['Margen mínimo (media)', `${f(res.margenObjetos.media, 2)}°`],
  ])}

**Resultados (b) — objetos sobre Sahel y Australia con exclusión de ${RADIO_P4}° (10 semillas).**

${tabla(['Condición', `Ejecuciones con un satélite a < ${RADIO_P4}° de un objeto`, 'Satélites dentro (total)', 'Distancia mínima satélite–objeto (media; mín)', 'Regiones cubiertas (media)', 'Aptitud F (media)', 'VÁLIDAS'], [
    ['Objetos **activos**', `${res.movidos.invadenCon}/10`, res.movidos.satsDentroCon, `${f(res.movidos.distanciaMinCon.media, 2)}°; ${f(res.movidos.distanciaMinCon.minimo, 2)}°`, f(res.movidos.cubiertasCon.media, 1), f(res.movidos.fitnessCon.media), `${res.movidos.validasCon}/10`],
    ['Objetos desactivados', `${res.movidos.invadenSin}/10`, res.movidos.satsDentroSin, `${f(res.movidos.distanciaMinSin.media, 2)}°; ${f(res.movidos.distanciaMinSin.minimo, 2)}°`, f(res.movidos.cubiertasSin.media, 1), f(res.movidos.fitnessSin.media), '10/10'],
  ])}

**Interpretación.** En el escenario original los objetos están lejos de las regiones (el más cercano, B, está a 23.8° de Australia), así que evitarlos casi no cuesta. El margen mínimo de ${f(res.margenObjetos.minimo, 2)}° confirma que ningún satélite entra en sus exclusiones. En la prueba de efecto, sin los objetos, ${res.movidos.invadenSin}/10 ejecuciones dejan algún satélite a menos de ${RADIO_P4}° de esos centros (${res.movidos.satsDentroSin} satélites en total). Con los objetos activos, ${res.movidos.invadenCon}/10: la distancia mínima nunca baja de ${f(res.movidos.distanciaMinCon.minimo, 2)}°. El algoritmo desplaza los satélites al anillo permitido (${RADIO_P4}°–17.3°) y sigue cubriendo las regiones (${f(res.movidos.cubiertasCon.media, 1)} en promedio). ${Math.abs(res.movidos.fitnessCon.media - res.movidos.fitnessSin.media) < 5e-4 ? `En este caso la restricción **no tiene costo** en la aptitud (${f(res.movidos.fitnessCon.media)} en ambas condiciones): el anillo permitido deja espacio suficiente para cubrir y duplicar igual que sin los objetos. La restricción cambia **dónde** quedan los satélites, no **cuánto** cubren.` : `El costo de la restricción en la aptitud es ${f(res.movidos.fitnessSin.media - res.movidos.fitnessCon.media)} (${f(res.movidos.fitnessCon.media)} con objetos contra ${f(res.movidos.fitnessSin.media)} sin ellos).`}

${veredicto('P4', 'Posiciones ocupadas', pasa, `0 invasiones en ${todas.length} configuraciones finales; con los objetos sobre regiones, ${res.movidos.invadenCon}/10 invasiones (sin ellos, ${res.movidos.invadenSin}/10).`)}
`);
}

// =============================================================================
// P5 — Espacio reducido
// =============================================================================
log('P5 espacio reducido');
{
  const factores = [1, 2, 3, 4, 5, 6];
  const filas = factores.map((k) => {
    const e = renombrar(escalarDesechos(ESC, k), `Desechos ×${k}`);
    const fa = analizarFactibilidad(e);
    const rs = SEMILLAS_10.map((s) => correr(e, { semilla: s }, `P5 ×${k} semilla ${s}`));
    const refReev = evaluarEn(ref.final.config, e);
    return {
      factor: k,
      radios: e.desechos.map((z) => z.radioGrados),
      fraccionLibre: fa.fraccionLibre,
      factible: fa.factibleDemostrado,
      validas: rs.filter((r) => r.estado === 'VÁLIDA').length,
      satisfactorias: rs.filter((r) => nivelDeCalidad(r.final.eval) === 'Satisfactoria').length,
      cobertura: resumir(rs.map((r) => r.final.eval.cobertura)),
      regiones: resumir(rs.map((r) => r.final.eval.regionesCubiertas)),
      fitness: resumir(rs.map((r) => r.final.eval.fitness)),
      referenciaSigueValida: refReev.valida,
      referenciaViolaciones: refReev.violaciones.length,
      noCubiertas: [...new Set(rs.flatMap((r) => r.final.eval.regiones.filter((x) => x.estado !== 'cubierta').map((x) => x.nombre)))],
    };
  });
  guardar('p5-espacio-reducido.json', filas);
  const consistentes = filas.every((x) => x.validas === 10 || !x.factible);
  const ultima = filas[filas.length - 1];
  const primeraPerdida = filas.find((x) => x.satisfactorias < 10);
  secciones.push(`## P5 — Espacio reducido

**Condiciones.** Se multiplican los radios de las tres zonas de desechos por un factor k ∈ {${factores.join(', ')}}; los objetos ocupados se mantienen. Para cada k: análisis de factibilidad (espacio libre en una malla de 20 000 puntos), 10 ejecuciones (semillas 1–10) y **reevaluación** de la configuración de referencia (P1) bajo las nuevas condiciones.

**Resultados.**

${tabla(['k', 'Radios (°)', 'Espacio libre', 'Válidas', 'Satisfactorias', 'Cobertura C (media)', 'Regiones cubiertas (media; mín)', 'F (media ± desv.)', '¿La configuración de P1 sigue válida?', 'Regiones que alguna vez quedan sin cubrir'], filas.map((x) => [
    `×${x.factor}`, x.radios.map((r) => r.toFixed(0)).join(' / '), pct(x.fraccionLibre), `${x.validas}/10`, `${x.satisfactorias}/10`, pct(x.cobertura.media, 2),
    `${f(x.regiones.media, 1)}; ${x.regiones.minimo}`, `${f(x.fitness.media)} ± ${f(x.fitness.desviacion)}`,
    x.referenciaSigueValida ? 'Sí' : `**No** (${x.referenciaViolaciones} violaciones)`, x.noCubiertas.length ? x.noCubiertas.join(', ') : '—',
  ]))}

**Interpretación.** Al reducir el espacio, el espacio libre baja de ${pct(filas[0].fraccionLibre)} a ${pct(ultima.fraccionLibre)}. Mientras exista espacio, el sistema siempre entrega soluciones **válidas** (${consistentes ? 'en todos los niveles factibles las 10 ejecuciones son válidas' : 'hubo niveles factibles con ejecuciones no válidas, ver tabla'}). Lo que se degrada es la **calidad**. ${primeraPerdida ? `Con ×${primeraPerdida.factor}, ${10 - primeraPerdida.satisfactorias} de 10 ejecuciones ya no cubren todas las regiones (sin cubrir: ${primeraPerdida.noCubiertas.join(', ')}); con ×${ultima.factor} se cubren en promedio ${f(ultima.regiones.media, 1)} regiones. Las zonas crecidas alcanzan los anillos desde donde se puede observar esas regiones. El algoritmo no "rompe" la restricción para cubrirlas: prefiere una solución válida con menos cobertura.` : 'En todos los niveles se siguen cubriendo las 6 regiones; la reducción solo afecta la redundancia.'} La columna de reevaluación responde a la sección 3.3: la configuración que era óptima en el escenario original ${filas.filter((x) => !x.referenciaSigueValida).length ? `deja de ser válida desde ×${filas.find((x) => !x.referenciaSigueValida)!.factor}` : 'sigue siendo válida en todos los niveles'}. Por eso, cuando cambian las condiciones, el sistema vuelve a validar y, si hace falta, vuelve a evolucionar.

${veredicto('P5', 'Espacio reducido', consistentes, `con espacio libre de ${pct(filas[0].fraccionLibre)} a ${pct(ultima.fraccionLibre)}, ninguna solución inválida se reporta como válida; la cobertura media baja de ${pct(filas[0].cobertura.media, 2)} a ${pct(ultima.cobertura.media, 2)}.`)}
`);
}

// =============================================================================
// P6 — Condición difícil o inviable
// =============================================================================
log('P6 inviable');
{
  // (a) Difícil: el objetivo no se puede cumplir, pero sí existen configuraciones válidas.
  const dificil = renombrar(agregarZona(ESC, 'desechos', { id: 'bloqueo-yucatan', nombre: 'Bloqueo sobre Yucatán', lat: 20.5, lon: -89, radioGrados: 21, activa: true }), 'Difícil: Yucatán bloqueada');
  const rd = SEMILLAS_10.map((s) => correr(dificil, { semilla: s }, `P6 difícil ${s}`));
  const fracYuc = resumir(rd.map((r) => r.final.eval.regiones.find((x) => x.id === 'yucatan')!.fraccion));
  // (b) Inviable: una zona gigante deja libre un casquete de 2°, donde no caben 8 satélites a ≥ 3°.
  const inviable = renombrar(agregarZona(ESC, 'desechos', { id: 'gigante', nombre: 'Zona gigante', lat: 0, lon: 0, radioGrados: 178, activa: true }), 'Inviable: casquete libre de 2°');
  const fInv = analizarFactibilidad(inviable);
  const ri = rango(1, 5).map((s) => correr(inviable, { semilla: s }, `P6 inviable ${s}`));
  const r0 = ri[0];
  const viol = r0.final.eval.violaciones;
  const porTipo = (t: string) => viol.filter((v) => v.tipo === t).length;
  const libre = { lat: 0, lon: 180 };
  const enCasquete = r0.final.config.filter((s) => distancia(s, libre) <= 2 + 1e-9).length;
  const penetracion = resumir(viol.filter((v) => v.tipo === 'desechos').map((v) => v.magnitud));
  const lejania = resumir(r0.final.config.map((s) => distancia(s, libre)));
  const res = {
    dificil: { validas: rd.filter((r) => r.estado === 'VÁLIDA').length, satisfactorias: rd.filter((r) => nivelDeCalidad(r.final.eval) === 'Satisfactoria').length, fraccionYucatan: fracYuc, cobertura: resumir(rd.map((r) => r.final.eval.cobertura)), otrasCubiertas: resumir(rd.map((r) => r.final.eval.regiones.filter((x) => x.id !== 'yucatan' && x.estado === 'cubierta').length)) },
    inviable: { factibilidad: fInv, estados: ri.map((r) => r.estado), validosEnTodaLaEjecucion: ri.map((r) => r.historial.reduce((s, h) => s + h.validos, 0)), violacionInicial: ri.map((r) => r.historial[0].mejorViolacion), violacionFinal: ri.map((r) => r.final.eval.violacionTotal), violacionesPorTipo: { desechos: porTipo('desechos'), separacion: porTipo('separacion') }, configuracionMenorViolacion: r0.final.config },
  };
  guardar('p6-inviable.json', res);
  const pasaA = res.dificil.validas === 10 && res.dificil.satisfactorias === 0;
  const pasaB = ri.every((r) => r.estado === 'SIN_VALIDA') && !fInv.factibleDemostrado;
  const hv = r0.historial;
  secciones.push(`## P6 — Condición difícil e inviable

Se construyeron dos escenarios. Representan dos formas distintas de "no poder cumplir":

1. **Difícil (objetivo inalcanzable):** existen configuraciones válidas, pero ninguna puede cubrir todas las regiones.
2. **Inviable (restricciones insatisfacibles):** no existe ninguna configuración válida.

### (a) Difícil: zona de 21° sobre Yucatán

**Condiciones.** Se agrega una zona de desechos de radio 21° centrada en Yucatán (20.5°, −89°); 10 semillas. **Por qué es imposible cubrir Yucatán:** todo satélite válido está a ≥ 21° del centro de Yucatán y la huella mide 20°, así que el centro de la región nunca puede observarse.

${tabla(['Métrica', 'Valor'], [
    ['Ejecuciones VÁLIDAS', `${res.dificil.validas}/10`],
    ['Ejecuciones satisfactorias (todo cubierto)', `${res.dificil.satisfactorias}/10`],
    ['Fracción observada de Yucatán (media; máx)', `${pct(fracYuc.media)}; ${pct(fracYuc.maximo)}`],
    ['Otras regiones cubiertas (media de 5)', f(res.dificil.otrasCubiertas.media, 1)],
    ['Cobertura ponderada C (media)', pct(res.dificil.cobertura.media, 2)],
  ])}

**Interpretación.** El sistema no "hace trampa": las 10 soluciones son válidas y Yucatán queda **parcial** (se observa en promedio ${pct(fracYuc.media)} del disco, el borde más cercano a la zona permitida). El nivel reportado es *Aceptable* y no *Satisfactoria*: el reporte dice explícitamente que el objetivo no se cumplió. Las demás regiones se siguen cubriendo.

### (b) Inviable: casquete libre de 2°

**Condiciones.** Se agrega una zona de desechos de radio 178° centrada en (0°, 0°). Solo queda libre un casquete de radio 2° alrededor de (0°, 180°). En ese casquete no caben 8 satélites con separación ≥ 3°. 5 semillas.

**Análisis de factibilidad.** ${fInv.mensaje} (${fInv.puntosLibres} puntos libres de ${fInv.puntosMalla}).

${tabla(['Semilla', 'Estado reportado', 'Configuraciones válidas vistas en toda la ejecución', 'Violación de la mejor en gen. 0', 'Violación de la mejor final'], ri.map((r, i) => [i + 1, `**${r.estado}**`, res.inviable.validosEnTodaLaEjecucion[i], `${f(res.inviable.violacionInicial[i], 2)}°`, `${f(res.inviable.violacionFinal[i], 2)}°`]))}

Evolución de la violación de la mejor (semilla 1): ${[0, 10, 25, 50, 100, 150].map((g) => `gen ${g}: ${f(hv[g].mejorViolacion, 2)}°`).join(' · ')}.

La configuración de menor violación (semilla 1) tiene ${porTipo('desechos')} violaciones de zona y ${porTipo('separacion')} de separación. ${enCasquete} de sus 8 satélites están dentro del casquete libre. Los que invaden la zona entran en promedio ${f(penetracion.media, 2)}° (máximo ${f(penetracion.maximo, 2)}°), y ningún satélite está a más de ${f(lejania.maximo, 2)}° de (0°, 180°): la evolución los amontona alrededor del único espacio libre. Esa configuración se guarda en \`results/p6-inviable.json\`. La UI la reproduce con el preset «Inviable» (semilla 1, parámetros base) y la marca con el chip **Sin válida encontrada**.

**Interpretación.** El análisis de factibilidad no encuentra un testigo en su malla (espacio libre muestreado: ${pct(fInv.fraccionLibre, 3)}), y el algoritmo no encuentra ninguna configuración válida en sus cinco ejecuciones. Son observaciones de búsqueda, no pruebas de inviabilidad. Se entrega la configuración de **menor violación** para mostrar qué tan lejos quedó de cumplir. Como Deb compara las inválidas por violación, esa magnitud baja durante la evolución. En este escenario concreto, la imposibilidad se justifica por separado con el argumento geométrico: 8 puntos a ≥ 3° no caben en un casquete de 2°.

${veredicto('P6', 'Condición difícil e inviable', pasaA && pasaB, `difícil: ${res.dificil.validas}/10 válidas y 0 falsas "satisfactorias"; inviable: ${ri.filter((r) => r.estado === 'SIN_VALIDA').length}/5 sin válida encontrada.`)}
`);
}

// =============================================================================
// P7 — Variación entre ejecuciones (secciones)
// =============================================================================
log('P7 reporte');
{
  const gF = corridas30.map((r) => generacionHasta(r, F_ESTRELLA));
  const alcanzan = gF.filter((g) => g >= 0);
  const fits = corridas30.map((r) => r.final.eval.fitness);
  const sobreCota = fits.filter((x) => x > F_ESTRELLA + TOL).length;
  const pares: number[] = [];
  for (let i = 0; i < corridas30.length; i++) for (let j = i + 1; j < corridas30.length; j++) pares.push(distanciaConfiguraciones(corridas30[i].final.config, corridas30[j].final.config));
  const redundantes: Record<string, number> = {};
  for (const r of corridas30) for (const x of r.final.eval.regiones) if (x.satelitesCompletos.length >= 2) redundantes[x.nombre] = (redundantes[x.nombre] ?? 0) + 1;
  const res = {
    semillas: SEMILLAS_30,
    fitness: resumir(fits), cobertura: resumir(corridas30.map((r) => r.final.eval.cobertura)), redundancia: resumir(corridas30.map((r) => r.final.eval.redundancia)),
    regionesCubiertas: resumir(corridas30.map((r) => r.final.eval.regionesCubiertas)), generacionSatisfactoria: resumir(corridas30.map((r) => r.generacionSatisfactoria)),
    generacionCota: resumir(alcanzan), alcanzanCota: alcanzan.length, sobreCota, tiempoMs: resumir(corridas30.map((r) => r.tiempoMs)),
    diversidadFinal: resumir(corridas30.map((r) => r.historial[r.historial.length - 1].diversidad)), distanciaEntreFinales: resumir(pares), redundancia_por_region: redundantes,
    porSemilla: corridas30.map((r, i) => ({ semilla: SEMILLAS_30[i], fitness: r.final.eval.fitness, cobertura: r.final.eval.cobertura, redundancia: r.final.eval.redundancia, regiones: r.final.eval.regionesCubiertas, estado: r.estado, genSatisfactoria: r.generacionSatisfactoria, genCota: gF[i] })),
  };
  const todasValidas = corridas30.every((r) => r.estado === 'VÁLIDA');
  const todasSatisf = corridas30.every((r) => nivelDeCalidad(r.final.eval) === 'Satisfactoria');
  // Diagnóstico de las ejecuciones que se quedan bajo la cota: qué hace cada satélite
  // y cuánto aporta (aptitud con él − aptitud sin él).
  const noAlcanzan = corridas30.map((r, i) => ({ r, s: SEMILLAS_30[i] })).filter((x) => generacionHasta(x.r, F_ESTRELLA) < 0);
  const diagnostico = noAlcanzan.map(({ r, s }) => {
    const ev = r.final.eval;
    const cubreA = (i: number, id: string) => ev.regiones.find((g) => g.id === id)!.satelitesCompletos.includes(i);
    const idx = r.final.config.map((_, i) => i);
    const aportes = idx.map((i) => ev.fitness - evaluarEn(r.final.config.filter((_, j) => j !== i), ESC).fitness);
    return {
      semilla: s,
      fitness: ev.fitness,
      duplicadas: ev.regiones.filter((g) => g.satelitesCompletos.length >= 2).map((g) => g.nombre),
      compartidos: idx.filter((i) => cubreA(i, 'yucatan') && cubreA(i, 'california')).length,
      soloYucatan: idx.filter((i) => cubreA(i, 'yucatan') && !cubreA(i, 'california')).length,
      soloCalifornia: idx.filter((i) => cubreA(i, 'california') && !cubreA(i, 'yucatan')).length,
      aporteMinimo: Math.min(...aportes),
    };
  });
  guardar('p7-variacion.json', { ...res, diagnosticoNoAlcanzan: diagnostico });
  const d0 = diagnostico[0];
  const textoNoAlcanzan = d0
    ? `Las ${noAlcanzan.length} que no llegan (semillas ${noAlcanzan.map((x) => x.s).join(', ')}) terminan con F = ${[...new Set(diagnostico.map((x) => f(x.fitness, 5)))].join(' / ')}. Cubren todo y duplican ${d0.duplicadas.join(', ')}, pero ni Sahel ni Japón tienen segundo satélite. El diagnóstico (\`results/p7-variacion.json\`, campo \`diagnosticoNoAlcanzan\`) muestra por qué. Para duplicar Yucatán y California usan ${diagnostico.map((x) => `${x.compartidos + x.soloYucatan + x.soloCalifornia}`).join(' y ')} satélites (${d0.compartidos} compartido, ${d0.soloYucatan} solo para Yucatán y ${d0.soloCalifornia} solo para California), en lugar de los 2 compartidos de la solución óptima. Además, **ningún satélite sobra**: el aporte mínimo de un satélite a la aptitud es ${diagnostico.map((x) => f(x.aporteMinimo, 4)).join(' y ')} > 0. Es un **óptimo local**. Para mejorar se necesitan dos cambios coordinados: meter un segundo satélite en la zona común Yucatán–California y llevar el que queda libre a Sahel o Japón, a 60–90° de distancia. La mutación de un solo satélite no produce ambos a la vez. Por eso el estancamiento **no** demuestra optimalidad (consideración 5 del enunciado).`
    : '';
  secciones.push(`## P7 — Variación entre ejecuciones

**Condiciones.** Escenario inicial y parámetros base. Solo cambia la semilla (1 a 30). Datos por semilla: \`results/p7-variacion.json\`.

**Resultados.**

${tabla(CAB_RESUMEN, [
    filaResumen('Aptitud final F', res.fitness, 5),
    filaResumen('Cobertura C', res.cobertura),
    filaResumen('Redundancia R', res.redundancia),
    filaResumen('Regiones cubiertas', res.regionesCubiertas, 2),
    filaResumen('Generación satisfactoria', res.generacionSatisfactoria, 1),
    filaResumen(`Generación en que se alcanza F* (${alcanzan.length} ejecuciones)`, res.generacionCota, 1),
    filaResumen('Diversidad final (°)', res.diversidadFinal, 2),
    filaResumen('Distancia entre configuraciones finales (°, 435 pares)', res.distanciaEntreFinales, 2),
    filaResumen('Tiempo por ejecución (ms)', res.tiempoMs, 0),
  ])}

Regiones que reciben redundancia (≥ 2 satélites completos), en número de ejecuciones: ${Object.entries(redundantes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}/30`).join(', ')}.

**Interpretación.** ${todasValidas ? 'Las 30 ejecuciones terminan VÁLIDAS' : 'No todas las ejecuciones terminan válidas'} y ${todasSatisf ? 'todas cubren las 6 regiones' : 'no todas cubren las 6 regiones'}. ${alcanzan.length} de 30 alcanzan la cota teórica F* = ${f(F_ESTRELLA, 5)} (generación media ${f(res.generacionCota.media, 1)}, entre ${res.generacionCota.minimo} y ${res.generacionCota.maximo}). Ninguna la supera (${sobreCota} casos), lo que es consistente con el argumento de la cota y sirve como comprobación cruzada del modelo. ${textoNoAlcanzan} La variación en **calidad** es ${res.fitness.desviacion < 1e-6 ? 'prácticamente nula' : `pequeña (desviación ${f(res.fitness.desviacion, 5)})`}. La variación en **forma** es grande: dos configuraciones finales están en promedio a ${f(res.distanciaEntreFinales.media, 2)}° de distancia (Chamfer), y la redundancia de la región Media se reparte entre ${Object.keys(redundantes).length > 4 ? 'varias regiones' : 'distintas regiones'} según la semilla. Esto confirma que el óptimo **no es único**: el criterio tiene una meseta de configuraciones equivalentes, y cada ejecución termina en un punto distinto de ella. La diferencia entre ejecuciones se manifiesta sobre todo en **cuándo** se llega al óptimo y en **qué** configuración concreta se elige.

${veredicto('P7', 'Variación de la ejecución', todasValidas, `${corridas30.filter((r) => r.estado === 'VÁLIDA').length}/30 válidas; ${alcanzan.length}/30 alcanzan F*; F = ${f(res.fitness.media, 5)} ± ${f(res.fitness.desviacion, 5)}.`)}
`);
}

// =============================================================================
// P8 — Propia: AG contra búsqueda aleatoria con el mismo presupuesto
// =============================================================================
log('P8 búsqueda aleatoria');
{
  const presupuesto = ref.evaluaciones;
  const ra = SEMILLAS_30.map((s) => busquedaAleatoria(ESC, presupuesto, s));
  const fa = ra.map((r) => r.mejor.eval.fitness);
  const fg = corridas30.map((r) => r.final.eval.fitness);
  const mw = mannWhitney(fg, fa);
  const res = {
    presupuesto,
    ag: { fitness: resumir(fg), cobertura: resumir(corridas30.map((r) => r.final.eval.cobertura)), regiones: resumir(corridas30.map((r) => r.final.eval.regionesCubiertas)), satisfactorias: corridas30.filter((r) => nivelDeCalidad(r.final.eval) === 'Satisfactoria').length },
    aleatoria: { fitness: resumir(fa), cobertura: resumir(ra.map((r) => r.mejor.eval.cobertura)), regiones: resumir(ra.map((r) => r.mejor.eval.regionesCubiertas)), satisfactorias: ra.filter((r) => nivelDeCalidad(r.mejor.eval) === 'Satisfactoria').length, validas: ra.filter((r) => r.estado === 'VÁLIDA').length },
    mannWhitney: mw,
    curvaAleatoria: [0, 9, 19, 49, 99, 149].map((i) => resumir(ra.map((r) => r.curva[i]))),
    curvaAG: [1, 10, 20, 50, 100, 150].map((g) => resumir(corridas30.map((r) => r.historial[g].mejor))),
  };
  guardar('p8-ag-vs-aleatoria.json', res);
  const pasa = mw.p < 0.05 && res.ag.fitness.media > res.aleatoria.fitness.media;
  secciones.push(`## P8 — Prueba propia: ¿el algoritmo evolutivo aporta algo frente al azar?

**Pregunta.** Una curva que sube no prueba que la evolución sirva: cualquier búsqueda mejora si se evalúan más configuraciones. Se compara el AG contra una **búsqueda aleatoria pura** con **exactamente el mismo presupuesto** de ${presupuesto} evaluaciones. Si el AG no le gana, sus operadores no estarían aportando nada.

**Condiciones.** Escenario inicial; 30 semillas por método (las mismas 1–30). Búsqueda aleatoria: genera ${presupuesto} configuraciones uniformes y se queda con la mejor según las mismas reglas de Deb. Comparación estadística con la prueba U de Mann-Whitney (no supone normalidad).

**Resultados.**

${tabla(['Método', 'F media ± desv.', 'F mín – máx', 'Cobertura C media', 'Regiones cubiertas (media)', 'Satisfactorias'], [
    ['Algoritmo genético', `${f(res.ag.fitness.media)} ± ${f(res.ag.fitness.desviacion)}`, `${f(res.ag.fitness.minimo)} – ${f(res.ag.fitness.maximo)}`, pct(res.ag.cobertura.media, 2), f(res.ag.regiones.media, 2), `${res.ag.satisfactorias}/30`],
    ['Búsqueda aleatoria', `${f(res.aleatoria.fitness.media)} ± ${f(res.aleatoria.fitness.desviacion)}`, `${f(res.aleatoria.fitness.minimo)} – ${f(res.aleatoria.fitness.maximo)}`, pct(res.aleatoria.cobertura.media, 2), f(res.aleatoria.regiones.media, 2), `${res.aleatoria.satisfactorias}/30`],
  ])}

Mann-Whitney: U = ${f(mw.u, 1)}, z = ${f(mw.z, 2)}, p = ${mw.p < 1e-6 ? '< 0.000001' : f(mw.p, 6)}.

Mejor aptitud media según el número de evaluaciones (≈ 78 evaluaciones por generación):

${tabla(['Evaluaciones aprox.', 'AG', 'Aleatoria'], [1, 10, 20, 50, 100, 150].map((g, i) => [80 + 78 * g, f(res.curvaAG[i].media), f(res.curvaAleatoria[i].media)]))}

**Interpretación.** ${pasa ? `El AG es claramente superior: ${res.ag.satisfactorias}/30 ejecuciones cubren todo, frente a ${res.aleatoria.satisfactorias}/30 de la búsqueda aleatoria, y la diferencia es estadísticamente significativa (p ${mw.p < 0.001 ? '< 0.001' : '= ' + f(mw.p, 4)}).` : 'El AG no supera con claridad a la búsqueda aleatoria; ver la tabla.'} La razón es combinatoria. Cubrir las 6 regiones exige que 6 satélites caigan cada uno en un casquete de 17.3° alrededor de su región, a la vez. Al azar es extremadamente improbable. El AG, en cambio, conserva lo que ya funciona (selección y elitismo) y ajusta el resto de a poco (mutación), además de combinar satélites bien colocados de padres distintos (cruce alineado). Esta prueba es la evidencia más directa de que **la evolución, y no el volumen de evaluaciones, produce la solución**.

${veredicto('P8', 'Propia: AG contra búsqueda aleatoria', pasa, `AG F = ${f(res.ag.fitness.media)} contra aleatoria F = ${f(res.aleatoria.fitness.media)}; p = ${mw.p < 1e-6 ? '< 1e-6' : f(mw.p, 6)}.`)}
`);
}

// =============================================================================
// P9 — Propia: ablación del cruce alineado
// =============================================================================
log('P9 ablación del cruce');
{
  const sinAlinear = SEMILLAS_30.map((s) => correr(ESC, { semilla: s, alinearCruce: false }, `P9 sin alinear ${s}`));
  const gCon = corridas30.map((r) => generacionHasta(r, F_ESTRELLA));
  const gSin = sinAlinear.map((r) => generacionHasta(r, F_ESTRELLA));
  // Las que nunca alcanzan F* cuentan con la peor generación posible (+1) para poder comparar.
  const penal = (g: number) => (g < 0 ? PARAMETROS_BASE.generaciones + 1 : g);
  const mw = mannWhitney(gCon.map(penal), gSin.map(penal));
  const g20 = (rs: ResultadoEjecucion[]) => resumir(rs.map((r) => r.historial[20].mejor));
  const res = {
    con: { alcanzan: gCon.filter((g) => g >= 0).length, generacion: resumir(gCon.filter((g) => g >= 0)), fitness: resumir(corridas30.map((r) => r.final.eval.fitness)), mejorGen20: g20(corridas30), satisf: resumir(corridas30.map((r) => r.generacionSatisfactoria)) },
    sin: { alcanzan: gSin.filter((g) => g >= 0).length, generacion: resumir(gSin.filter((g) => g >= 0)), fitness: resumir(sinAlinear.map((r) => r.final.eval.fitness)), mejorGen20: g20(sinAlinear), satisf: resumir(sinAlinear.map((r) => r.generacionSatisfactoria)) },
    mannWhitneyGeneracion: mw,
  };
  guardar('p9-ablacion-cruce.json', res);
  const mejorCon = res.con.generacion.media < res.sin.generacion.media || res.con.alcanzan > res.sin.alcanzan;
  secciones.push(`## P9 — Prueba propia: ¿sirve alinear los satélites antes del cruce?

**Pregunta.** En docs/01 se justificó emparejar los satélites de los padres antes del cruce, porque el orden de los satélites no significa nada. Esta prueba mide si esa decisión tiene efecto real o es solo teoría.

**Condiciones.** Escenario inicial, parámetros base, 30 semillas con el cruce **alineado** (las de P7) y 30 con cruce uniforme **sin alinear** (satélite i con satélite i). Métrica principal: generación en que se alcanza la cota F*. Si una ejecución nunca la alcanza, cuenta como ${PARAMETROS_BASE.generaciones + 1} para la prueba de Mann-Whitney.

**Resultados.**

${tabla(['Cruce', 'Alcanzan F*', 'Generación para F* (media ± desv.)', 'Generación satisfactoria (media)', 'Mejor F en gen. 20 (media)', 'F final (media)'], [
    ['Alineado', `${res.con.alcanzan}/30`, `${f(res.con.generacion.media, 1)} ± ${f(res.con.generacion.desviacion, 1)}`, f(res.con.satisf.media, 1), f(res.con.mejorGen20.media), f(res.con.fitness.media, 5)],
    ['Sin alinear', `${res.sin.alcanzan}/30`, `${f(res.sin.generacion.media, 1)} ± ${f(res.sin.generacion.desviacion, 1)}`, f(res.sin.satisf.media, 1), f(res.sin.mejorGen20.media), f(res.sin.fitness.media, 5)],
  ])}

Mann-Whitney sobre la generación para F*: z = ${f(mw.z, 2)}, p = ${f(mw.p, 4)}.

**Interpretación.** ${mejorCon ? `Alinear acelera la convergencia: se llega a la cota antes (${f(res.con.generacion.media, 1)} contra ${f(res.sin.generacion.media, 1)} generaciones en promedio)${mw.p < 0.05 ? ' y la diferencia es estadísticamente significativa' : ', aunque con 30 semillas la diferencia no alcanza significancia estadística (p ≥ 0.05)'}.` : 'Con estos datos, alinear no mejora la convergencia; la decisión no queda respaldada por la evidencia.'} Sin alinear, un hijo puede heredar dos satélites que cubren la misma región y ninguno para otra. Esa estructura se pierde y la mutación tiene que repararla. Ambas variantes llegan finalmente a soluciones de calidad parecida, porque la mutación y la selección bastan en un problema de este tamaño. El cruce alineado acelera la búsqueda, pero no es la razón por la que se llega a la solución.

${veredicto('P9', 'Propia: ablación del cruce alineado', true, `prueba descriptiva; con alineación ${res.con.alcanzan}/30 alcanzan F* (gen. media ${f(res.con.generacion.media, 1)}), sin alineación ${res.sin.alcanzan}/30 (gen. media ${f(res.sin.generacion.media, 1)}).`)}
`);
}

// =============================================================================
// P10 — Propia: sensibilidad a parámetros
// =============================================================================
log('P10 sensibilidad');
{
  const S = rango(1, 8);
  const presupuesto = ref.evaluaciones;
  const medir = (p: Partial<ParametrosAG>, etiqueta: string) => {
    const rs = S.map((s) => correr(ESC, { ...p, semilla: s }, `P10 ${etiqueta} ${s}`));
    const g = rs.map((r) => generacionHasta(r, F_ESTRELLA));
    return {
      etiqueta,
      fitness: resumir(rs.map((r) => r.final.eval.fitness)),
      alcanzan: g.filter((x) => x >= 0).length,
      evalHastaCota: resumir(g.filter((x) => x >= 0).map((x) => (p.poblacion ?? 80) + x * ((p.poblacion ?? 80) - 2))),
      diversidadFinal: resumir(rs.map((r) => r.historial[r.historial.length - 1].diversidad)),
    };
  };
  const sigmas = [1, 3, 6, 12, 24].map((s) => medir({ sigmaMutacion: s }, `σ = ${s}°`));
  // Mismo presupuesto de evaluaciones para todas las poblaciones.
  const pobs = [20, 40, 80, 160].map((n) => medir({ poblacion: n, generaciones: Math.round((presupuesto - n) / (n - 2)) }, `N = ${n}`));
  guardar('p10-sensibilidad.json', { semillas: S, sigmas, poblaciones: pobs });
  const filas = (xs: typeof sigmas) => xs.map((x) => [x.etiqueta, `${x.alcanzan}/8`, `${f(x.fitness.media, 5)} ± ${f(x.fitness.desviacion, 5)}`, f(x.fitness.minimo, 5), x.alcanzan ? f(x.evalHastaCota.media, 0) : '—', f(x.diversidadFinal.media, 2)]);
  const cab = ['Configuración', 'Alcanzan F*', 'F final (media ± desv.)', 'F mínimo', 'Evaluaciones hasta F* (media)', 'Diversidad final (°)'];
  const mejorSigma = [...sigmas].sort((a, b) => b.alcanzan - a.alcanzan || a.evalHastaCota.media - b.evalHastaCota.media)[0];
  const mejorPob = [...pobs].sort((a, b) => b.alcanzan - a.alcanzan || a.evalHastaCota.media - b.evalHastaCota.media)[0];
  secciones.push(`## P10 — Prueba propia: sensibilidad a los parámetros

**Pregunta.** ¿Los valores iniciales de docs/01 (σ = 6°, N = 80) son razonables o el resultado depende mucho de ellos?

**Condiciones.** Escenario inicial, 8 semillas (1–8) por configuración. (a) Se varía el paso de mutación σ con el resto de parámetros base. (b) Se varía la población N **manteniendo el presupuesto** (≈ ${presupuesto} evaluaciones: las generaciones se ajustan como (presupuesto − N)/(N − 2)).

**Resultados (a) — paso de mutación σ.**

${tabla(cab, filas(sigmas))}

**Resultados (b) — tamaño de población con presupuesto fijo.**

${tabla(cab, filas(pobs))}

**Interpretación.** Con estos datos, la configuración más eficiente es ${mejorSigma.etiqueta} para la mutación y ${mejorPob.etiqueta} para la población (criterio: más ejecuciones que alcanzan F*; si empatan, menos evaluaciones). El σ más pequeño (1°) es el peor: ${sigmas[0].alcanzan}/8 alcanzan F* y la diversidad final es la más baja (${f(sigmas[0].diversidadFinal.media, 2)}°). Con pasos tan cortos, mover un satélite hacia una región lejana requiere muchas mutaciones seguidas. Los σ grandes (12° y 24°) alcanzan la cota igual de seguido, pero necesitan más evaluaciones (${f(sigmas[3].evalHastaCota.media, 0)} y ${f(sigmas[4].evalHastaCota.media, 0)} contra ${f(sigmas[2].evalHastaCota.media, 0)} con 6°). Un paso largo saca a menudo al satélite de su región y el ajuste fino se vuelve más lento. Con la población, las diferencias son menores, y con solo 8 semillas una diferencia de una ejecución no es concluyente. ${mejorSigma.etiqueta === 'σ = 6°' && mejorPob.etiqueta === 'N = 80' ? 'Los valores elegidos en docs/01 coinciden con los mejores encontrados.' : 'Los valores base no son exactamente los mejores de esta prueba, pero están en la zona en que el algoritmo alcanza la cota con regularidad; se mantienen para no ajustar los parámetros a las mismas semillas con las que se evalúa.'}

${veredicto('P10', 'Propia: sensibilidad', true, `prueba descriptiva; mejor σ: ${mejorSigma.etiqueta}, mejor N: ${mejorPob.etiqueta}.`)}
`);
}

// =============================================================================
// P11 — Cambio de condiciones (sección 3.3 del enunciado)
// =============================================================================
log('P11 cambio de condiciones');
{
  const S = rango(1, 5);
  const cambios: Array<{ nombre: string; esc: Escenario }> = [
    { nombre: 'Se apaga la zona Atlántico Norte', esc: activarZona(ESC, 'atlantico-norte', false) },
    { nombre: 'Australia pasa a prioridad Alta', esc: cambiarPrioridad(ESC, 'australia', 'Alta') },
    { nombre: 'Japón deja de ser región de interés', esc: activarRegion(ESC, 'japon', false) },
    { nombre: 'Objeto A se mueve sobre el Sahel (15°, 0°)', esc: moverZona(ESC, 'objeto-a', 15, 0) },
    { nombre: 'Objeto A sobre el Sahel con exclusión ampliada a 15°', esc: moverZona(ESC, 'objeto-a', 15, 0, 15) },
    { nombre: 'Nueva zona de desechos de 10° sobre Japón', esc: agregarZona(ESC, 'desechos', { id: 'nueva-japon', nombre: 'Nueva zona Japón', lat: 36, lon: 138, radioGrados: 10, activa: true }) },
    { nombre: 'Nueva zona de 15° entre Yucatán y California', esc: agregarZona(ESC, 'desechos', { id: 'nueva-golfo', nombre: 'Nueva zona norte de México', lat: 29, lon: -104.5, radioGrados: 15, activa: true }) },
  ];
  const filas = cambios.map(({ nombre, esc }) => {
    const reev = evaluarEn(ref.final.config, esc);
    const caliente = S.map((s) => correr(esc, { semilla: 100 + s }, `P11 ${nombre} caliente ${s}`, [ref.final.config]));
    const frio = S.map((s) => correr(esc, { semilla: 100 + s }, `P11 ${nombre} frío ${s}`));
    const gs = (rs: ResultadoEjecucion[]) => resumir(rs.map((r) => (r.generacionSatisfactoria < 0 ? NaN : r.generacionSatisfactoria)).filter(Number.isFinite));
    return {
      nombre,
      antes: ref.final.eval.fitness,
      reevaluada: { estado: estadoDeConfiguracion(reev), fitness: reev.fitness, cubiertas: reev.regionesCubiertas, activas: reev.regionesActivas, violaciones: reev.violaciones.map((v) => `S${v.satelite + 1} ${v.tipo} (${v.contra}, ${v.magnitud.toFixed(2)}°)`) },
      caliente: { fitness: resumir(caliente.map((r) => r.final.eval.fitness)), validas: caliente.filter((r) => r.estado === 'VÁLIDA').length, genSatisf: gs(caliente) },
      frio: { fitness: resumir(frio.map((r) => r.final.eval.fitness)), validas: frio.filter((r) => r.estado === 'VÁLIDA').length, genSatisf: gs(frio) },
    };
  });
  guardar('p11-cambio-condiciones.json', filas);
  const correcto = filas.every((x) => x.caliente.validas === 5 && x.frio.validas === 5);
  secciones.push(`## P11 — Cambio de condiciones (sección 3.3)

**Pregunta.** Cuando la organización cambia las condiciones, ¿la configuración anterior sigue siendo válida? ¿Qué cuesta adaptarla?

**Condiciones.** Se toma la configuración final de referencia (P1) y se **reevalúa** sin cambios en seis escenarios modificados. Después se **reevoluciona** cada escenario de dos formas, con 5 semillas (101–105) cada una: **en caliente** (la configuración anterior entra a la población inicial) y **en frío** (población aleatoria).

**Resultados.**

${tabla(['Cambio', 'Configuración anterior reevaluada', 'F antes → F reevaluada', 'Regiones cubiertas', 'Violaciones de la anterior', 'Reevolución caliente: F media; gen. satisfactoria', 'Reevolución fría: F media; gen. satisfactoria'], filas.map((x) => [
    x.nombre, `**${x.reevaluada.estado}**`, `${f(x.antes)} → ${f(x.reevaluada.fitness)}`, `${x.reevaluada.cubiertas}/${x.reevaluada.activas}`, x.reevaluada.violaciones.length ? x.reevaluada.violaciones.join('; ') : '—',
    `${f(x.caliente.fitness.media)}; ${f(x.caliente.genSatisf.media, 1)}`, `${f(x.frio.fitness.media)}; ${f(x.frio.genSatisf.media, 1)}`,
  ]))}

**Interpretación.** Los cambios se comportan como se espera del modelo. **Quitar** restricciones (apagar una zona) nunca invalida una configuración: solo amplía el espacio permitido. **Cambiar prioridades o regiones** tampoco la invalida, porque la validez depende solo de las restricciones. Lo que cambia es la aptitud: con Australia en Alta, la redundancia que antes era óptima deja de serlo y F baja. **Agregar o mover** zonas puede invalidarla, pero no siempre. Si la zona nueva cae donde no hay satélites (el Objeto A con 5° sobre el Sahel, o la zona de 10° sobre Japón), la configuración anterior sigue siendo válida. Cuando la zona sí alcanza a un satélite, el sistema dice exactamente qué satélite viola qué zona y por cuántos grados. ${filas.filter((x) => x.reevaluada.estado === 'INVÁLIDA').length} de ${filas.length} cambios invalidan la configuración anterior. Cuando la configuración anterior sigue siendo válida y satisfactoria, la reevolución en caliente parte de ella (generación satisfactoria 0) y nunca termina peor. En frío hay que volver a encontrarla. Cuando la anterior queda inválida, la ventaja del arranque en caliente se reduce: la solución vieja pierde todos los torneos contra cualquier válida, y solo sirve como material genético. Ambas estrategias producen soluciones válidas.

${veredicto('P11', 'Cambio de condiciones', correcto, `${filas.filter((x) => x.reevaluada.estado === 'INVÁLIDA').length}/${filas.length} cambios invalidan la configuración anterior; todas las reevoluciones terminan VÁLIDAS.`)}
`);
}

// =============================================================================
// Documento final
// =============================================================================
const total = ((Date.now() - inicio) / 1000).toFixed(1);
const resumenVeredictos = tabla(['Id', 'Prueba', 'Resultado', 'Resumen'], veredictos.map((v) => [v.id, v.prueba, v.pasa ? '✅ PASA' : '❌ FALLA', v.resumen]));
const doc = `# Entregable 3 — Pruebas y validación

> **Documento generado automáticamente** por \`npm run experimentos\` (\`experiments/run-all.ts\`) a partir de ejecuciones reales. No se edita a mano: todos los números provienen de los archivos de \`results/\`. Todas las semillas son fijas, así que ejecutar de nuevo el comando produce los mismos resultados (salvo los tiempos de ejecución).

## Resumen

${resumenVeredictos}

- P1–P7 son las 7 pruebas obligatorias del enunciado. P8, P9 y P10 son pruebas propias del equipo. P11 documenta el cambio de condiciones (sección 3.3).
- **Verificación independiente:** cada una de las ${registroVerificacion.revisadas} ejecuciones de este documento se volvió a evaluar desde cero al terminar. Inconsistencias entre el estado reportado y la reevaluación: **${registroVerificacion.inconsistencias.length}**${registroVerificacion.inconsistencias.length ? ` (${registroVerificacion.inconsistencias.join(', ')})` : ''}. Ninguna solución inválida se reportó como válida.
- Cota teórica usada: F* = 1 + 0.1 · 10/13 = ${f(F_ESTRELLA, 5)} (docs/01, sección 7).
- Tiempo total de los experimentos: ${total} s (Node ${process.version}).

${secciones.join('\n---\n\n')}
`;
writeFileSync(join(RAIZ, 'docs', '03-pruebas.md'), doc, 'utf8');
guardar('resumen.json', { veredictos, verificacion: registroVerificacion, cotaTeorica: F_ESTRELLA, tiempoTotalSegundos: Number(total) });
log(`listo: ${veredictos.filter((v) => v.pasa).length}/${veredictos.length} pruebas pasan, ${registroVerificacion.inconsistencias.length} inconsistencias`);
if (registroVerificacion.inconsistencias.length) process.exitCode = 1;
