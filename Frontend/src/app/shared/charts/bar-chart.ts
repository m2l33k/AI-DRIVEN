import { Component, computed, input } from '@angular/core';

/** Dependency-free SVG vertical bar chart. */
@Component({
  selector: 'hw-bar-chart',
  standalone: true,
  template: `
    <div class="chart">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none"
           class="svg" role="img" [attr.aria-label]="ariaLabel()">
        @for (g of gridLines(); track g) {
          <line [attr.x1]="pad" [attr.x2]="W - pad" [attr.y1]="g" [attr.y2]="g"
                stroke="#eceef1" stroke-width="1" />
        }
        @for (b of bars(); track $index) {
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
                [attr.fill]="color()" rx="3" />
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
      display: flex; justify-content: space-around;
      margin-top: 8px; color: var(--hw-text-3); font-size: 12px;
    }
  `],
})
export class BarChart {
  data = input<number[]>([]);
  labels = input<string[]>([]);
  color = input<string>('var(--hw-chart-2)');
  ariaLabel = input<string>('Bar chart');

  protected readonly W = 600;
  protected readonly H = 240;
  protected readonly pad = 12;

  bars = computed(() => {
    const d = this.data();
    if (!d.length) return [] as { x: number; y: number; w: number; h: number }[];
    const max = Math.max(...d) * 1.15 || 1;
    const innerW = this.W - this.pad * 2;
    const innerH = this.H - this.pad * 2;
    const slot = innerW / d.length;
    const bw = slot * 0.55;
    return d.map((v, i) => {
      const h = (v / max) * innerH;
      return {
        x: this.pad + slot * i + (slot - bw) / 2,
        y: this.pad + innerH - h,
        w: bw,
        h,
      };
    });
  });

  gridLines = computed(() => {
    const rows = 4;
    const innerH = this.H - this.pad * 2;
    return Array.from({ length: rows + 1 }, (_, i) => this.pad + (innerH / rows) * i);
  });
}
