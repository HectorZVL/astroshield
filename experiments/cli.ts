// Línea de comandos para ejecutar UNA evolución y ver el resultado en texto.
// Ejemplos:
//   npm run evolucionar
//   npm run evolucionar -- --semilla 7 --generaciones 300
//   npm run evolucionar -- --escenario inviable
//   npm run evolucionar -- --apagar atlantico-norte --prioridad australia=Alta --salida results/mi-run.json
import { writeFileSync } from 'node:fs';
import { evolucionar, PARAMETROS_BASE } from '../src/core/ag';
import { estadoDeConfiguracion, nivelDeCalidad } from '../src/core/comparacion';
import { activarZona, agregarZona, cambiarPrioridad, escenarioInicial, escalarDesechos } from '../src/core/escenario';
import { analizarFactibilidad } from '../src/core/factibilidad';
import type { Escenario, ParametrosAG, Prioridad } from '../src/core/tipos';

function leerArgumentos(argv: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const clave = argv[i].slice(2);
    const valor = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    m.set(clave, [...(m.get(clave) ?? []), valor]);
  }
  return m;
}

const args = leerArgumentos(process.argv.slice(2));
const uno = (k: string) => args.get(k)?.[0];

if (args.has('ayuda')) {
  console.log(`Opciones:
  --semilla N  --poblacion N  --generaciones N  --sigma GRADOS  --mutacion P  --cruce P
  --sin-alinear                 cruce uniforme sin emparejar satélites
  --escenario inicial|inviable  escenario base
  --escalar K                   multiplica el radio de las zonas de desechos
  --apagar ID                   desactiva una zona (repetible)
  --prioridad REGION=NIVEL      cambia la prioridad de una región (repetible)
  --salida RUTA.json            guarda el resultado completo`);
  process.exit(0);
}

let esc: Escenario = escenarioInicial();
if (uno('escenario') === 'inviable') {
  esc = agregarZona(esc, 'desechos', { id: 'gigante', nombre: 'Zona gigante', lat: 0, lon: 0, radioGrados: 178, activa: true });
}
if (uno('escalar')) {
  const f = Number(uno('escalar'));
  if (Number.isFinite(f) && f > 0) esc = escalarDesechos(esc, f);
}
for (const id of args.get('apagar') ?? []) esc = activarZona(esc, id, false);
for (const par of args.get('prioridad') ?? []) {
  const [id, nivel] = par.split('=');
  if (id && nivel && ['Alta', 'Media', 'Normal'].includes(nivel)) {
    esc = cambiarPrioridad(esc, id, nivel as Prioridad);
  }
}

const num = (k: string, d: number) => {
  const v = uno(k);
  if (v === undefined) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const p: ParametrosAG = {
  ...PARAMETROS_BASE,
  semilla: num('semilla', PARAMETROS_BASE.semilla),
  poblacion: num('poblacion', PARAMETROS_BASE.poblacion),
  generaciones: num('generaciones', PARAMETROS_BASE.generaciones),
  sigmaMutacion: num('sigma', PARAMETROS_BASE.sigmaMutacion),
  probMutacion: num('mutacion', PARAMETROS_BASE.probMutacion),
  probCruce: num('cruce', PARAMETROS_BASE.probCruce),
  elitismo: num('elitismo', PARAMETROS_BASE.elitismo),
  alinearCruce: !args.has('sin-alinear'),
};
if (p.elitismo >= p.poblacion) {
  p.elitismo = Math.max(0, p.poblacion - 1);
}

const fa = analizarFactibilidad(esc);
console.log(`Factibilidad: ${fa.mensaje}`);
const r = evolucionar(esc, p);
const ev = r.final.eval;

console.log(`\nParámetros: semilla=${p.semilla} N=${p.poblacion} G=${p.generaciones} σ=${p.sigmaMutacion}° pm=${p.probMutacion} pc=${p.probCruce} alinear=${p.alinearCruce}`);
console.log('Gen   Mejor     Media     Válidos  Diversidad');
for (const h of r.historial.filter((_, i) => i % Math.max(1, Math.round(p.generaciones / 10)) === 0 || i === r.historial.length - 1)) {
  console.log(`${String(h.generacion).padStart(3)}   ${h.mejor.toFixed(5)}   ${h.media.toFixed(5)}   ${String(h.validos).padStart(4)}     ${h.diversidad.toFixed(1)}°`);
}

// El estado sale de la misma función que usa la UI: no hay forma de que difieran.
console.log(`\nESTADO: ${r.estado}${r.estado === 'SIN_VALIDA' ? ' (no se encontró ninguna configuración válida en esta ejecución; se muestra la de menor violación)' : ''}`);
console.log(`Nivel: ${nivelDeCalidad(ev)} · F=${ev.fitness.toFixed(5)} · C=${(ev.cobertura * 100).toFixed(2)} % · R=${ev.redundancia.toFixed(4)} · regiones cubiertas ${ev.regionesCubiertas}/${ev.regionesActivas} · violación total ${ev.violacionTotal.toFixed(3)}°`);
console.log('\nRegiones:');
for (const x of ev.regiones) console.log(`  ${x.nombre.padEnd(24)} ${x.prioridad.padEnd(7)} ${(x.fraccion * 100).toFixed(1).padStart(6)} %  ${x.estado}  (satélites completos: ${x.satelitesCompletos.map((i) => 'S' + (i + 1)).join(', ') || '—'})`);
console.log('\nSatélites:');
r.final.config.forEach((s, i) => console.log(`  S${i + 1}  lat ${s.lat.toFixed(3).padStart(8)}°  lon ${s.lon.toFixed(3).padStart(9)}°`));
if (ev.violaciones.length) {
  console.log(`\nViolaciones (${estadoDeConfiguracion(ev)}):`);
  for (const v of ev.violaciones) console.log(`  S${v.satelite + 1} ${v.tipo} contra ${v.contra}: ${v.magnitud.toFixed(3)}°`);
}
if (uno('salida')) {
  writeFileSync(uno('salida')!, JSON.stringify(r, null, 1));
  console.log(`\nResultado guardado en ${uno('salida')}`);
}
console.log(`\n${r.evaluaciones} evaluaciones en ${r.tiempoMs} ms`);
