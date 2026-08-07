import { Component, computed, input } from '@angular/core';

/**
 * Lightweight dependency-free SVG line/area chart.
 * Scales to its container width via a fixed viewBox.
 */
@Component({
  selector: 'hw-line-chart',
  standalone: true,
  template: `
    <div class="chart">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none"
           class="svg" role="img" [attr.aria-label]="ariaLabel()">
        <defs>
          <linearGradient [attr.id]="gradId()" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.22" />
            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- grid lines -->
        @for (g of gridLines(); track g) {
          <line [attr.x1]="pad" [attr.x2]="W - pad" [attr.y1]="g" [attr.y2]="g"
                stroke="#eceef1" stroke-width="1" />
        }

        <!-- area + line -->
        <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradId() + ')'" />
        <path [attr.d]="linePath()" fill="none" [attr.stroke]="color()"
              stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

        <!-- points -->
        @for (p of points(); track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="color()" />
        }
      </svg>
      <div class="labels">
        @for (l of labels(); track $index) {
          <span>{{ l }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .chart { width: 100%; }
    .svg { width: 100%; height: 220px; display: block; }
    .labels {
      display: flex; justify-content: space-between;
      margin-top: 8px; color: var(--hw-text-3); font-size: 12px;
    }
  `],
})
export class LineChart {
  data = input<number[]>([]);
  labels = input<string[]>([]);
  color = input<string>('var(--hw-chart-1)');
  ariaLabel = input<string>('Line chart');

  protected readonly W = 600;
  protected readonly H = 240;
  protected readonly pad = 12;

  private readonly gid = 'ln-grad-' + Math.random().toString(36).slice(2, 8);
  gradId = () => this.gid;

  private scaled = computed(() => {
    const d = this.data();
    if (!d.length) return [] as { x: number; y: number }[];
    const max = Math.max(...d) * 1.15 || 1;
    const min = Math.min(0, ...d);
    const span = max - min || 1;
    const innerW = this.W - this.pad * 2;
    const innerH = this.H - this.pad * 2;
    const step = d.length > 1 ? innerW / (d.length - 1) : 0;
    return d.map((v, i) => ({
      x: this.pad + step * i,
      y: this.pad + innerH - ((v - min) / span) * innerH,
    }));
  });

  points = this.scaled;

  linePath = computed(() => {
    const p = this.scaled();
    if (!p.length) return '';
    return p.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' ');
  });

  areaPath = computed(() => {
    const p = this.scaled();
    if (!p.length) return '';
    const line = p.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' ');
    return `${line} L${p[p.length - 1].x},${this.H - this.pad} L${p[0].x},${this.H - this.pad} Z`;
  });

  gridLines = computed(() => {
    const rows = 4;
    const innerH = this.H - this.pad * 2;
    return Array.from({ length: rows + 1 }, (_, i) => this.pad + (innerH / rows) * i);
  });
}
