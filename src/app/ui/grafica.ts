// Gráfica de evolución dibujada a mano en canvas 2D (sin librerías):
// mejor, media y peor aptitud por generación, número de válidos y la cota F*.
// Muestra el historial REAL de la ejecución cargada o en curso.
import type { RegistroGeneracion } from '../../core/tipos';
import { paleta, semantica } from '../tema';

export class GraficaEvolucion {
  private ctx: CanvasRenderingContext2D;
  private historial: RegistroGeneracion[] = [];
  private total = 150;
  private poblacion = 80;
  private marcador = -1;
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
    this.tooltip.className = 'tooltip mono';
    contenedor.appendChild(this.tooltip);
    new ResizeObserver(() => this.dibujar()).observe(contenedor);
    canvas.addEventListener('mousemove', (e) => this.mostrarTooltip(e));
    canvas.addEventListener('mouseleave', () => (this.tooltip.style.display = 'none'));
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
    return { w: r.width, h: r.height, izq: 40, der: 34, arr: 8, aba: 18 };
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
    if (!h) {
      this.tooltip.style.display = 'none';
      return;
    }
    this.tooltip.style.display = 'block';
    this.tooltip.innerHTML = `gen ${h.generacion}<br>mejor ${h.mejor.toFixed(4)}<br>media ${h.media.toFixed(4)}<br>peor ${h.peor.toFixed(4)}<br>válidos ${h.validos}/${this.poblacion}<br>diversidad ${h.diversidad.toFixed(1)}°`;
    const a = this.area();
    const x = Math.min(e.offsetX + 12, a.w - 130);
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = '4px';
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
    const yMax = Math.max(1.1, ...this.historial.map((h) => h.mejor)) * 1.02;
    const X = (g: number) => a.izq + (g / this.total) * ancho;
    const Y = (v: number) => a.arr + alto - (Math.max(0, v) / yMax) * alto;

    c.font = '10px JetBrains Mono, monospace';
    c.fillStyle = paleta.textoTenue;
    c.strokeStyle = paleta.borde;
    c.lineWidth = 1;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      c.beginPath();
      c.moveTo(a.izq, Y(v));
      c.lineTo(a.izq + ancho, Y(v));
      c.stroke();
      c.textAlign = 'right';
      c.fillText(v.toFixed(2), a.izq - 6, Y(v) + 3);
    }
    c.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const g = Math.round((this.total * i) / 5);
      c.fillText(String(g), X(g), a.h - 4);
    }

    // Barras de válidos (eje derecho, en % de la población).
    c.fillStyle = semantica.validos;
    c.globalAlpha = 0.18;
    const bw = Math.max(1, ancho / this.total);
    for (const h of this.historial) {
      const alt = (h.validos / this.poblacion) * alto * 0.35;
      c.fillRect(X(h.generacion) - bw / 2, a.arr + alto - alt, bw, alt);
    }
    c.globalAlpha = 1;
    c.textAlign = 'left';
    c.fillStyle = semantica.validos;
    c.fillText('válidos', a.izq + ancho + 4, a.arr + alto - 4);

    if (this.cota !== null) {
      c.setLineDash([5, 4]);
      c.strokeStyle = semantica.cota;
      c.beginPath();
      c.moveTo(a.izq, Y(this.cota));
      c.lineTo(a.izq + ancho, Y(this.cota));
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = semantica.cota;
      c.fillText('F*', a.izq + ancho + 4, Y(this.cota) + 3);
    }

    const serie = (clave: 'mejor' | 'media' | 'peor', color: string, anchoLinea: number, alfa = 1) => {
      if (!this.historial.length) return;
      c.strokeStyle = color;
      c.lineWidth = anchoLinea;
      c.globalAlpha = alfa;
      c.beginPath();
      this.historial.forEach((h, i) => (i ? c.lineTo(X(h.generacion), Y(h[clave])) : c.moveTo(X(h.generacion), Y(h[clave]))));
      c.stroke();
      c.globalAlpha = 1;
    };
    serie('peor', semantica.peor, 1, 0.6);
    serie('media', semantica.media, 1.6);
    c.shadowColor = semantica.mejor;
    c.shadowBlur = 8;
    serie('mejor', semantica.mejor, 2.2);
    c.shadowBlur = 0;

    if (this.marcador >= 0 && this.historial[this.marcador]) {
      const h = this.historial[this.marcador];
      c.strokeStyle = paleta.texto;
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(X(h.generacion), a.arr);
      c.lineTo(X(h.generacion), a.arr + alto);
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = semantica.mejor;
      c.beginPath();
      c.arc(X(h.generacion), Y(h.mejor), 4, 0, Math.PI * 2);
      c.fill();
    }
  }
}
