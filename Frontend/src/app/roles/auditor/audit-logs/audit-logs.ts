import { Component, computed, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface LogRow {
  ts: string; actor: string; action: string; resource: string; outcome: 'Allowed' | 'Denied' | 'Error'; ip: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Audit Logs"
      subtitle="Immutable record of every platform action (audit:read — no delete by design)">
      <button class="hw-btn">Download (.json)</button>
    </hw-page-header>

    <div class="hw-card toolbar">
      <input class="hw-input search" placeholder="Search actor, action or resource…"
             [value]="query()" (input)="query.set($any($event.target).value)" />
      <select class="hw-input sel" [value]="outcome()" (change)="outcome.set($any($event.target).value)">
        <option value="">All outcomes</option><option>Allowed</option><option>Denied</option><option>Error</option>
      </select>
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Resource</th><th>Outcome</th><th>Source IP</th></tr></thead>
        <tbody>
          @for (l of filtered(); track $index) {
            <tr>
              <td class="mono">{{ l.ts }}</td>
              <td class="mono">{{ l.actor }}</td>
              <td class="action">{{ l.action }}</td>
              <td class="mono">{{ l.resource }}</td>
              <td><span class="oc" [class]="l.outcome">{{ l.outcome }}</span></td>
              <td class="mono">{{ l.ip }}</td>
            </tr>
          } @empty { <tr><td colspan="6" class="empty">No log entries match your filters.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; padding: 14px 16px; margin-bottom: 16px; }
    .search { flex: 1; }
    .sel { max-width: 200px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 16px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .mono { font-family: monospace; font-size: 12px; }
    .action { color: var(--hw-text); font-weight: 500; }
    .oc { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .oc.Allowed { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .oc.Denied { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .oc.Error { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 32px; }
  `],
})
export class AuditLogs {
  query = signal('');
  outcome = signal('');

  logs: LogRow[] = [
    { ts: '2026-08-07 10:42:11', actor: 'admin-user', action: 'users:write', resource: 'user/j.doe', outcome: 'Allowed', ip: '10.0.1.20' },
    { ts: '2026-08-07 10:39:02', actor: 'k.bensalah', action: 'nf:restart', resource: 'nf/upf-02', outcome: 'Allowed', ip: '10.0.2.14' },
    { ts: '2026-08-07 10:31:55', actor: 'l.haddad', action: 'detection-rules:write', resource: 'rule/DR-004', outcome: 'Allowed', ip: '10.0.3.7' },
    { ts: '2026-08-07 10:22:40', actor: 's.gharbi', action: 'core-config:write', resource: 'core/plmn', outcome: 'Denied', ip: '10.0.3.9' },
    { ts: '2026-08-07 10:18:03', actor: 'o.trabelsi', action: 'audit:read', resource: 'audit/*', outcome: 'Allowed', ip: '10.0.4.2' },
    { ts: '2026-08-07 10:05:17', actor: 'admin-user', action: 'roles:write', resource: 'role/NETWORK_OPERATOR', outcome: 'Allowed', ip: '10.0.1.20' },
    { ts: '2026-08-07 09:58:44', actor: 'test-acct', action: 'platform-config:write', resource: 'config/security', outcome: 'Error', ip: '10.0.9.1' },
  ];

  filtered = computed(() => {
    const q = this.query().toLowerCase();
    const oc = this.outcome();
    return this.logs.filter((l) =>
      (!oc || l.outcome === oc) &&
      (!q || l.actor.includes(q) || l.action.includes(q) || l.resource.toLowerCase().includes(q)));
  });
}
