import { Component, computed, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface Alert {
  id: string; sev: 'Critical' | 'High' | 'Medium' | 'Low'; title: string;
  source: string; time: string; status: 'Open' | 'Ack' | 'Resolved';
}

@Component({
  selector: 'app-security-alerts',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Security Alerts"
      subtitle="Signalling and roaming threat alerts (security-alerts:read)" />

    <div class="tabs">
      @for (t of tabs; track t) {
        <button class="tab" [class.on]="tab()===t" (click)="tab.set(t)">
          {{ t }} <span class="cnt">{{ countFor(t) }}</span>
        </button>
      }
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead><tr><th>ID</th><th>Severity</th><th>Alert</th><th>Source</th><th>Detected</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (a of filtered(); track a.id) {
            <tr>
              <td class="mono">{{ a.id }}</td>
              <td><span class="sev" [class]="a.sev">{{ a.sev }}</span></td>
              <td class="title">{{ a.title }}</td>
              <td class="mono">{{ a.source }}</td>
              <td>{{ a.time }}</td>
              <td><span class="st" [class]="a.status">{{ a.status }}</span></td>
              <td class="right"><button class="mini">Details</button></td>
            </tr>
          } @empty { <tr><td colspan="7" class="empty">No alerts in this view.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab { border: 1px solid var(--hw-border); background: #fff; border-radius: 8px; padding: 8px 16px;
      font-size: 13px; color: var(--hw-text-2); display: flex; align-items: center; gap: 8px; }
    .tab.on { border-color: var(--hw-red); color: var(--hw-red); background: var(--hw-red-soft); font-weight: 600; }
    .cnt { background: var(--hw-bg); border-radius: 20px; padding: 1px 8px; font-size: 11px; }
    .tab.on .cnt { background: #fff; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px 16px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .mono { font-family: monospace; }
    .title { color: var(--hw-text); font-weight: 500; }
    .sev { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .sev.Critical { background: rgba(199,0,11,.12); color: var(--hw-red); }
    .sev.High { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .sev.Medium { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .sev.Low { background: rgba(52,145,250,.12); color: var(--hw-info); }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .st.Open { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .st.Ack { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .st.Resolved { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .right { text-align: right; }
    .mini { border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 32px; }
  `],
})
export class SecurityAlerts {
  tabs = ['All', 'Open', 'Ack', 'Resolved'] as const;
  tab = signal<(typeof this.tabs)[number]>('All');

  alerts: Alert[] = [
    { id: 'ALT-2041', sev: 'Critical', title: 'SS7 location tracking attempt', source: '10.20.3.14', time: '4m ago', status: 'Open' },
    { id: 'ALT-2040', sev: 'Critical', title: 'Diameter signalling flood', source: '10.20.7.2', time: '22m ago', status: 'Open' },
    { id: 'ALT-2039', sev: 'High', title: 'Abnormal roaming spike (GRX)', source: 'GRX-edge', time: '1h ago', status: 'Ack' },
    { id: 'ALT-2038', sev: 'Medium', title: 'Repeated authentication failure', source: 'ausf-01', time: '2h ago', status: 'Ack' },
    { id: 'ALT-2037', sev: 'Low', title: 'Unusual NAS message rate', source: 'amf-01', time: '4h ago', status: 'Resolved' },
    { id: 'ALT-2036', sev: 'High', title: 'Suspicious IMSI enumeration', source: 'udm-01', time: '6h ago', status: 'Resolved' },
  ];

  filtered = computed(() =>
    this.tab() === 'All' ? this.alerts : this.alerts.filter((a) => a.status === this.tab()));

  countFor(t: string) {
    return t === 'All' ? this.alerts.length : this.alerts.filter((a) => a.status === t).length;
  }
}
