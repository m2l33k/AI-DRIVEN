import { Component, input } from '@angular/core';

/** KPI card with title, value, delta trend and an accent bar. */
@Component({
  selector: 'hw-stat-card',
  standalone: true,
  template: `
    <div class="stat hw-card" [style.--accent]="accent()">
      <div class="bar"></div>
      <div class="body">
        <span class="label">{{ label() }}</span>
        <span class="value">{{ value() }}<em>{{ unit() }}</em></span>
        @if (delta() !== null) {
          <span class="delta" [class.up]="(delta() ?? 0) >= 0" [class.down]="(delta() ?? 0) < 0">
            {{ (delta() ?? 0) >= 0 ? '▲' : '▼' }} {{ absDelta() }}% {{ deltaHint() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat { position: relative; padding: 18px 20px; overflow: hidden; }
    .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
    .body { display: flex; flex-direction: column; gap: 6px; }
    .label { color: var(--hw-text-3); font-size: 13px; }
    .value { font-size: 28px; font-weight: 700; color: var(--hw-text); line-height: 1; }
    .value em { font-size: 14px; font-weight: 500; color: var(--hw-text-3); font-style: normal; margin-left: 4px; }
    .delta { font-size: 12px; font-weight: 600; }
    .delta.up { color: var(--hw-success); }
    .delta.down { color: var(--hw-danger); }
  `],
})
export class StatCard {
  label = input<string>('');
  value = input<string | number>('');
  unit = input<string>('');
  accent = input<string>('var(--hw-red)');
  delta = input<number | null>(null);
  deltaHint = input<string>('vs last week');

  absDelta = () => Math.abs(this.delta() ?? 0);
}
