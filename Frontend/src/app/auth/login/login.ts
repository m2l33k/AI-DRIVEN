import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface RoleOption {
  key: string;
  name: string;
  route: string;
  desc: string;
}

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

          <form (submit)="$event.preventDefault(); submit()">
            <label>Username</label>
            <input class="hw-input" type="text" [value]="username()"
                   (input)="username.set($any($event.target).value)"
                   placeholder="e.g. admin-user" autocomplete="username" />

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
              <label class="remember">
                <input type="checkbox" [checked]="remember()"
                       (change)="remember.set($any($event.target).checked)" />
                <span>Remember me</span>
              </label>
              <a routerLink="/reset-password" class="link">Forgot password?</a>
            </div>

            <p class="pick-label">Sign in as (demo)</p>
            <div class="roles">
              @for (r of roles; track r.key) {
                <button type="button" class="role-chip"
                        [class.sel]="selected() === r.key" (click)="selected.set(r.key)">
                  <strong>{{ r.name }}</strong>
                  <span>{{ r.desc }}</span>
                </button>
              }
            </div>

            <button type="submit" class="hw-btn hw-btn--primary hw-btn--block">
              Sign in
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
    .row-between { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 4px; }
    .remember { display: flex; align-items: center; gap: 6px; margin: 0; font-weight: 400; color: var(--hw-text-2); }
    .remember input { accent-color: var(--hw-red); }
    .link { color: var(--hw-red); font-size: 13px; font-weight: 500; }

    .pick-label { font-size: 12px; color: var(--hw-text-3); margin: 22px 0 8px; }
    .roles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 22px; }
    .role-chip {
      text-align: left; border: 1px solid var(--hw-border-strong); background: var(--hw-surface);
      border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px;
      transition: all .12s;
    }
    .role-chip strong { font-size: 13px; color: var(--hw-text); }
    .role-chip span { font-size: 11px; color: var(--hw-text-3); }
    .role-chip:hover { border-color: var(--hw-red); }
    .role-chip.sel { border-color: var(--hw-red); background: var(--hw-red-soft); }

    @media (max-width: 860px) { .brand-panel { display: none; } }
  `],
})
export class Login {
  username = signal('admin-user');
  password = signal('');
  showPw = signal(false);
  remember = signal(true);
  selected = signal('admin');

  roles: RoleOption[] = [
    { key: 'admin', name: 'Platform Admin', route: '/admin', desc: 'Users, roles, config' },
    { key: 'operator', name: 'Network Operator', route: '/operator', desc: 'NFs & core config' },
    { key: 'security', name: 'Security Analyst', route: '/security', desc: 'Alerts & detection' },
    { key: 'auditor', name: 'Auditor', route: '/audit', desc: 'Read-only & audit logs' },
  ];

  constructor(private router: Router) {}

  submit() {
    const role = this.roles.find((r) => r.key === this.selected());
    this.router.navigate([role ? role.route : '/admin']);
  }
}
