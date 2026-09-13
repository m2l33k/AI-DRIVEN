import { Component, computed, input } from '@angular/core';

export interface ChartSeries {
  label: string;
  color: string;
  data: number[];
  dashed?: boolean;
}

/**
 * SVG multi-series line chart. All series share the same x-axis labels.
 * Optionally draws a vertical divider to separate history from predictions.
 */
@Component({
  selector: 'hw-multi-line-chart',
  standalone: true,
  template: `
    <div class="chart">
      <div class="legend">
        @for (s of series(); track s.label) {
          <span class="leg-item">
            <svg width="24" height="3" style="vertical-align:middle;margin-right:4px">
              <line x1="0" y1="1.5" x2="24" y2="1.5"
                    [attr.stroke]="s.color" stroke-width="2.5"
                    [attr.stroke-dasharray]="s.dashed ? '5,3' : 'none'" />
            </svg>
            {{ s.label }}
          </span>
        }
      </div>

      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none"
           class="svg" role="img" [attr.aria-label]="ariaLabel()">

        <!-- grid -->
        @for (g of gridLines(); track g) {
          <line [attr.x1]="pad" [attr.x2]="W - pad" [attr.y1]="g" [attr.y2]="g"
                stroke="#eceef1" stroke-width="1" />
        }

        <!-- divider between history and prediction -->
        @if (dividerX() !== null) {
          <line [attr.x1]="dividerX()!" [attr.y1]="pad" [attr.x2]="dividerX()!" [attr.y2]="H - pad"
                stroke="#c9cdd4" stroke-width="1" stroke-dasharray="4,3" />
        }

        <!-- one path per series -->
        @for (s of scaledSeries(); track s.label) {
          <path [attr.d]="linePath(s.points)" fill="none"
                [attr.stroke]="s.color" stroke-width="2.2"
                stroke-linejoin="round" stroke-linecap="round"
                [attr.stroke-dasharray]="s.dashed ? '6,3' : 'none'" />
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
    .legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 10px; font-size: 12px; color: var(--hw-text-2); }
    .leg-item { display: flex; align-items: center; }
    .labels { display: flex; justify-content: space-between; margin-top: 8px; color: var(--hw-text-3); font-size: 12px; }
  `],
})
export class MultiLineChart {
  series = input<ChartSeries[]>([]);
  labels = input<string[]>([]);
  /** Index in labels[] where predicted values start (draws a vertical divider). */
  dividerIndex = input<number | null>(null);
  ariaLabel = input<string>('Multi-series line chart');

  protected readonly W = 600;
  protected readonly H = 240;
  protected readonly pad = 12;

  private globalRange = computed(() => {
    const all = this.series().flatMap((s) => s.data);
    if (!all.length) return { min: 0, max: 1 };
    const max = Math.max(...all) * 1.15 || 1;
    const min = Math.min(0, ...all);
    return { min, max };
  });

  scaledSeries = computed(() => {
    const { min, max } = this.globalRange();
    const span = (max - min) || 1;
    const n = Math.max(...this.series().map((s) => s.data.length), 1);
    const innerW = this.W - this.pad * 2;
    const innerH = this.H - this.pad * 2;
    const step = n > 1 ? innerW / (n - 1) : 0;

    return this.series().map((s) => ({
      label: s.label,
      color: s.color,
      dashed: s.dashed,
      points: s.data.map((v, i) => ({
        x: this.pad + step * i,
        y: this.pad + innerH - ((v - min) / span) * innerH,
      })),
    }));
  });

  dividerX = computed<number | null>(() => {
    const idx = this.dividerIndex();
    if (idx === null || idx <= 0) return null;
    const n = Math.max(...this.series().map((s) => s.data.length), 2);
    const innerW = this.W - this.pad * 2;
    const step = innerW / (n - 1);
    return this.pad + step * idx;
  });

  linePath(points: { x: number; y: number }[]): string {
    if (!points.length) return '';
    const t = 0.15;
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) * t;
      const c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t;
      const c2y = p2.y - (p3.y - p1.y) * t;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  gridLines = computed(() => {
    const rows = 4;
    const innerH = this.H - this.pad * 2;
    return Array.from({ length: rows + 1 }, (_, i) => this.pad + (innerH / rows) * i);
  });
}
