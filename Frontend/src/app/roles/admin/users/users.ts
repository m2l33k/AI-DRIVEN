import { Component, computed, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface UserRow {
  name: string; username: string; email: string; role: string; status: 'Active' | 'Disabled'; last: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Users" subtitle="Manage platform accounts and role assignments">
      <button class="hw-btn">Import CSV</button>
      <button class="hw-btn hw-btn--primary">+ New user</button>
    </hw-page-header>

    <div class="hw-card toolbar">
      <input class="hw-input search" placeholder="Search by name, username or email…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
      <select class="hw-input sel" [value]="roleFilter()" (change)="roleFilter.set($any($event.target).value)">
        <option value="">All roles</option>
        <option>PLATFORM_ADMIN</option><option>NETWORK_OPERATOR</option>
        <option>SECURITY_ANALYST</option><option>AUDITOR</option>
      </select>
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead><tr>
          <th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th></th>
        </tr></thead>
        <tbody>
          @for (u of filtered(); track u.username) {
            <tr>
              <td><div class="who"><span class="av">{{ initials(u.name) }}</span>{{ u.name }}</div></td>
              <td>{{ u.username }}</td>
              <td>{{ u.email }}</td>
              <td><span class="role">{{ u.role }}</span></td>
              <td><span class="st" [class.on]="u.status==='Active'" [class.off]="u.status==='Disabled'">
                {{ u.status }}</span></td>
              <td>{{ u.last }}</td>
              <td class="right"><button class="mini">Edit</button></td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">No users match your filters.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; padding: 14px 16px; margin-bottom: 16px; }
    .search { flex: 1; }
    .sel { max-width: 220px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px 16px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .who { display: flex; align-items: center; gap: 10px; color: var(--hw-text); font-weight: 500; }
    .av { width: 30px; height: 30px; border-radius: 50%; background: var(--hw-red-soft); color: var(--hw-red);
      font-size: 12px; font-weight: 700; display: grid; place-items: center; }
    .role { font-size: 12px; background: var(--hw-bg); padding: 3px 10px; border-radius: 6px; color: var(--hw-text-2); }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .st.on { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .st.off { background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .right { text-align: right; }
    .mini { border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 32px; }
  `],
})
export class AdminUsers {
  query = signal('');
  roleFilter = signal('');

  users: UserRow[] = [
    { name: 'Admin User', username: 'admin-user', email: 'admin-user@example.com', role: 'PLATFORM_ADMIN', status: 'Active', last: '2m ago' },
    { name: 'Karim Ben Salah', username: 'k.bensalah', email: 'k.bensalah@example.com', role: 'NETWORK_OPERATOR', status: 'Active', last: '20m ago' },
    { name: 'Lina Haddad', username: 'l.haddad', email: 'l.haddad@example.com', role: 'SECURITY_ANALYST', status: 'Active', last: '1h ago' },
    { name: 'Omar Trabelsi', username: 'o.trabelsi', email: 'o.trabelsi@example.com', role: 'AUDITOR', status: 'Active', last: '3h ago' },
    { name: 'Test Account', username: 'test-acct', email: 'test@example.com', role: 'NETWORK_OPERATOR', status: 'Disabled', last: '12d ago' },
    { name: 'Sara Gharbi', username: 's.gharbi', email: 's.gharbi@example.com', role: 'SECURITY_ANALYST', status: 'Active', last: '5h ago' },
  ];

  filtered = computed(() => {
    const q = this.query().toLowerCase();
    const rf = this.roleFilter();
    return this.users.filter((u) =>
      (!rf || u.role === rf) &&
      (!q || u.name.toLowerCase().includes(q) || u.username.includes(q) || u.email.includes(q)));
  });

  initials(name: string) {
    return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  }
}
