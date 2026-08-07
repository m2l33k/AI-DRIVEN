import { Component, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface Rule {
  id: string; name: string; category: string; severity: string; enabled: boolean; hits: number;
}

@Component({
  selector: 'app-detection-rules',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Detection Rules"
      subtitle="Tune signalling and roaming detection logic (detection-rules:read · detection-rules:write)">
      <button class="hw-btn hw-btn--primary">+ New rule</button>
    </hw-page-header>

    <div class="hw-card">
      <table class="tbl">
        <thead><tr><th>Rule</th><th>Category</th><th>Severity</th><th>Hits (7d)</th><th>Enabled</th><th></th></tr></thead>
        <tbody>
          @for (r of rules(); track r.id) {
            <tr>
              <td><div class="rn"><span class="mono">{{ r.id }}</span><strong>{{ r.name }}</strong></div></td>
              <td><span class="cat">{{ r.category }}</span></td>
              <td><span class="sev" [class]="r.severity">{{ r.severity }}</span></td>
              <td>{{ r.hits }}</td>
              <td>
                <button class="switch" [class.on]="r.enabled" (click)="toggle(r)"><i></i></button>
              </td>
              <td class="right"><button class="mini">Edit</button></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px 16px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .rn { display: flex; flex-direction: column; }
    .rn .mono { font-family: monospace; font-size: 11px; color: var(--hw-text-3); }
    .rn strong { color: var(--hw-text); font-weight: 500; }
    .cat { font-size: 12px; background: var(--hw-bg); padding: 3px 10px; border-radius: 6px; }
    .sev { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .sev.Critical { background: rgba(199,0,11,.12); color: var(--hw-red); }
    .sev.High { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .sev.Medium { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .switch { width: 44px; height: 24px; border-radius: 20px; border: 0; background: var(--hw-border-strong); position: relative; transition: background .15s; }
    .switch i { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
    .switch.on { background: var(--hw-success); }
    .switch.on i { left: 22px; }
    .right { text-align: right; }
    .mini { border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
  `],
})
export class DetectionRules {
  rules = signal<Rule[]>([
    { id: 'DR-001', name: 'SS7 location tracking', category: 'Signalling', severity: 'Critical', enabled: true, hits: 12 },
    { id: 'DR-002', name: 'Diameter flood detection', category: 'Signalling', severity: 'Critical', enabled: true, hits: 8 },
    { id: 'DR-003', name: 'Roaming velocity anomaly', category: 'Roaming', severity: 'High', enabled: true, hits: 21 },
    { id: 'DR-004', name: 'IMSI enumeration', category: 'Fraud', severity: 'High', enabled: false, hits: 3 },
    { id: 'DR-005', name: 'Repeated auth failure', category: 'Auth', severity: 'Medium', enabled: true, hits: 34 },
  ]);

  toggle(r: Rule) {
    this.rules.update((list) => list.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
  }
}
