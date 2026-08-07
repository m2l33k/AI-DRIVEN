import { Component, computed, input } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Dependency-free SVG donut chart with legend. */
@Component({
  selector: 'hw-donut-chart',
  standalone: true,
  template: `
    <div class="donut">
      <svg viewBox="0 0 120 120" class="svg" role="img" [attr.aria-label]="ariaLabel()">
        <circle cx="60" cy="60" [attr.r]="r" fill="none" stroke="#eef0f2"
                [attr.stroke-width]="thickness" />
        @for (a of arcs(); track $index) {
          <circle cx="60" cy="60" [attr.r]="r" fill="none"
                  [attr.stroke]="a.color" [attr.stroke-width]="thickness"
                  [attr.stroke-dasharray]="a.dash"
                  [attr.stroke-dashoffset]="a.offset"
                  transform="rotate(-90 60 60)" stroke-linecap="butt" />
        }
        <text x="60" y="56" text-anchor="middle" class="total">{{ total() }}</text>
        <text x="60" y="72" text-anchor="middle" class="cap">{{ centerLabel() }}</text>
      </svg>
      <ul class="legend">
        @for (s of slices(); track $index) {
          <li>
            <span class="dot" [style.background]="s.color"></span>
            <span class="name">{{ s.label }}</span>
            <span class="val">{{ s.value }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .donut { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .svg { width: 160px; height: 160px; flex: none; }
    .total { font-size: 20px; font-weight: 700; fill: var(--hw-text); }
    .cap { font-size: 8px; fill: var(--hw-text-3); }
    .legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 160px; }
    .legend li {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 0; font-size: 13px; color: var(--hw-text-2);
      border-bottom: 1px dashed var(--hw-border);
    }
    .legend li:last-child { border-bottom: 0; }
    .dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
    .name { flex: 1; }
    .val { font-weight: 600; color: var(--hw-text); }
  `],
})
export class DonutChart {
  slices = input<DonutSlice[]>([]);
  centerLabel = input<string>('Total');
  ariaLabel = input<string>('Donut chart');

  protected readonly r = 48;
  protected readonly thickness = 14;
  private readonly circ = 2 * Math.PI * 48;

  total = computed(() => this.slices().reduce((s, x) => s + x.value, 0));

  arcs = computed(() => {
    const slices = this.slices();
    const sum = this.total() || 1;
    let acc = 0;
    return slices.map((s) => {
      const frac = s.value / sum;
      const len = frac * this.circ;
      const arc = {
        color: s.color,
        dash: `${len} ${this.circ - len}`,
        offset: -acc,
      };
      acc += len;
      return arc;
    });
  });
}
