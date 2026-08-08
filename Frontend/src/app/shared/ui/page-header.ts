import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Standard page title block: clickable "Home › <page>" breadcrumb, title, optional subtitle. */
@Component({
  selector: 'hw-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="ph">
      <div>
        <nav class="crumbs">
          <a [routerLink]="home()">Home</a>
          <span class="sep">›</span>
          <span class="current">{{ title() }}</span>
        </nav>
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
    .crumbs { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px; }
    .crumbs a { color: var(--hw-red); font-weight: 500; }
    .crumbs a:hover { text-decoration: underline; }
    .crumbs .sep { color: var(--hw-text-3); }
    .crumbs .current { color: var(--hw-text-3); }
    h1 { margin: 0; font-size: 22px; font-weight: 600; color: var(--hw-text); }
    p { margin: 4px 0 0; color: var(--hw-text-3); font-size: 13px; }
    .actions { display: flex; gap: 10px; align-items: center; }
  `],
})
export class PageHeader {
  title = input<string>('');
  subtitle = input<string>('');

  private auth = inject(AuthService);
  /** "Home" points at the signed-in user's console root. */
  home = () => this.auth.homeRoute();
}
