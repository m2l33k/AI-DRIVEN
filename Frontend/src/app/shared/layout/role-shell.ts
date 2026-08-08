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
 * Reusable console shell with a glassmorphism (liquid-glass) sidebar over a soft red canvas.
 * Three states: expanded (icons + labels), collapsed (icons only), mobile overlay.
 */
@Component({
  selector: 'hw-role-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()"
         [style.--role-accent]="accent()">

      <!-- Mobile floating menu button -->
      <button class="mobile-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menu">
        <svg class="li" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      @if (mobileOpen()) { <div class="scrim" (click)="mobileOpen.set(false)"></div> }

      <!-- Glass sidebar -->
      <aside class="sidebar">
        <div class="glass-edge"></div>

        <!-- Brand + search -->
        <div class="brand-row">
          <div class="brand">
            <span class="logo">5GC</span>
            @if (!collapsed()) { <span class="brand-name">5GC</span> }
          </div>
          @if (!collapsed()) {
            <button class="chip-btn" aria-label="Search">
              <svg class="li" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          }
        </div>

        <div class="scroll">
          <!-- Main navigation -->
          @if (!collapsed()) { <span class="nav-section">Main</span> }
          <nav>
            @for (item of navItems(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active"
                 [routerLinkActiveOptions]="{ exact: false }" class="nav-item"
                 [attr.title]="item.label" (click)="mobileOpen.set(false)">
                <svg viewBox="0 0 24 24" class="ico"><path [attr.d]="item.icon" /></svg>
                @if (!collapsed()) { <span class="lbl">{{ item.label }}</span> }
              </a>
            }
          </nav>

          <!-- Account / secondary -->
          @if (!collapsed()) { <span class="nav-section">Account</span> }
          <nav>
            <button class="nav-item" title="Notifications">
              <svg class="li" viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
              @if (!collapsed()) { <span class="lbl">Notifications</span> <span class="badge">3</span> }
              @else { <i class="dot"></i> }
            </button>
            <button class="nav-item" title="Messages">
              <svg class="li" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              @if (!collapsed()) { <span class="lbl">Messages</span> <span class="badge alt">5</span> }
              @else { <i class="dot alt"></i> }
            </button>
            <button class="nav-item" (click)="openChangePw()" title="Change password">
              <svg class="li" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
              @if (!collapsed()) { <span class="lbl">Change password</span> }
            </button>
          </nav>
        </div>

        <!-- User profile -->
        <div class="profile" [class.menu-open]="profileMenu()">
          @if (profileMenu()) {
            <div class="pmenu">
              <button (click)="openChangePw(); profileMenu.set(false)">Change password</button>
              <button class="danger" (click)="logout()">Sign out</button>
            </div>
          }
          <div class="pcard" (click)="collapsed() ? logout() : profileMenu.set(!profileMenu())">
            <span class="avatar">{{ userInitials() }}</span>
            @if (!collapsed()) {
              <div class="pinfo">
                <span class="pname">{{ displayName() }}</span>
                <span class="pmail">{{ userEmail() }}</span>
              </div>
              <button class="dots" aria-label="Menu">
                <svg class="li" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>
              </button>
            }
          </div>
        </div>

        <button class="collapse" (click)="collapsed.set(!collapsed())"
                [attr.aria-label]="collapsed() ? 'Expand' : 'Collapse'">
          <svg class="li" viewBox="0 0 24 24">
            <path [attr.d]="collapsed() ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'" />
          </svg>
          @if (!collapsed()) { <span>Collapse</span> }
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
              <svg class="li" viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
              <i class="badge-dot"></i>
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
    :host {
      --crimson: #c11536;
      --crimson-deep: #8a0f2a;
    }
    .shell {
      display: flex; height: 100vh; overflow: hidden; gap: 0;
      background:
        radial-gradient(720px 460px at 6% 2%, rgba(193,21,54,.16), transparent 62%),
        radial-gradient(680px 520px at 100% 100%, rgba(138,15,42,.10), transparent 60%),
        linear-gradient(135deg, #f6eef0 0%, #f2f3f6 45%, #eef0f4 100%);
    }

    /* ---- Glass sidebar ---- */
    .sidebar {
      position: relative; width: var(--hw-sidebar-w); flex: none;
      margin: 12px 0 12px 12px; padding: 6px 10px 10px; border-radius: 20px;
      display: flex; flex-direction: column;
      background: rgba(255,255,255,.55);
      -webkit-backdrop-filter: blur(22px) saturate(150%);
      backdrop-filter: blur(22px) saturate(150%);
      border: 1px solid rgba(255,255,255,.6);
      box-shadow: 0 10px 40px rgba(64,12,24,.14), inset 0 1px 0 rgba(255,255,255,.5);
      transition: width .2s ease, transform .2s ease;
    }
    .collapsed .sidebar { width: 76px; }
    /* subtle top reflection */
    .glass-edge {
      position: absolute; inset: 0; border-radius: 20px; pointer-events: none;
      background: linear-gradient(180deg, rgba(255,255,255,.35), transparent 24%);
    }

    .brand-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 4px; }
    .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .collapsed .brand-row { justify-content: center; padding: 8px 0 4px; }
    .logo {
      width: 34px; height: 34px; border-radius: 10px; flex: none;
      background: linear-gradient(135deg, var(--crimson), var(--crimson-deep));
      color: #fff; font-weight: 800; font-size: 13px; letter-spacing: -.5px;
      display: grid; place-items: center; box-shadow: 0 6px 16px rgba(193,21,54,.4);
    }
    .brand-name { font-size: 15px; font-weight: 700; color: #2a1a1e; white-space: nowrap; }
    .chip-btn {
      width: 32px; height: 32px; border-radius: 9px; border: 1px solid rgba(120,60,70,.14);
      background: rgba(255,255,255,.5); color: #7a4650; display: grid; place-items: center; cursor: pointer;
      transition: all .14s;
    }
    .chip-btn:hover { background: #fff; color: var(--crimson); }

    .scroll { flex: 1; overflow-y: auto; padding: 6px 0 2px; }
    .scroll::-webkit-scrollbar { width: 0; }

    .nav-section {
      display: block; padding: 14px 14px 6px; font-size: 10.5px; letter-spacing: .1em;
      text-transform: uppercase; color: #a98a90; font-weight: 700;
    }
    nav { display: flex; flex-direction: column; gap: 3px; padding: 0 6px; }
    .nav-item {
      position: relative; display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 10px 12px; border: 0; background: transparent; border-radius: 11px;
      color: #5a464b; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;
      white-space: nowrap; transition: background .16s, color .16s, box-shadow .16s;
    }
    .collapsed .nav-item { justify-content: center; padding: 11px 0; }
    .nav-item:hover { background: rgba(193,21,54,.07); color: #2a1a1e; }
    .nav-item.active {
      background: linear-gradient(135deg, var(--crimson), var(--crimson-deep));
      color: #fff; box-shadow: 0 8px 20px rgba(193,21,54,.34);
    }
    .nav-item.active .ico, .nav-item.active .li { color: #fff; }
    .ico { width: 20px; height: 20px; fill: currentColor; flex: none; }
    .li { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .lbl { flex: 1; }
    .badge {
      font-size: 11px; font-weight: 700; color: #fff; background: var(--crimson);
      padding: 1px 7px; border-radius: 10px; min-width: 18px; text-align: center;
    }
    .badge.alt { background: #f59e0b; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--crimson); position: absolute; top: 8px; right: 20px; }
    .dot.alt { background: #f59e0b; }

    /* Profile card */
    .profile { position: relative; margin: 6px 6px 0; }
    .pcard {
      display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 13px;
      background: rgba(255,255,255,.45); border: 1px solid rgba(255,255,255,.55); cursor: pointer;
      transition: background .14s;
    }
    .pcard:hover { background: rgba(255,255,255,.75); }
    .collapsed .pcard { justify-content: center; padding: 9px 0; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; flex: none; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--crimson), var(--crimson-deep));
      color: #fff; font-size: 13px; font-weight: 700;
    }
    .pinfo { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .pname { font-size: 13px; font-weight: 600; color: #2a1a1e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pmail { font-size: 11px; color: #9a7d83; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dots { border: 0; background: transparent; color: #9a7d83; padding: 2px; cursor: pointer; border-radius: 6px; }
    .dots:hover { color: var(--crimson); }
    .pmenu {
      position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; padding: 6px;
      background: rgba(255,255,255,.9); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
      border: 1px solid rgba(255,255,255,.7); border-radius: 12px; box-shadow: 0 12px 30px rgba(64,12,24,.18);
      display: flex; flex-direction: column; gap: 2px;
    }
    .pmenu button {
      border: 0; background: transparent; text-align: left; padding: 9px 12px; border-radius: 8px;
      font-size: 13px; color: #4a363b; cursor: pointer;
    }
    .pmenu button:hover { background: rgba(193,21,54,.08); color: var(--crimson); }
    .pmenu button.danger:hover { background: rgba(245,63,63,.1); color: #e0324a; }

    .collapse {
      margin-top: 8px; height: 38px; border: 0; border-radius: 12px; cursor: pointer;
      background: rgba(138,15,42,.06); color: #7a4650;
      display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600;
      transition: all .16s;
    }
    .collapse:hover { background: rgba(193,21,54,.12); color: var(--crimson); }

    /* ---- Main ---- */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      height: var(--hw-header-h); flex: none; margin: 12px 12px 0; padding: 0 18px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(255,255,255,.55); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,.6); border-radius: 16px;
      box-shadow: 0 6px 20px rgba(64,12,24,.08);
    }
    .role-badge {
      background: linear-gradient(135deg, var(--crimson), var(--crimson-deep)); color: #fff; font-weight: 600;
      font-size: 12px; padding: 5px 13px; border-radius: 20px; box-shadow: 0 4px 12px rgba(193,21,54,.3);
    }
    .top-actions { display: flex; align-items: center; gap: 10px; }
    .icon-btn {
      position: relative; width: 38px; height: 38px; border: 0; border-radius: 10px;
      background: transparent; color: #6a565b; display: grid; place-items: center; cursor: pointer;
    }
    .icon-btn:hover { background: rgba(193,21,54,.08); color: var(--crimson); }
    .badge-dot { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: var(--crimson); border: 1.5px solid #fff; }
    .content { flex: 1; overflow-y: auto; padding: 20px 24px 24px; }

    /* ---- Mobile ---- */
    .mobile-toggle {
      display: none; position: fixed; top: 16px; left: 16px; z-index: 70; width: 44px; height: 44px;
      border: 1px solid rgba(255,255,255,.6); border-radius: 12px; cursor: pointer; color: var(--crimson);
      background: rgba(255,255,255,.7); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
      box-shadow: 0 6px 18px rgba(64,12,24,.16); place-items: center;
    }
    .scrim { display: none; }

    @media (max-width: 860px) {
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; z-index: 80; width: 272px;
        margin: 12px; transform: translateX(-115%);
      }
      .mobile-open .sidebar { transform: translateX(0); }
      .collapsed .sidebar { width: 272px; }
      .mobile-toggle { display: grid; }
      .mobile-open .scrim { display: block; position: fixed; inset: 0; z-index: 75; background: rgba(30,10,16,.35); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
      .collapse { display: none; }
      .topbar { margin: 12px 12px 0 68px; }
    }

    /* ---- Change-password modal ---- */
    .overlay { position: fixed; inset: 0; background: rgba(30,10,16,.4); display: grid; place-items: center; z-index: 90; }
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
  mobileOpen = signal(false);
  profileMenu = signal(false);

  private router = inject(Router);
  private auth = inject(AuthService);

  displayName = () => this.userName() || this.auth.user()?.name || 'User';
  userEmail = () => this.auth.user()?.email || '';
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
    this.profileMenu.set(false);
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
