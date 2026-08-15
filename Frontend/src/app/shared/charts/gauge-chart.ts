import { Component, computed, input } from '@angular/core';

/**
 * Dependency-free SVG radial gauge for a 0–{max} score. Draws a 270° track with a coloured value
 * arc and the value in the centre. Colour can be fixed or auto-graded (red→amber→green) by value.
 */
@Component({
  selector: 'hw-gauge-chart',
  standalone: true,
  template: `
    <div class="gauge">
      <svg viewBox="0 0 120 120" class="svg" role="img" [attr.aria-label]="ariaLabel()">
        <path [attr.d]="trackPath()" fill="none" stroke="#eceef1" [attr.stroke-width]="width"
              stroke-linecap="round" />
        <path [attr.d]="valuePath()" fill="none" [attr.stroke]="strokeColor()" [attr.stroke-width]="width"
              stroke-linecap="round" />
        <text x="60" y="58" text-anchor="middle" class="val">{{ value() }}</text>
        <text x="60" y="76" text-anchor="middle" class="cap">{{ label() }}</text>
      </svg>
    </div>
  `,
  styles: [`
    .gauge { display: flex; justify-content: center; }
    .svg { width: 160px; height: 160px; }
    .val { font-size: 26px; font-weight: 800; fill: var(--hw-text); }
    .cap { font-size: 9px; letter-spacing: .06em; text-transform: uppercase; fill: var(--hw-text-3); }
  `],
})
export class GaugeChart {
  value = input<number>(0);
  max = input<number>(100);
  label = input<string>('score');
  ariaLabel = input<string>('Gauge');
  /** Fixed colour; when empty, auto-grade by value (low = red, high = green). */
  color = input<string>('');
  /** When true a high value is "good" (green); set false to invert (e.g. latency, where low is good). */
  higherIsBetter = input<boolean>(true);

  protected readonly width = 12;
  private readonly cx = 60;
  private readonly cy = 60;
  private readonly r = 46;
  private readonly start = 135;   // degrees
  private readonly sweep = 270;   // degrees

  private frac = computed(() => Math.max(0, Math.min(1, this.value() / (this.max() || 1))));

  strokeColor = computed(() => {
    if (this.color()) { return this.color(); }
    const f = this.higherIsBetter() ? this.frac() : 1 - this.frac();
    return f >= 0.66 ? '#00a870' : f >= 0.33 ? '#ff8f1f' : '#f53f3f';
  });

  trackPath = computed(() => this.arc(this.start, this.start + this.sweep));
  valuePath = computed(() => this.arc(this.start, this.start + this.sweep * this.frac()));

  private arc(a0: number, a1: number): string {
    if (a1 - a0 < 0.01) { return ''; }
    const p0 = this.polar(a0);
    const p1 = this.polar(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${p0.x},${p0.y} A${this.r},${this.r} 0 ${large} 1 ${p1.x},${p1.y}`;
  }

  private polar(deg: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return { x: this.cx + this.r * Math.cos(rad), y: this.cy + this.r * Math.sin(rad) };
  }
}
