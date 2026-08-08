import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

export interface NavItem {
  label: string;
  path: string;
  /** SVG path data (24x24 viewBox). */
  icon: string;
}

/**
 * Reusable console shell: collapsible left sidebar + top header + content outlet.
 * Every role supplies its own brand, accent colour and nav items.
 */
@Component({
  selector: 'hw-role-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell" [class.collapsed]="collapsed()" [style.--role-accent]="accent()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <span class="logo">5GC</span>
          @if (!collapsed()) { <span class="brand-name">{{ brand() }}</span> }
        </div>

        <nav>
          @for (item of navItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: false }" class="nav-item"
               [attr.title]="item.label">
              <svg viewBox="0 0 24 24" class="ico"><path [attr.d]="item.icon" /></svg>
              @if (!collapsed()) { <span>{{ item.label }}</span> }
            </a>
          }
        </nav>

        <button class="collapse" (click)="collapsed.set(!collapsed())"
                [attr.aria-label]="collapsed() ? 'Expand' : 'Collapse'">
          <svg viewBox="0 0 24 24" class="ico">
            <path [attr.d]="collapsed() ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'" />
          </svg>
        </button>
      </aside>

      <!-- Main -->
      <div class="main">
        <header class="topbar">
          <div class="crumbs">
            <span class="role-badge">{{ roleName() }}</span>
          </div>
          <div class="top-actions">
            <button class="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" class="ico"><path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11a6 6 0 00-4-5.65V5a2 2 0 10-4 0v.35A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              <i class="badge-dot"></i>
            </button>
            <div class="user">
              <span class="avatar">{{ userInitials() }}</span>
              @if (!collapsed()) { <span class="uname">{{ displayName() }}</span> }
            </div>
            <button class="icon-btn" (click)="openChangePw()" aria-label="Change password" title="Change password">
              <svg viewBox="0 0 24 24" class="ico"><path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0v3z"/></svg>
            </button>
            <button class="icon-btn logout" (click)="logout()" aria-label="Sign out" title="Sign out">
              <svg viewBox="0 0 24 24" class="ico"><path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        </header>

        @if (showChangePw()) {
          <div class="overlay" (click)="showChangePw.set(false)">
            <div class="pw-modal hw-card" (click)="$event.stopPropagation()">
              <h3>Change password</h3>
              @if (pwError()) { <div class="note err">{{ pwError() }}</div> }
              @if (pwOk()) { <div class="note ok">{{ pwOk() }}</div> }
              <label>Current password</label>
              <input class="hw-input" type="password" [value]="cur()"
                     (input)="cur.set($any($event.target).value)" />
              <label>New password</label>
              <input class="hw-input" type="password" [value]="nw()"
                     (input)="nw.set($any($event.target).value)" placeholder="At least 8 characters" />
              <label>Confirm new password</label>
              <input class="hw-input" type="password" [value]="nw2()"
                     (input)="nw2.set($any($event.target).value)" />
              @if (nw2() && nw() !== nw2()) { <span class="err">Passwords do not match.</span> }
              <div class="pw-actions">
                <button class="hw-btn" (click)="showChangePw.set(false)">Cancel</button>
                <button class="hw-btn hw-btn--primary" [disabled]="!canChangePw() || pwLoading()"
                        (click)="changePassword()">{{ pwLoading() ? 'Saving…' : 'Update password' }}</button>
              </div>
            </div>
          </div>
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }

    .sidebar {
      width: var(--hw-sidebar-w); flex: none; background: #1f1f26;
      display: flex; flex-direction: column; transition: width .18s ease;
      position: relative;
    }
    .collapsed .sidebar { width: 64px; }

    .brand {
      display: flex; align-items: center; gap: 10px; height: var(--hw-header-h);
      padding: 0 18px; color: #fff; border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .logo {
      background: var(--role-accent); color: #fff; font-weight: 800; font-size: 13px;
      width: 30px; height: 30px; border-radius: 6px; display: grid; place-items: center;
      flex: none; letter-spacing: -.5px;
    }
    .brand-name { font-size: 14px; font-weight: 600; white-space: nowrap; }

    nav { flex: 1; padding: 10px 8px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border-radius: 6px; color: #b7bac2; font-size: 14px; margin-bottom: 2px;
      white-space: nowrap; transition: background .12s, color .12s;
    }
    .nav-item:hover { background: rgba(255,255,255,.06); color: #fff; }
    .nav-item.active { background: var(--role-accent); color: #fff; }
    .ico { width: 20px; height: 20px; fill: currentColor; flex: none; }

    .collapse {
      margin: 8px; height: 34px; border: 0; border-radius: 6px;
      background: rgba(255,255,255,.06); color: #b7bac2;
      display: grid; place-items: center;
    }
    .collapse:hover { background: rgba(255,255,255,.12); color: #fff; }

    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      height: var(--hw-header-h); flex: none; background: var(--hw-surface);
      border-bottom: 1px solid var(--hw-border);
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
    }
    .role-badge {
      background: var(--hw-red-soft); color: var(--role-accent); font-weight: 600;
      font-size: 12px; padding: 5px 12px; border-radius: 20px;
    }
    .top-actions { display: flex; align-items: center; gap: 14px; }
    .icon-btn {
      position: relative; width: 36px; height: 36px; border: 0; border-radius: 8px;
      background: transparent; color: var(--hw-text-2); display: grid; place-items: center;
    }
    .icon-btn:hover { background: var(--hw-bg); color: var(--hw-text); }
    .badge-dot {
      position: absolute; top: 8px; right: 9px; width: 7px; height: 7px;
      border-radius: 50%; background: var(--hw-danger); border: 1.5px solid #fff;
    }
    .user { display: flex; align-items: center; gap: 8px; }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%; background: var(--role-accent);
      color: #fff; font-size: 13px; font-weight: 600; display: grid; place-items: center;
    }
    .uname { font-size: 13px; color: var(--hw-text); font-weight: 500; }
    .logout:hover { color: var(--hw-danger); }

    .content { flex: 1; overflow-y: auto; padding: 24px; }

    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; z-index: 60; }
    .pw-modal { width: 100%; max-width: 400px; padding: 26px 28px; }
    .pw-modal h3 { margin: 0 0 16px; font-size: 18px; color: var(--hw-text); }
    .pw-modal label { display: block; font-size: 12px; font-weight: 500; margin: 12px 0 6px; color: var(--hw-text-2); }
    .pw-modal .err { display: block; color: var(--hw-danger); font-size: 12px; margin-top: 6px; }
    .note { padding: 9px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 6px; }
    .note.err { background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .note.ok { background: rgba(0,168,112,.1); color: var(--hw-success); }
    .pw-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  `],
})
export class RoleShell {
  brand = input<string>('CloudOps Console');
  roleName = input<string>('User');
  accent = input<string>('var(--hw-red)');
  navItems = input<NavItem[]>([]);
  userName = input<string>('');

  collapsed = signal(false);
  private router = inject(Router);
  private auth = inject(AuthService);

  /** Prefer the explicit input, else fall back to the signed-in user's name. */
  displayName = () => this.userName() || this.auth.user()?.name || 'User';

  userInitials = () =>
    this.displayName().split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // ---- Change own password (PUT /api/auth/password) ----
  showChangePw = signal(false);
  cur = signal('');
  nw = signal('');
  nw2 = signal('');
  pwLoading = signal(false);
  pwError = signal('');
  pwOk = signal('');

  canChangePw = computed(() =>
    !!this.cur() && this.nw().length >= 8 && this.nw() === this.nw2());

  openChangePw() {
    this.cur.set(''); this.nw.set(''); this.nw2.set('');
    this.pwError.set(''); this.pwOk.set('');
    this.showChangePw.set(true);
  }

  changePassword() {
    this.pwError.set('');
    this.pwOk.set('');
    this.pwLoading.set(true);
    this.auth.changePassword(this.cur(), this.nw()).subscribe({
      next: () => {
        this.pwLoading.set(false);
        this.pwOk.set('Password updated.');
        this.cur.set(''); this.nw.set(''); this.nw2.set('');
      },
      error: (err) => {
        this.pwLoading.set(false);
        this.pwError.set(err.error?.error || 'Could not update password. Check your current password.');
      },
    });
  }
}
