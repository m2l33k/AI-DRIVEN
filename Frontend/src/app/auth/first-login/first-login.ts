import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-first-login',
  standalone: true,
  template: `
    <div class="wrap">
      <div class="card hw-card">
        <div class="head">
          <span class="logo">5GC</span>
          <span class="brand-name">CloudOps Console</span>
        </div>

        <h2>Set your password</h2>
        <p class="sub">Your account requires a new password before you can continue.</p>

        @if (error()) { <div class="banner err">{{ error() }}</div> }

        <form (submit)="$event.preventDefault(); submit()">
          <label>New password</label>
          <input class="hw-input" type="password" [value]="pw()"
                 (input)="pw.set($any($event.target).value)" placeholder="At least 8 characters" />

          <label>Confirm password</label>
          <input class="hw-input" type="password" [value]="pw2()"
                 (input)="pw2.set($any($event.target).value)" placeholder="Re-enter password" />
          @if (pw2() && pw() !== pw2()) { <span class="err">Passwords do not match.</span> }

          <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt"
                  [disabled]="!canSubmit() || loading()">
            {{ loading() ? 'Saving…' : 'Save and continue' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center;
      background: radial-gradient(1200px 500px at 50% -10%, #ffe9ea 0%, var(--hw-bg) 55%); padding: 24px; }
    .card { width: 100%; max-width: 420px; padding: 36px 34px; }
    .head { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
    .logo { background: var(--hw-red); color: #fff; font-weight: 800; width: 36px; height: 36px;
      border-radius: 8px; display: grid; place-items: center; letter-spacing: -1px; }
    .brand-name { font-size: 15px; font-weight: 600; }
    h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .sub { margin: 0 0 22px; color: var(--hw-text-3); font-size: 14px; }
    label { display: block; font-size: 13px; font-weight: 500; margin: 14px 0 6px; color: var(--hw-text-2); }
    .mt { margin-top: 24px; }
    .err { display: block; color: var(--hw-danger); font-size: 12px; margin-top: 6px; }
    .banner { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
    .banner.err { background: rgba(245,63,63,.1); color: var(--hw-danger); }
  `],
})
export class FirstLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  pw = signal('');
  pw2 = signal('');
  loading = signal(false);
  error = signal('');

  canSubmit = computed(() => this.pw().length >= 8 && this.pw() === this.pw2());

  constructor() {
    // No token means the user landed here directly — send them back to sign in.
    if (!this.auth.firstLoginToken()) this.router.navigate(['/login']);
  }

  submit() {
    const token = this.auth.firstLoginToken();
    if (!token) { this.router.navigate(['/login']); return; }
    this.error.set('');
    this.loading.set(true);
    this.auth.firstLoginChangePassword(token, this.pw()).subscribe({
      next: () => {
        this.auth.firstLoginToken.set(null);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Could not update the password. Please sign in again.');
      },
    });
  }
}
