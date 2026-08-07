import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, BarChart, DonutChart],
  template: `
    <hw-page-header title="Platform Overview"
      subtitle="Users, access and configuration health across the 5G Core platform">
      <button class="hw-btn">Export</button>
      <button class="hw-btn hw-btn--primary">+ New user</button>
    </hw-page-header>

    <div class="stats">
      <hw-stat-card label="Total users" value="248" [delta]="4.2" accent="#c7000b" />
      <hw-stat-card label="Active sessions" value="63" [delta]="8.1" accent="#3491fa" />
      <hw-stat-card label="Roles defined" value="4" [delta]="0" accent="#00a870" />
      <hw-stat-card label="Config changes (7d)" value="17" [delta]="-12" accent="#ff8f1f" />
    </div>

    <div class="grid">
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Sign-in activity</h3><span class="tag">Last 7 days</span></div>
        <hw-line-chart [data]="signins" [labels]="days" ariaLabel="Sign-in activity" />
      </div>

      <div class="hw-card panel">
        <div class="panel-head"><h3>Users by role</h3></div>
        <hw-donut-chart [slices]="roleSplit" centerLabel="Users" />
      </div>

      <div class="hw-card panel">
        <div class="panel-head"><h3>Config changes by module</h3></div>
        <hw-bar-chart [data]="configChanges" [labels]="modules" color="#722ed1"
                      ariaLabel="Config changes by module" />
      </div>

      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Recent activity</h3><a class="link">View all</a></div>
        <table class="tbl">
          <thead><tr><th>User</th><th>Action</th><th>Target</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            @for (r of activity; track r.time) {
              <tr>
                <td>{{ r.user }}</td><td>{{ r.action }}</td><td>{{ r.target }}</td><td>{{ r.time }}</td>
                <td><span class="pill" [class.ok]="r.ok" [class.no]="!r.ok">{{ r.ok ? 'Success' : 'Denied' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .link { color: var(--hw-red); font-size: 13px; font-weight: 500; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .pill { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .pill.ok { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .pill.no { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2,1fr);} .grid { grid-template-columns: 1fr; } }
  `],
})
export class AdminDashboard {
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  signins = [120, 145, 132, 168, 190, 90, 76];
  modules = ['Network', 'Security', 'IAM', 'Billing', 'Core'];
  configChanges = [6, 3, 5, 1, 2];

  roleSplit: DonutSlice[] = [
    { label: 'Platform Admin', value: 12, color: '#c7000b' },
    { label: 'Network Operator', value: 48, color: '#3491fa' },
    { label: 'Security Analyst', value: 33, color: '#00a870' },
    { label: 'Auditor', value: 155, color: '#ff8f1f' },
  ];

  activity = [
    { user: 'admin-user', action: 'Created user', target: 'j.doe', time: '2m ago', ok: true },
    { user: 'admin-user', action: 'Assigned role', target: 'NETWORK_OPERATOR', time: '18m ago', ok: true },
    { user: 'k.smith', action: 'Update config', target: 'platform-config', time: '1h ago', ok: false },
    { user: 'admin-user', action: 'Disabled user', target: 'test-acct', time: '3h ago', ok: true },
    { user: 'm.lee', action: 'Reset password', target: 'a.brown', time: '5h ago', ok: true },
  ];
}
