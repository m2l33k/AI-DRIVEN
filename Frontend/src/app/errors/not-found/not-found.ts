import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="err-wrap">
      <div class="err-card">
        <div class="illus">
          <svg viewBox="0 0 240 140" class="art">
            <text x="120" y="98" text-anchor="middle" class="code">404</text>
            <circle cx="120" cy="60" r="52" class="ring" />
          </svg>
        </div>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist, was moved, or you don't
           have permission to view it.</p>
        <div class="actions">
          <button class="hw-btn" (click)="back()">← Go back</button>
          <a routerLink="/login" class="hw-btn hw-btn--primary">Return to sign in</a>
        </div>
        <span class="ref">Error code: HTTP 404 · Not Found</span>
      </div>
    </div>
  `,
  styles: [`
    .err-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px;
      background: radial-gradient(1000px 500px at 50% -10%, #eef2f7 0%, var(--hw-bg) 60%); }
    .err-card { text-align: center; max-width: 460px; }
    .art { width: 260px; height: 150px; }
    .code { font-size: 62px; font-weight: 800; fill: var(--hw-red); }
    .ring { fill: none; stroke: var(--hw-red); stroke-opacity: .18; stroke-width: 3; stroke-dasharray: 6 8; }
    h1 { font-size: 26px; margin: 8px 0 10px; font-weight: 700; }
    p { color: var(--hw-text-3); margin: 0 auto 26px; max-width: 380px; }
    .actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
    .ref { font-size: 12px; color: var(--hw-text-3); }
  `],
})
export class NotFound {
  constructor(private location: Location) {}
  back() { this.location.back(); }
}
