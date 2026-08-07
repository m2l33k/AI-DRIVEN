import { Component, input } from '@angular/core';

/** Standard page title block with optional subtitle and right-side slot. */
@Component({
  selector: 'hw-page-header',
  standalone: true,
  template: `
    <div class="ph">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) { <p>{{ subtitle() }}</p> }
      </div>
      <div class="actions"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .ph {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 20px;
    }
    h1 { margin: 0; font-size: 22px; font-weight: 600; color: var(--hw-text); }
    p { margin: 4px 0 0; color: var(--hw-text-3); font-size: 13px; }
    .actions { display: flex; gap: 10px; align-items: center; }
  `],
})
export class PageHeader {
  title = input<string>('');
  subtitle = input<string>('');
}
