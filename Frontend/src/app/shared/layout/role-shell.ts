import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

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
              @if (!collapsed()) { <span class="uname">{{ userName() }}</span> }
            </div>
            <button class="icon-btn logout" (click)="logout()" aria-label="Sign out">
              <svg viewBox="0 0 24 24" class="ico"><path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        </header>

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
  `],
})
export class RoleShell {
  brand = input<string>('CloudOps Console');
  roleName = input<string>('User');
  accent = input<string>('var(--hw-red)');
  navItems = input<NavItem[]>([]);
  userName = input<string>('Admin User');

  collapsed = signal(false);

  constructor(private router: Router) {}

  userInitials = () =>
    this.userName().split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  logout() {
    this.router.navigate(['/login']);
  }
}
