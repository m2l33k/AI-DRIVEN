import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, BarChart, DonutChart],
  template: `
    <hw-page-header title="Security Posture"
      subtitle="Threat detection across the 5G Core signalling and roaming planes">
      <button class="hw-btn">Last 7 days ▾</button>
    </hw-page-header>

    <div class="stats">
      <hw-stat-card label="Open alerts" value="14" [delta]="-9.0" accent="#f53f3f" />
      <hw-stat-card label="Critical" value="3" [delta]="1.0" accent="#c7000b" />
      <hw-stat-card label="Roaming events" value="512" [delta]="12.4" accent="#3491fa" />
      <hw-stat-card label="Rules active" value="38" [delta]="2.0" accent="#00a870" />
    </div>

    <div class="grid">
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Alerts over time</h3><span class="tag">Last 7 days</span></div>
        <hw-line-chart [data]="alerts" [labels]="days" color="#f53f3f" ariaLabel="Alerts over time" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Alerts by severity</h3></div>
        <hw-donut-chart [slices]="severity" centerLabel="Alerts" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Top attack categories</h3></div>
        <hw-bar-chart [data]="categories" [labels]="catLabels" color="#c7000b" ariaLabel="Attack categories" />
      </div>
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Latest critical alerts</h3><a class="link">Investigate</a></div>
        <table class="tbl">
          <thead><tr><th>Severity</th><th>Signal</th><th>Source</th><th>PLMN</th><th>Time</th></tr></thead>
          <tbody>
            @for (a of latest; track a.time) {
              <tr>
                <td><span class="sev" [class]="a.sev">{{ a.sev }}</span></td>
                <td>{{ a.signal }}</td><td class="mono">{{ a.src }}</td><td>{{ a.plmn }}</td><td>{{ a.time }}</td>
              </tr>
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
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .link { color: var(--hw-red); font-size: 13px; font-weight: 500; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; }
    .sev { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .sev.Critical { background: rgba(199,0,11,.12); color: var(--hw-red); }
    .sev.High { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .sev.Medium { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2,1fr);} .grid { grid-template-columns: 1fr; } }
  `],
})
export class SecurityDashboard {
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  alerts = [22, 31, 18, 40, 27, 12, 14];
  catLabels = ['Signalling', 'Roaming', 'DoS', 'Fraud', 'Auth'];
  categories = [34, 22, 12, 18, 9];

  severity: DonutSlice[] = [
    { label: 'Critical', value: 3, color: '#c7000b' },
    { label: 'High', value: 5, color: '#f53f3f' },
    { label: 'Medium', value: 6, color: '#ff8f1f' },
  ];

  latest = [
    { sev: 'Critical', signal: 'SS7 location tracking', src: '10.20.3.14', plmn: '208-01', time: '4m ago' },
    { sev: 'Critical', signal: 'Diameter flood', src: '10.20.7.2', plmn: '310-260', time: '22m ago' },
    { sev: 'High', signal: 'Abnormal roaming spike', src: 'GRX-edge', plmn: '234-15', time: '1h ago' },
    { sev: 'Medium', signal: 'Repeated auth failure', src: 'ausf-01', plmn: '208-01', time: '2h ago' },
  ];
}
