import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type Step = 'email' | 'otp' | 'password' | 'done';

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

        @if (error()) { <div class="banner err">{{ error() }}</div> }

        @switch (step()) {
          @case ('email') {
            <h2>Reset your password</h2>
            <p class="sub">Enter your account email and we'll send a one-time code.</p>
            <form (submit)="$event.preventDefault(); requestOtp()">
              <label>Email address</label>
              <input class="hw-input" type="email" [value]="email()"
                     (input)="email.set($any($event.target).value)" placeholder="you@company.com" />
              <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt"
                      [disabled]="loading() || !validEmail()">
                {{ loading() ? 'Sending…' : 'Send code' }}
              </button>
            </form>
          }
          @case ('otp') {
            <h2>Enter the code</h2>
            <p class="sub">We sent a 6-digit code to <strong>{{ email() }}</strong>.</p>
            <form (submit)="$event.preventDefault(); verifyOtp()">
              <label>One-time code</label>
              <input class="hw-input" inputmode="numeric" maxlength="6" [value]="otp()"
                     (input)="otp.set($any($event.target).value)" placeholder="123456" />
              <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt"
                      [disabled]="loading() || otp().length < 6">
                {{ loading() ? 'Verifying…' : 'Verify code' }}
              </button>
            </form>
          }
          @case ('password') {
            <h2>Choose a new password</h2>
            <p class="sub">Set a new password for <strong>{{ email() }}</strong>.</p>
            <form (submit)="$event.preventDefault(); resetPassword()">
              <label>New password</label>
              <input class="hw-input" type="password" [value]="pw()"
                     (input)="pw.set($any($event.target).value)" placeholder="At least 8 characters" />
              <label>Confirm password</label>
              <input class="hw-input" type="password" [value]="pw2()"
                     (input)="pw2.set($any($event.target).value)" placeholder="Re-enter password" />
              @if (pw2() && pw() !== pw2()) { <span class="err">Passwords do not match.</span> }
              <button type="submit" class="hw-btn hw-btn--primary hw-btn--block mt"
                      [disabled]="loading() || !canSubmitPw()">
                {{ loading() ? 'Saving…' : 'Update password' }}
              </button>
            </form>
          }
          @case ('done') {
            <h2>Password updated</h2>
            <p class="sub">You can now sign in with your new password.</p>
          }
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
    .banner { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
    .banner.err { background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .back { display: block; text-align: center; margin-top: 24px; color: var(--hw-red);
      font-size: 13px; font-weight: 500; }
  `],
})
export class ResetPassword {
  private auth = inject(AuthService);

  step = signal<Step>('email');
  loading = signal(false);
  error = signal('');

  email = signal('');
  otp = signal('');
  pw = signal('');
  pw2 = signal('');
  private resetToken = signal('');

  validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()));
  canSubmitPw = computed(() => this.pw().length >= 8 && this.pw() === this.pw2());

  requestOtp() {
    this.error.set('');
    this.loading.set(true);
    this.auth.forgotPassword(this.email()).subscribe({
      next: () => { this.loading.set(false); this.step.set('otp'); },
      error: () => { this.loading.set(false); this.step.set('otp'); }, // don't reveal existence
    });
  }

  verifyOtp() {
    this.error.set('');
    this.loading.set(true);
    this.auth.verifyOtp(this.email(), this.otp()).subscribe({
      next: (res) => { this.loading.set(false); this.resetToken.set(res.resetToken); this.step.set('password'); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Incorrect or expired code.');
      },
    });
  }

  resetPassword() {
    this.error.set('');
    this.loading.set(true);
    this.auth.resetPassword(this.resetToken(), this.pw()).subscribe({
      next: () => { this.loading.set(false); this.step.set('done'); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Could not reset the password. Please start over.');
      },
    });
  }
}
