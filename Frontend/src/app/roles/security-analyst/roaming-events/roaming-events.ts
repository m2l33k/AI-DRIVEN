import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { LineChart } from '../../../shared/charts/line-chart';

@Component({
  selector: 'app-roaming-events',
  standalone: true,
  imports: [PageHeader, LineChart],
  template: `
    <hw-page-header title="Roaming Events"
      subtitle="Inbound and outbound roaming activity across partner PLMNs (roaming-events:read)">
      <button class="hw-btn">Export</button>
    </hw-page-header>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Roaming volume</h3><span class="tag">Events / hour · last 24h</span></div>
      <hw-line-chart [data]="volume" [labels]="hours" color="#3491fa" ariaLabel="Roaming volume" />
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Recent roaming events</h3></div>
      <table class="tbl">
        <thead><tr><th>Time</th><th>Direction</th><th>Partner PLMN</th><th>Country</th><th>Subscribers</th><th>Risk</th></tr></thead>
        <tbody>
          @for (e of events; track e.time) {
            <tr>
              <td>{{ e.time }}</td>
              <td><span class="dir" [class.in]="e.dir==='Inbound'" [class.out]="e.dir==='Outbound'">{{ e.dir }}</span></td>
              <td class="mono">{{ e.plmn }}</td><td>{{ e.country }}</td><td>{{ e.subs }}</td>
              <td><span class="risk" [class]="e.risk">{{ e.risk }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; }
    .dir { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .dir.in { background: rgba(52,145,250,.12); color: var(--hw-info); }
    .dir.out { background: rgba(114,46,209,.12); color: #722ed1; }
    .risk { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
    .risk.High { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .risk.Medium { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .risk.Low { background: rgba(0,168,112,.12); color: var(--hw-success); }
  `],
})
export class RoamingEvents {
  hours = ['00', '04', '08', '12', '16', '20', '24'];
  volume = [120, 90, 140, 260, 310, 220, 180];
  events = [
    { time: '10:42', dir: 'Inbound', plmn: '234-15', country: 'United Kingdom', subs: 1420, risk: 'Low' },
    { time: '10:31', dir: 'Inbound', plmn: '310-260', country: 'United States', subs: 89, risk: 'High' },
    { time: '10:18', dir: 'Outbound', plmn: '208-10', country: 'France', subs: 2310, risk: 'Low' },
    { time: '09:57', dir: 'Inbound', plmn: '262-01', country: 'Germany', subs: 540, risk: 'Medium' },
    { time: '09:40', dir: 'Outbound', plmn: '214-07', country: 'Spain', subs: 760, risk: 'Low' },
  ];
}
