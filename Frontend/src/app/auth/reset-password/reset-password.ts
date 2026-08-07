import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <div class="card hw-card">
        <div class="head">
          <span class="logo">5GC</span>
          <span class="brand-name">CloudOps Console</span>
        </div>

        @if (!sent()) {
          <!-- Step 1: request reset -->
          <h2>Reset your password</h2>
          <p class="sub">Enter your account email and we'll send a reset link.</p>
          <form (submit)="$event.preventDefault(); requestReset()">
            <label>Email address</label>
            <input class="hw-input" type="email" [value]="email()"
                   (input)="email.set($any($event.target).value)"
                   placeholder="you@company.com" />
            @if (emailError()) { <span class="err">Please enter a valid email.</span> }
            <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt">
              Send reset link
            </button>
          </form>
        } @else {
          <!-- Step 2: set new password -->
          <h2>Choose a new password</h2>
          <p class="sub">A link was sent to <strong>{{ email() }}</strong>. Set a new password below.</p>
          <form (submit)="$event.preventDefault();">
            <label>New password</label>
            <input class="hw-input" type="password" [value]="pw()"
                   (input)="pw.set($any($event.target).value)" placeholder="At least 8 characters" />

            <div class="meter">
              <span [class.on]="strength() >= 1" class="s1"></span>
              <span [class.on]="strength() >= 2" class="s2"></span>
              <span [class.on]="strength() >= 3" class="s3"></span>
            </div>
            <span class="hint">{{ strengthLabel() }}</span>

            <label>Confirm password</label>
            <input class="hw-input" type="password" [value]="pw2()"
                   (input)="pw2.set($any($event.target).value)" placeholder="Re-enter password" />
            @if (pw2() && pw() !== pw2()) { <span class="err">Passwords do not match.</span> }

            <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt"
                    [disabled]="!canSubmit()">Update password</button>
          </form>
        }

        <a routerLink="/login" class="back">← Back to sign in</a>
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
    .hint { display: block; color: var(--hw-text-3); font-size: 12px; margin-top: 6px; }
    .meter { display: flex; gap: 6px; margin-top: 10px; }
    .meter span { height: 5px; flex: 1; border-radius: 4px; background: var(--hw-border); }
    .meter .on.s1 { background: var(--hw-danger); }
    .meter .on.s2 { background: var(--hw-warning); }
    .meter .on.s3 { background: var(--hw-success); }
    .back { display: block; text-align: center; margin-top: 24px; color: var(--hw-red);
      font-size: 13px; font-weight: 500; }
  `],
})
export class ResetPassword {
  email = signal('');
  emailError = signal(false);
  sent = signal(false);

  pw = signal('');
  pw2 = signal('');

  strength = computed(() => {
    const v = this.pw();
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  });

  strengthLabel = computed(() =>
    ['Too short', 'Weak', 'Good', 'Strong'][this.strength()] ?? '');

  canSubmit = computed(() =>
    this.strength() >= 2 && this.pw() === this.pw2() && !!this.pw2());

  requestReset() {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email());
    this.emailError.set(!ok);
    if (ok) this.sent.set(true);
  }
}
