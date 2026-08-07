import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, DonutChart],
  template: `
    <hw-page-header title="Audit Overview"
      subtitle="Read-only view of platform activity and compliance signals (audit:read)">
      <button class="hw-btn">Export report</button>
    </hw-page-header>

    <div class="stats">
      <hw-stat-card label="Events logged (7d)" value="8,412" [delta]="3.4" accent="#ff8f1f" />
      <hw-stat-card label="Write actions" value="326" [delta]="-2.1" accent="#c7000b" />
      <hw-stat-card label="Denied actions" value="41" [delta]="5.0" accent="#f53f3f" />
      <hw-stat-card label="Active actors" value="63" [delta]="1.2" accent="#3491fa" />
    </div>

    <div class="grid">
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Events by day</h3><span class="tag">Last 7 days</span></div>
        <hw-bar-chart [data]="perDay" [labels]="days" color="#ff8f1f" ariaLabel="Events by day" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Events by outcome</h3></div>
        <hw-donut-chart [slices]="outcomes" centerLabel="Events" />
      </div>
      <div class="hw-card panel span3">
        <div class="panel-head"><h3>Most active actors</h3></div>
        <table class="tbl">
          <thead><tr><th>Actor</th><th>Role</th><th>Reads</th><th>Writes</th><th>Denied</th></tr></thead>
          <tbody>
            @for (a of actors; track a.actor) {
              <tr><td class="mono">{{ a.actor }}</td><td>{{ a.role }}</td><td>{{ a.reads }}</td>
                <td>{{ a.writes }}</td><td [class.warn]="a.denied>0">{{ a.denied }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .span3 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; color: var(--hw-text); }
    .warn { color: var(--hw-danger); font-weight: 600; }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2,1fr);} .grid { grid-template-columns: 1fr; } }
  `],
})
export class AuditorDashboard {
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  perDay = [980, 1240, 1100, 1420, 1330, 720, 612];

  outcomes: DonutSlice[] = [
    { label: 'Allowed', value: 8100, color: '#00a870' },
    { label: 'Denied', value: 41, color: '#f53f3f' },
    { label: 'Error', value: 271, color: '#ff8f1f' },
  ];

  actors = [
    { actor: 'admin-user', role: 'PLATFORM_ADMIN', reads: 420, writes: 88, denied: 2 },
    { actor: 'k.bensalah', role: 'NETWORK_OPERATOR', reads: 512, writes: 143, denied: 0 },
    { actor: 'l.haddad', role: 'SECURITY_ANALYST', reads: 388, writes: 61, denied: 5 },
    { actor: 'o.trabelsi', role: 'AUDITOR', reads: 940, writes: 0, denied: 0 },
  ];
}
