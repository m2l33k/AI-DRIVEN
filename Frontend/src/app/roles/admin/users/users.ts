import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { UsersService } from '../../../core/users.service';
import { CreateUserRequest, UserSummary } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Users" subtitle="Manage platform accounts and role assignments">
      <button class="hw-btn hw-btn--primary" (click)="openCreate()">+ New user</button>
    </hw-page-header>

    @if (banner()) { <div class="hw-card note">{{ banner() }}</div> }
    @if (error()) { <div class="hw-card note err">{{ error() }}</div> }

    <div class="hw-card toolbar">
      <input class="hw-input search" placeholder="Search by name, username or email…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
      <button class="hw-btn" (click)="load()">Refresh</button>
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead><tr>
          <th>Name</th><th>Username</th><th>Email</th><th>Status</th><th class="right">Actions</th>
        </tr></thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="5" class="empty">Loading…</td></tr>
          } @else {
            @for (u of filtered(); track u.id) {
              <tr>
                <td><div class="who"><span class="av">{{ initials(u) }}</span>{{ fullName(u) }}</div></td>
                <td>{{ u.username }}</td>
                <td>{{ u.email }}</td>
                <td><span class="st" [class.on]="u.enabled" [class.off]="!u.enabled">
                  {{ u.enabled ? 'Active' : 'Disabled' }}</span></td>
                <td class="right">
                  <button class="mini" (click)="resetPassword(u)">Reset password</button>
                  <button class="mini danger" (click)="remove(u)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No users match your search.</td></tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (showCreate()) {
      <div class="overlay" (click)="showCreate.set(false)">
        <div class="modal hw-card" (click)="$event.stopPropagation()">
          <h3>Create user</h3>
          <p class="msub">A temporary password and a verification email are sent automatically.</p>
          @if (formError()) { <div class="note err">{{ formError() }}</div> }
          <div class="grid">
            <div><label>Username</label>
              <input class="hw-input" [value]="f.username()" (input)="f.username.set($any($event.target).value)" /></div>
            <div><label>Email</label>
              <input class="hw-input" type="email" [value]="f.email()" (input)="f.email.set($any($event.target).value)" /></div>
            <div><label>First name</label>
              <input class="hw-input" [value]="f.firstName()" (input)="f.firstName.set($any($event.target).value)" /></div>
            <div><label>Last name</label>
              <input class="hw-input" [value]="f.lastName()" (input)="f.lastName.set($any($event.target).value)" /></div>
            <div class="full"><label>Role</label>
              <select class="hw-input" [value]="f.role()" (change)="f.role.set($any($event.target).value)">
                <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                <option value="NETWORK_OPERATOR">NETWORK_OPERATOR</option>
                <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
                <option value="AUDITOR">AUDITOR</option>
              </select></div>
          </div>
          <div class="actions">
            <button class="hw-btn" (click)="showCreate.set(false)">Cancel</button>
            <button class="hw-btn hw-btn--primary" [disabled]="saving() || !f.username() || !f.email()"
                    (click)="create()">{{ saving() ? 'Creating…' : 'Create user' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; padding: 14px 16px; margin-bottom: 16px; }
    .search { flex: 1; }
    .note { padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--hw-text-2); }
    .note.err { color: var(--hw-danger); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px 16px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .who { display: flex; align-items: center; gap: 10px; color: var(--hw-text); font-weight: 500; }
    .av { width: 30px; height: 30px; border-radius: 50%; background: var(--hw-red-soft); color: var(--hw-red);
      font-size: 12px; font-weight: 700; display: grid; place-items: center; }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .st.on { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .st.off { background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .right { text-align: right; }
    .mini { border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 5px 12px;
      font-size: 12px; color: var(--hw-text-2); margin-left: 8px; }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
    .mini.danger:hover { border-color: var(--hw-danger); color: var(--hw-danger); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 32px; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; z-index: 50; }
    .modal { width: 100%; max-width: 520px; padding: 26px 28px; }
    .modal h3 { margin: 0 0 4px; font-size: 18px; }
    .msub { margin: 0 0 18px; color: var(--hw-text-3); font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid .full { grid-column: 1 / -1; }
    label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 6px; color: var(--hw-text-2); }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  `],
})
export class AdminUsers implements OnInit {
  private users = inject(UsersService);

  query = signal('');
  loading = signal(false);
  saving = signal(false);
  banner = signal('');
  error = signal('');
  formError = signal('');
  showCreate = signal(false);
  private all = signal<UserSummary[]>([]);

  f = {
    username: signal(''), email: signal(''), firstName: signal(''),
    lastName: signal(''), role: signal('NETWORK_OPERATOR'),
  };

  filtered = computed(() => {
    const q = this.query().toLowerCase();
    return this.all().filter((u) =>
      !q || this.fullName(u).toLowerCase().includes(q)
      || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.users.list().subscribe({
      next: (list) => { this.all.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Failed to load users.'); },
    });
  }

  openCreate() {
    this.formError.set('');
    this.f.username.set(''); this.f.email.set(''); this.f.firstName.set('');
    this.f.lastName.set(''); this.f.role.set('NETWORK_OPERATOR');
    this.showCreate.set(true);
  }

  create() {
    const req: CreateUserRequest = {
      username: this.f.username(), email: this.f.email(),
      firstName: this.f.firstName(), lastName: this.f.lastName(), role: this.f.role(),
    };
    this.saving.set(true);
    this.formError.set('');
    this.users.create(req).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showCreate.set(false);
        this.banner.set(res.temporaryPassword
          ? `User '${res.username}' created. Temporary password: ${res.temporaryPassword}`
          : `User '${res.username}' created; temporary password and verification email sent.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err.error?.error || 'Could not create the user.');
      },
    });
  }

  resetPassword(u: UserSummary) {
    if (!confirm(`Reset password for ${u.username}?`)) return;
    this.users.resetPassword(u.username).subscribe({
      next: (res) => this.banner.set(`Temporary password for ${u.username}: ${res.temporaryPassword}`),
      error: () => this.error.set(`Could not reset password for ${u.username}.`),
    });
  }

  remove(u: UserSummary) {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
    this.users.remove(u.username).subscribe({
      next: () => { this.banner.set(`User '${u.username}' deleted.`); this.load(); },
      error: () => this.error.set(`Could not delete ${u.username}.`),
    });
  }

  fullName(u: UserSummary) {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;
  }
  initials(u: UserSummary) {
    return this.fullName(u).split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  }
}
