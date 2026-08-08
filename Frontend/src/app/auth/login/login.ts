import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth">
      <!-- Left brand panel -->
      <section class="brand-panel">
        <div class="brand-top">
          <span class="logo">5GC</span>
          <span class="brand-name">CloudOps Console</span>
        </div>
        <div class="brand-copy">
          <h1>5G Core<br/>Operations Platform</h1>
          <p>Unified management for network functions, security posture and
             platform governance — all in one console.</p>
        </div>
        <ul class="brand-points">
          <li>Real-time network function health</li>
          <li>Security &amp; roaming threat analytics</li>
          <li>Role-based access &amp; full audit trail</li>
        </ul>
        <span class="brand-foot">© 2026 CloudOps · 5G Core Platform</span>
      </section>

      <!-- Right form panel -->
      <section class="form-panel">
        <div class="form-box">
          <h2>Sign in</h2>
          <p class="sub">Welcome back. Please enter your credentials.</p>

          @if (error()) { <div class="banner err">{{ error() }}</div> }
          @if (info()) { <div class="banner info">{{ info() }}</div> }

          <form (submit)="$event.preventDefault(); submit()">
            <label>Email</label>
            <input class="hw-input" type="email" [value]="email()"
                   (input)="email.set($any($event.target).value)"
                   placeholder="you@company.com" autocomplete="username" />

            <label>Password</label>
            <div class="pw">
              <input class="hw-input" [type]="showPw() ? 'text' : 'password'"
                     [value]="password()" (input)="password.set($any($event.target).value)"
                     placeholder="Enter your password" autocomplete="current-password" />
              <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())">
                {{ showPw() ? 'Hide' : 'Show' }}
              </button>
            </div>

            <div class="row-between">
              <span></span>
              <a routerLink="/reset-password" class="link">Forgot password?</a>
            </div>

            <button type="submit" class="hw-btn hw-btn--primary hw-btn--block"
                    [disabled]="loading() || !email() || !password()">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .auth { display: flex; min-height: 100vh; }

    .brand-panel {
      flex: 1; background: linear-gradient(150deg, #7a0007 0%, #c7000b 60%, #e60012 100%);
      color: #fff; padding: 48px 56px; display: flex; flex-direction: column;
      justify-content: space-between; position: relative; overflow: hidden;
    }
    .brand-panel::after {
      content: ''; position: absolute; right: -120px; bottom: -120px;
      width: 380px; height: 380px; border-radius: 50%;
      background: rgba(255,255,255,.08);
    }
    .brand-top { display: flex; align-items: center; gap: 12px; z-index: 1; }
    .logo {
      background: #fff; color: var(--hw-red); font-weight: 800; width: 40px; height: 40px;
      border-radius: 8px; display: grid; place-items: center; letter-spacing: -1px;
    }
    .brand-name { font-size: 16px; font-weight: 600; }
    .brand-copy { z-index: 1; }
    .brand-copy h1 { font-size: 40px; line-height: 1.15; margin: 0 0 16px; font-weight: 700; }
    .brand-copy p { font-size: 15px; max-width: 380px; opacity: .9; margin: 0; }
    .brand-points { list-style: none; padding: 0; margin: 0; z-index: 1; }
    .brand-points li {
      padding: 8px 0 8px 26px; position: relative; opacity: .92; font-size: 14px;
    }
    .brand-points li::before {
      content: '✓'; position: absolute; left: 0; font-weight: 700;
    }
    .brand-foot { font-size: 12px; opacity: .7; z-index: 1; }

    .form-panel { flex: 1; display: grid; place-items: center; padding: 40px; background: var(--hw-surface); }
    .form-box { width: 100%; max-width: 380px; }
    h2 { margin: 0 0 6px; font-size: 26px; font-weight: 700; }
    .sub { margin: 0 0 28px; color: var(--hw-text-3); }
    label { display: block; font-size: 13px; font-weight: 500; margin: 16px 0 6px; color: var(--hw-text-2); }
    .pw { position: relative; }
    .pw-toggle {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      border: 0; background: transparent; color: var(--hw-red); font-size: 12px; font-weight: 600;
    }
    .row-between { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 20px; }
    .link { color: var(--hw-red); font-size: 13px; font-weight: 500; }
    .banner { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 4px; }
    .banner.err { background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .banner.info { background: rgba(0,168,112,.1); color: var(--hw-success); }

    @media (max-width: 860px) { .brand-panel { display: none; } }
  `],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  showPw = signal(false);
  loading = signal(false);
  error = signal('');
  info = signal('');

  submit() {
    this.error.set('');
    this.info.set('');
    this.loading.set(true);
    this.auth.login(this.email(), this.password()).subscribe({
      next: (res) => {
        this.loading.set(false);
        switch (res.status) {
          case 'SUCCESS':
            this.router.navigateByUrl(this.auth.homeRoute());
            break;
          case 'PASSWORD_CHANGE_REQUIRED':
            this.router.navigate(['/first-login']);
            break;
          case 'EMAIL_VERIFICATION_REQUIRED':
            this.info.set(res.message || 'Please verify your email address before logging in.');
            break;
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 401 || err.status === 400
          ? 'Invalid username or password.'
          : 'Unable to sign in. Please try again.');
      },
    });
  }
}
