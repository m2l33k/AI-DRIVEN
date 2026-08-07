import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, BarChart, DonutChart],
  template: `
    <hw-page-header title="Network Operations"
      subtitle="Live health and throughput across 5G Core network functions">
      <button class="hw-btn">Last 24h ▾</button>
      <button class="hw-btn hw-btn--primary">Refresh</button>
    </hw-page-header>

    <div class="stats">
      <hw-stat-card label="NFs healthy" value="23/24" [delta]="2.0" accent="#00a870" />
      <hw-stat-card label="Throughput" value="18.4" unit="Gbps" [delta]="6.5" accent="#3491fa" />
      <hw-stat-card label="PDU sessions" value="1.2M" [delta]="3.1" accent="#c7000b" />
      <hw-stat-card label="Avg latency" value="12" unit="ms" [delta]="-4.2" accent="#ff8f1f" />
    </div>

    <div class="grid">
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Throughput (Gbps)</h3><span class="tag">Last 24 hours</span></div>
        <hw-line-chart [data]="throughput" [labels]="hours" color="#3491fa" ariaLabel="Throughput" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>NF status</h3></div>
        <hw-donut-chart [slices]="nfStatus" centerLabel="NFs" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Sessions by NF type</h3></div>
        <hw-bar-chart [data]="sessions" [labels]="nfTypes" color="#00a870" ariaLabel="Sessions by NF" />
      </div>

      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Network functions</h3><a class="link">Manage</a></div>
        <table class="tbl">
          <thead><tr><th>NF</th><th>Type</th><th>Instances</th><th>CPU</th><th>Status</th></tr></thead>
          <tbody>
            @for (n of nfs; track n.name) {
              <tr>
                <td class="mono">{{ n.name }}</td><td>{{ n.type }}</td><td>{{ n.inst }}</td>
                <td><div class="bar"><i [style.width.%]="n.cpu"></i></div>{{ n.cpu }}%</td>
                <td><span class="st" [class.up]="n.up" [class.down]="!n.up">{{ n.up ? 'Running' : 'Degraded' }}</span></td>
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
    .mono { font-family: monospace; color: var(--hw-text); }
    .bar { display: inline-block; width: 90px; height: 6px; background: var(--hw-border); border-radius: 4px; margin-right: 8px; vertical-align: middle; overflow: hidden; }
    .bar i { display: block; height: 100%; background: var(--hw-info); }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .st.up { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .st.down { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2,1fr);} .grid { grid-template-columns: 1fr; } }
  `],
})
export class OperatorDashboard {
  hours = ['00', '04', '08', '12', '16', '20', '24'];
  throughput = [8, 11, 15, 19, 21, 17, 18];
  nfTypes = ['AMF', 'SMF', 'UPF', 'AUSF', 'UDM'];
  sessions = [42, 38, 55, 20, 30];

  nfStatus: DonutSlice[] = [
    { label: 'Running', value: 23, color: '#00a870' },
    { label: 'Degraded', value: 1, color: '#ff8f1f' },
    { label: 'Down', value: 0, color: '#f53f3f' },
  ];

  nfs = [
    { name: 'amf-01', type: 'AMF', inst: 3, cpu: 42, up: true },
    { name: 'smf-01', type: 'SMF', inst: 2, cpu: 55, up: true },
    { name: 'upf-01', type: 'UPF', inst: 4, cpu: 78, up: true },
    { name: 'upf-02', type: 'UPF', inst: 2, cpu: 91, up: false },
    { name: 'ausf-01', type: 'AUSF', inst: 2, cpu: 24, up: true },
  ];
}
