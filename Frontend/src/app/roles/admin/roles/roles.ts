import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface RoleDef {
  name: string; users: number; color: string; desc: string; perms: string[];
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Roles & Permissions"
      subtitle="Realm roles and the platform permissions they grant">
      <button class="hw-btn hw-btn--primary">+ New role</button>
    </hw-page-header>

    <div class="cards">
      @for (r of roles; track r.name) {
        <div class="hw-card role">
          <div class="top" [style.--c]="r.color">
            <span class="badge">{{ r.name }}</span>
            <span class="count">{{ r.users }} users</span>
          </div>
          <p class="desc">{{ r.desc }}</p>
          <div class="perms">
            @for (p of r.perms; track p) { <span class="perm">{{ p }}</span> }
          </div>
        </div>
      }
    </div>

    <div class="hw-card matrix">
      <h3>Permission matrix</h3>
      <table class="tbl">
        <thead><tr><th>Permission</th>
          <th>Admin</th><th>Operator</th><th>Security</th><th>Auditor</th></tr></thead>
        <tbody>
          @for (row of matrix; track row.perm) {
            <tr>
              <td class="perm-name">{{ row.perm }}</td>
              @for (c of row.cells; track $index) {
                <td class="cell">
                  @if (c) { <span class="yes">✓</span> } @else { <span class="no">–</span> }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 16px; }
    .role { padding: 18px 20px; }
    .top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .badge { font-weight: 700; font-size: 13px; color: #fff; background: var(--c); padding: 5px 12px; border-radius: 6px; }
    .count { font-size: 12px; color: var(--hw-text-3); }
    .desc { color: var(--hw-text-2); font-size: 13px; margin: 0 0 14px; }
    .perms { display: flex; flex-wrap: wrap; gap: 6px; }
    .perm { font-size: 11px; background: var(--hw-bg); padding: 3px 8px; border-radius: 6px; color: var(--hw-text-2); font-family: monospace; }
    .matrix { padding: 18px 20px; }
    .matrix h3 { margin: 0 0 14px; font-size: 15px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { color: var(--hw-text-3); font-weight: 500; padding: 10px; border-bottom: 1px solid var(--hw-border); text-align: center; }
    .tbl th:first-child { text-align: left; }
    .tbl td { padding: 10px; border-bottom: 1px solid var(--hw-border); text-align: center; }
    .perm-name { text-align: left !important; font-family: monospace; color: var(--hw-text-2); }
    .yes { color: var(--hw-success); font-weight: 700; }
    .no { color: var(--hw-border-strong); }
    @media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }
  `],
})
export class AdminRoles {
  roles: RoleDef[] = [
    { name: 'PLATFORM_ADMIN', users: 12, color: '#c7000b', desc: 'Manage users, roles and platform config. Cannot operate the 5GC.',
      perms: ['users:read', 'users:write', 'roles:read', 'roles:write', 'platform-config:read', 'platform-config:write'] },
    { name: 'NETWORK_OPERATOR', users: 48, color: '#3491fa', desc: 'View NF status, restart NFs and apply config to the core.',
      perms: ['nf:read', 'nf:restart', 'core-config:read', 'core-config:write'] },
    { name: 'SECURITY_ANALYST', users: 33, color: '#00a870', desc: 'View security alerts and roaming events, tune detection rules.',
      perms: ['security-alerts:read', 'roaming-events:read', 'detection-rules:read', 'detection-rules:write'] },
    { name: 'AUDITOR', users: 155, color: '#ff8f1f', desc: 'Read everything including audit logs. Cannot write anything.',
      perms: ['*:read', 'audit:read'] },
  ];

  // cells order: [Admin, Operator, Security, Auditor]
  matrix = [
    { perm: 'users:read',           cells: [true,  false, false, true] },
    { perm: 'users:write',          cells: [true,  false, false, false] },
    { perm: 'roles:write',          cells: [true,  false, false, false] },
    { perm: 'platform-config:write',cells: [true,  false, false, false] },
    { perm: 'nf:restart',           cells: [false, true,  false, false] },
    { perm: 'core-config:write',    cells: [false, true,  false, false] },
    { perm: 'detection-rules:write',cells: [false, false, true,  false] },
    { perm: 'security-alerts:read', cells: [false, false, true,  true] },
    { perm: 'audit:read',           cells: [false, false, false, true] },
    { perm: 'audit:delete',         cells: [false, false, false, false] },
  ];
}
