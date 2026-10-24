// Gráfica de evolución dibujada a mano en canvas 2D (sin librerías):
// mejor, media y peor aptitud por generación, número de válidos y la cota F*.
// Muestra el historial REAL de la ejecución cargada o en curso.
import type { RegistroGeneracion } from '../../core/tipos';
import { conAlfa, paleta, semantica, tipografia } from '../tema';

export class GraficaEvolucion {
  private ctx: CanvasRenderingContext2D;
  private historial: RegistroGeneracion[] = [];
  private total = 150;
  private poblacion = 80;
  private marcador = -1;
  private hover = -1;
  private cota: number | null = null;
  private tooltip: HTMLDivElement;
  alSeleccionar: (generacion: number) => void = () => {};

  constructor(private contenedor: HTMLElement) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Gráfica de la aptitud por generación');
    contenedor.appendChild(canvas);
    this.ctx = canvas.getContext('2d')!;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    contenedor.appendChild(this.tooltip);
    new ResizeObserver(() => this.dibujar()).observe(contenedor);
    canvas.addEventListener('mousemove', (e) => this.mostrarTooltip(e));
    canvas.addEventListener('mouseleave', () => {
      this.tooltip.style.display = 'none';
      this.hover = -1;
      this.dibujar();
    });
    canvas.addEventListener('click', (e) => {
      const g = this.generacionEn(e);
      if (g >= 0) this.alSeleccionar(g);
    });
  }

  fijar(historial: RegistroGeneracion[], total: number, poblacion: number, cota: number | null): void {
    this.historial = historial;
    this.total = Math.max(1, total);
    this.poblacion = poblacion;
    this.cota = cota;
    this.dibujar();
  }

  marcar(g: number): void {
    this.marcador = g;
    this.dibujar();
  }

  private area() {
    const r = this.contenedor.getBoundingClientRect();
    return { w: r.width, h: r.height, izq: 38, der: 56, arr: 10, aba: 20 };
  }

  private generacionEn(e: MouseEvent): number {
    const a = this.area();
    const x = e.offsetX - a.izq;
    const ancho = a.w - a.izq - a.der;
    if (x < 0 || x > ancho || !this.historial.length) return -1;
    return Math.max(0, Math.min(this.historial.length - 1, Math.round((x / ancho) * this.total)));
  }

  private mostrarTooltip(e: MouseEvent): void {
    const g = this.generacionEn(e);
    const h = this.historial[g];
    this.hover = h ? g : -1;
    this.dibujar();
    if (!h) {
      this.tooltip.style.display = 'none';
      return;
    }
    const fila = (t: string, v: string) => `<div class="t-fila"><span>${t}</span><b>${v}</b></div>`;
    this.tooltip.style.display = 'block';
    this.tooltip.innerHTML = `<div class="t-titulo">Generación ${h.generacion}</div>${fila('Mejor', h.mejor.toFixed(4))}${fila('Media', h.media.toFixed(4))}${fila('Peor', h.peor.toFixed(4))}${fila('Válidos', `${h.validos} de ${this.poblacion}`)}${fila('Diversidad', `${h.diversidad.toFixed(1)}°`)}`;
    const a = this.area();
    const ancho = this.tooltip.offsetWidth || 150;
    // El tooltip se coloca del lado contrario al cursor para no taparlo.
    const x = e.offsetX + 16 + ancho > a.w ? e.offsetX - 16 - ancho : e.offsetX + 16;
    this.tooltip.style.left = `${Math.max(0, x)}px`;
    this.tooltip.style.top = '0px';
  }

  dibujar(): void {
    const a = this.area();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = this.ctx;
    const cv = c.canvas;
    if (cv.width !== Math.round(a.w * dpr) || cv.height !== Math.round(a.h * dpr)) {
      cv.width = Math.round(a.w * dpr);
      cv.height = Math.round(a.h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, a.w, a.h);
    const ancho = a.w - a.izq - a.der;
    const alto = a.h - a.arr - a.aba;
    if (ancho <= 0 || alto <= 0) return;

    // Escala vertical: de 0 al máximo entre 1.1 y lo observado.
    const maxObservado = this.historial.reduce((max, h) => Math.max(max, h.mejor), 1.1);
    const yMax = maxObservado * 1.02;
    const X = (g: number) => a.izq + (g / this.total) * ancho;
    const Y = (v: number) => a.arr + alto - (Math.max(0, v) / yMax) * alto;
    const base = a.arr + alto;

    c.font = `500 11px ${tipografia.ui}`;
    c.fillStyle = paleta.textoTenue;
    c.strokeStyle = paleta.borde;
    c.lineWidth = 1;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      c.beginPath();
      c.moveTo(a.izq, Math.round(Y(v)) + 0.5);
      c.lineTo(a.izq + ancho, Math.round(Y(v)) + 0.5);
      c.stroke();
      c.textAlign = 'right';
      c.fillText(v.toFixed(2), a.izq - 8, Y(v) + 4);
    }
    c.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const g = Math.round((this.total * i) / 5);
      c.fillText(String(g), X(g), a.h - 4);
    }

    // Barras de válidos (fracción de la población, en la franja inferior).
    c.fillStyle = conAlfa(semantica.validos, 0.2);
    const bw = Math.max(1, ancho / this.total);
    for (const h of this.historial) {
      const alt = (h.validos / this.poblacion) * alto * 0.3;
      c.fillRect(X(h.generacion) - bw / 2, base - alt, bw, alt);
    }

    if (this.cota !== null) {
      c.setLineDash([5, 4]);
      c.strokeStyle = semantica.cota;
      c.beginPath();
      c.moveTo(a.izq, Y(this.cota));
      c.lineTo(a.izq + ancho, Y(this.cota));
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = semantica.cota;
      c.textAlign = 'left';
      c.fillText(`F* ${this.cota.toFixed(3)}`, a.izq + ancho + 6, Y(this.cota) + 4);
    }

    const trazar = (clave: 'mejor' | 'media' | 'peor') =>
      this.historial.forEach((h, i) => (i ? c.lineTo(X(h.generacion), Y(h[clave])) : c.moveTo(X(h.generacion), Y(h[clave]))));
    const serie = (clave: 'mejor' | 'media' | 'peor', color: string, anchoLinea: number, discontinua = false) => {
      if (!this.historial.length) return;
      c.strokeStyle = color;
      c.lineWidth = anchoLinea;
      c.lineJoin = 'round';
      c.setLineDash(discontinua ? [3, 3] : []);
      c.beginPath();
      trazar(clave);
      c.stroke();
      c.setLineDash([]);
    };

    // Área bajo la mejor: da peso a la serie principal sin brillos.
    if (this.historial.length) {
      const grad = c.createLinearGradient(0, a.arr, 0, base);
      grad.addColorStop(0, conAlfa(semantica.mejor, 0.26));
      grad.addColorStop(1, conAlfa(semantica.mejor, 0));
      c.fillStyle = grad;
      c.beginPath();
      trazar('mejor');
      c.lineTo(X(this.historial[this.historial.length - 1].generacion), base);
      c.lineTo(X(this.historial[0].generacion), base);
      c.closePath();
      c.fill();
    }
    serie('peor', semantica.peor, 1, true);
    serie('media', semantica.media, 1.5);
    serie('mejor', semantica.mejor, 2.4);

    const punto = (g: number, radio: number) => {
      const h = this.historial[g];
      if (!h) return;
      c.fillStyle = semantica.mejor;
      c.strokeStyle = paleta.panel;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X(h.generacion), Y(h.mejor), radio, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    };
    const vertical = (g: number, alfa: number) => {
      const h = this.historial[g];
      if (!h) return;
      c.strokeStyle = conAlfa(paleta.texto, alfa);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(Math.round(X(h.generacion)) + 0.5, a.arr);
      c.lineTo(Math.round(X(h.generacion)) + 0.5, base);
      c.stroke();
    };
    if (this.hover >= 0 && this.hover !== this.marcador) {
      vertical(this.hover, 0.18);
      punto(this.hover, 3.5);
    }
    if (this.marcador >= 0) {
      vertical(this.marcador, 0.4);
      punto(this.marcador, 5);
    }
  }
}
