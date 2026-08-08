import { Component, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface RoleDef {
  name: string;
  short: string;
  color: string;
  img: string;
  desc: string;
  perms: string[];
}

interface Perm {
  name: string;
  desc: string;
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Roles & Permissions"
      subtitle="Realm roles and the platform permissions they grant (defined in Keycloak · client platform-client)">
    </hw-page-header>

    <!-- Role profile cards -->
    <div class="cards">
      @for (r of roles; track r.name) {
        <div class="hw-card role" [style.--c]="r.color" role="button" tabindex="0"
             (click)="open(r)" (keydown.enter)="open(r)">
          <div class="banner"></div>
          <img class="avatar" [src]="r.img" [alt]="r.name" loading="lazy" />
          <div class="body">
            <span class="badge">{{ r.name }}</span>
            <span class="count">{{ r.perms.length }} permissions</span>
            <p class="desc">{{ r.desc }}</p>
            <div class="perms">
              @for (p of r.perms; track p) { <span class="perm">{{ p }}</span> }
            </div>
            <span class="view">View details →</span>
          </div>
        </div>
      }
    </div>

    <!-- Permission matrix -->
    <div class="hw-card matrix">
      <div class="mhead">
        <h3>Permission matrix</h3>
        <span class="legend"><span class="yes">✓</span> granted &nbsp; <span class="no">–</span> not granted</span>
      </div>
      <div class="scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th class="pcol">Permission</th>
              @for (r of roles; track r.name) {
                <th class="rcol"><span class="rlabel" [style.color]="r.color">{{ r.short }}</span></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (p of permissions; track p.name) {
              <tr [class.nobody]="grantedBy(p.name) === 0">
                <td class="perm-cell">
                  <span class="perm-name">{{ p.name }}</span>
                  <span class="perm-desc">{{ p.desc }}</span>
                </td>
                @for (r of roles; track r.name) {
                  <td class="cell">
                    @if (has(r, p.name)) { <span class="yes">✓</span> } @else { <span class="no">–</span> }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="foot"><code>audit:delete</code> is defined but granted to no role by design — audit logs are immutable.</p>
    </div>

    <!-- Role detail popup -->
    @if (selected(); as r) {
      <div class="overlay" (click)="close()">
        <div class="detail hw-card" [style.--c]="r.color" (click)="$event.stopPropagation()">
          <button class="x" (click)="close()" aria-label="Close">✕</button>
          <div class="banner"></div>
          <img class="avatar" [src]="r.img" [alt]="r.name" />
          <div class="dbody">
            <span class="badge">{{ r.name }}</span>
            <p class="desc">{{ r.desc }}</p>

            <div class="meta">
              <div><span class="k">Realm role</span><span class="v">{{ r.name }}</span></div>
              <div><span class="k">Console</span><span class="v">{{ r.short }}</span></div>
              <div><span class="k">Permissions</span><span class="v">{{ r.perms.length }}</span></div>
            </div>

            <h4>Permissions granted</h4>
            <ul class="plist">
              @for (p of permDetails(r); track p.name) {
                <li><code>{{ p.name }}</code><span>{{ p.desc }}</span></li>
              }
            </ul>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; margin-bottom: 22px; }
    .role { padding: 0; overflow: hidden; text-align: center; cursor: pointer;
      transition: transform .12s, box-shadow .12s; }
    .role:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(0,0,0,.12); }
    .role:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }
    .view { display: inline-block; margin-top: 12px; font-size: 12px; font-weight: 600; color: var(--c); }
    .banner { height: 76px; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 55%, #111)); }
    .avatar {
      display: block; width: 84px; height: 84px; border-radius: 50%; object-fit: cover;
      margin: -42px auto 0; border: 4px solid var(--hw-surface); background: var(--hw-bg);
      box-shadow: 0 2px 10px rgba(0,0,0,.18);
    }
    .body { padding: 12px 18px 20px; }
    .badge { display: inline-block; font-weight: 700; font-size: 12.5px; color: #fff;
      background: var(--c); padding: 4px 12px; border-radius: 6px; }
    .count { display: block; font-size: 11px; color: var(--hw-text-3); margin-top: 8px; }
    .desc { color: var(--hw-text-2); font-size: 12.5px; margin: 10px 0 14px; line-height: 1.5; }
    .perms { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .perm { font-size: 11px; background: var(--hw-bg); padding: 3px 8px; border-radius: 6px;
      color: var(--hw-text-2); font-family: monospace; }

    .matrix { padding: 18px 20px; }
    .mhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .matrix h3 { margin: 0; font-size: 15px; }
    .legend { font-size: 12px; color: var(--hw-text-3); }
    .scroll { overflow-x: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { color: var(--hw-text-3); font-weight: 500; padding: 10px; border-bottom: 1px solid var(--hw-border); text-align: center; }
    .tbl th.pcol { text-align: left; }
    .rlabel { font-weight: 700; font-size: 12px; }
    .tbl td { padding: 9px 10px; border-bottom: 1px solid var(--hw-border); text-align: center; }
    .perm-cell { text-align: left !important; display: flex; flex-direction: column; gap: 1px; }
    .perm-name { font-family: monospace; color: var(--hw-text); }
    .perm-desc { font-size: 11px; color: var(--hw-text-3); }
    .yes { color: var(--hw-success); font-weight: 700; }
    .no { color: var(--hw-border-strong); }
    tr.nobody .perm-name { color: var(--hw-text-3); }
    .foot { margin: 14px 0 0; font-size: 12px; color: var(--hw-text-3); }
    .foot code { font-family: monospace; background: var(--hw-bg); padding: 1px 5px; border-radius: 4px; }
    @media (max-width: 1100px) { .cards { grid-template-columns: repeat(2,1fr); } }
    @media (max-width: 620px) { .cards { grid-template-columns: 1fr; } }

    /* Detail popup */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: grid; place-items: center; z-index: 60; padding: 20px; }
    .detail { width: 100%; max-width: 460px; padding: 0; overflow: hidden auto; position: relative; max-height: 90vh; text-align: center; }
    .x { position: absolute; top: 10px; right: 12px; z-index: 2; border: 0; width: 28px; height: 28px;
      border-radius: 50%; background: rgba(255,255,255,.85); color: #333; cursor: pointer; font-size: 13px; }
    .x:hover { background: #fff; }
    .dbody { padding: 8px 24px 24px; }
    .dbody .desc { color: var(--hw-text-2); font-size: 13px; margin: 12px 0 0; line-height: 1.5; }
    .meta { display: flex; justify-content: center; gap: 28px; margin: 18px 0; }
    .meta .k { display: block; font-size: 11px; color: var(--hw-text-3); }
    .meta .v { font-weight: 600; color: var(--hw-text); font-size: 13px; }
    .dbody h4 { text-align: left; margin: 6px 0 8px; font-size: 13px; color: var(--hw-text); }
    .plist { list-style: none; padding: 0; margin: 0; text-align: left; }
    .plist li { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-bottom: 1px solid var(--hw-border); }
    .plist li:last-child { border-bottom: 0; }
    .plist code { font-family: monospace; font-size: 12px; color: var(--c); }
    .plist span { font-size: 12px; color: var(--hw-text-3); }
  `],
})
export class AdminRoles {
  /** Realm composite roles and the client permissions each grants — mirrors platform-realm.json. */
  roles: RoleDef[] = [
    {
      name: 'PLATFORM_ADMIN', short: 'Admin', color: '#c7000b',
      img: 'https://i.pinimg.com/736x/10/16/9f/10169f240fee4d07150422bbdd4f1f89.jpg',
      desc: 'Manage users, roles and platform config. Cannot operate the 5GC.',
      perms: ['users:read', 'users:write', 'roles:read', 'roles:write', 'platform-config:read', 'platform-config:write'],
    },
    {
      name: 'NETWORK_OPERATOR', short: 'Operator', color: '#3491fa',
      img: 'https://i.pinimg.com/736x/6b/01/ca/6b01ca3ef01e15325010480f680255c9.jpg',
      desc: 'View NF status, restart NFs and apply config to the core. Cannot manage users or delete audit logs.',
      perms: ['nf:read', 'nf:restart', 'core-config:read', 'core-config:write'],
    },
    {
      name: 'SECURITY_ANALYST', short: 'Security', color: '#00a870',
      img: 'https://i.pinimg.com/736x/33/36/cd/3336cd972e2ddcf8a0fabe6d4b287687.jpg',
      desc: 'View security alerts and roaming events, tune detection rules. Cannot change network config.',
      perms: ['security-alerts:read', 'roaming-events:read', 'detection-rules:read', 'detection-rules:write'],
    },
    {
      name: 'AUDITOR', short: 'Auditor', color: '#ff8f1f',
      img: 'https://i.pinimg.com/736x/e8/6b/c2/e86bc2b23a9b6358f4a1f3e1e3946333.jpg',
      desc: 'Read everything, including audit logs. Cannot write anything.',
      perms: ['users:read', 'roles:read', 'platform-config:read', 'nf:read', 'core-config:read',
              'security-alerts:read', 'roaming-events:read', 'detection-rules:read', 'audit:read'],
    },
  ];

  /** Full permission set on client platform-client. */
  permissions: Perm[] = [
    { name: 'users:read', desc: 'View users' },
    { name: 'users:write', desc: 'Create/update/delete users' },
    { name: 'roles:read', desc: 'View roles' },
    { name: 'roles:write', desc: 'Assign/modify roles' },
    { name: 'platform-config:read', desc: 'View platform configuration' },
    { name: 'platform-config:write', desc: 'Change platform configuration' },
    { name: 'nf:read', desc: 'View Network Function status' },
    { name: 'nf:restart', desc: 'Restart Network Functions' },
    { name: 'core-config:read', desc: 'View 5GC core configuration' },
    { name: 'core-config:write', desc: 'Apply configuration to the 5GC core' },
    { name: 'security-alerts:read', desc: 'View security alerts' },
    { name: 'roaming-events:read', desc: 'View roaming events' },
    { name: 'detection-rules:read', desc: 'View detection rules' },
    { name: 'detection-rules:write', desc: 'Tune detection rules' },
    { name: 'audit:read', desc: 'Read audit logs' },
    { name: 'audit:delete', desc: 'Delete audit logs (granted to nobody by design)' },
  ];

  selected = signal<RoleDef | null>(null);

  open(role: RoleDef): void {
    this.selected.set(role);
  }

  close(): void {
    this.selected.set(null);
  }

  /** The full permission objects (name + description) a role grants, in canonical order. */
  permDetails(role: RoleDef): Perm[] {
    return this.permissions.filter((p) => role.perms.includes(p.name));
  }

  has(role: RoleDef, perm: string): boolean {
    return role.perms.includes(perm);
  }

  grantedBy(perm: string): number {
    return this.roles.filter((r) => r.perms.includes(perm)).length;
  }
}
