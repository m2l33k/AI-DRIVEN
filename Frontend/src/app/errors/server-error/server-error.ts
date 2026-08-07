import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="err-wrap">
      <div class="err-card">
        <div class="illus">
          <svg viewBox="0 0 240 140" class="art">
            <text x="120" y="98" text-anchor="middle" class="code">500</text>
            <path d="M120 22 L150 74 H90 Z" class="warn" />
            <rect x="117" y="44" width="6" height="16" rx="3" class="warn-mark" />
            <circle cx="120" cy="66" r="3" class="warn-mark" />
          </svg>
        </div>
        <h1>Something went wrong</h1>
        <p>The server encountered an internal error and could not complete your
           request. Our team has been notified. Please try again in a moment.</p>
        <div class="actions">
          <button class="hw-btn" (click)="reload()">↻ Try again</button>
          <a routerLink="/login" class="hw-btn hw-btn--primary">Return to sign in</a>
        </div>
        <span class="ref">Error code: HTTP 500 · Internal Server Error</span>
      </div>
    </div>
  `,
  styles: [`
    .err-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px;
      background: radial-gradient(1000px 500px at 50% -10%, #fff0f0 0%, var(--hw-bg) 60%); }
    .err-card { text-align: center; max-width: 460px; }
    .art { width: 260px; height: 150px; }
    .code { font-size: 62px; font-weight: 800; fill: var(--hw-red); }
    .warn { fill: none; stroke: var(--hw-warning); stroke-width: 3; stroke-linejoin: round; }
    .warn-mark { fill: var(--hw-warning); }
    h1 { font-size: 26px; margin: 8px 0 10px; font-weight: 700; }
    p { color: var(--hw-text-3); margin: 0 auto 26px; max-width: 400px; }
    .actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
    .ref { font-size: 12px; color: var(--hw-text-3); }
  `],
})
export class ServerError {
  reload() { window.location.reload(); }
}
