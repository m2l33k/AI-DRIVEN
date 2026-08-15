import { Component, input, output } from '@angular/core';

/**
 * Shared loading / error / empty state block for data-backed pages.
 * Render it above the real content; the content's own `@if (data)` guards hide until loaded.
 *
 *   <hw-async-state [loading]="loading()" [error]="error()" [empty]="!rows().length && !loading()"
 *                   (retry)="load()" />
 */
@Component({
  selector: 'hw-async-state',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="hw-card hw-state">
        <div class="hw-spinner"></div>
        <span>{{ loadingText() }}</span>
      </div>
    } @else if (error()) {
      <div class="hw-card hw-state hw-state--error">
        <span>{{ error() }}</span>
        <button class="hw-btn" (click)="retry.emit()">Retry</button>
      </div>
    } @else if (empty()) {
      <div class="hw-card hw-state">
        <span>{{ emptyText() }}</span>
      </div>
    }
  `,
})
export class AsyncState {
  loading = input(false);
  error = input<string | null>(null);
  empty = input(false);
  loadingText = input('Loading…');
  emptyText = input('No data to display.');
  retry = output<void>();
}
