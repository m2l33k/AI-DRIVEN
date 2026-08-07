import { Component, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

@Component({
  selector: 'app-core-config',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="5GC Core Configuration"
      subtitle="Apply configuration to the 5G Core (core-config:read · core-config:write)">
      <button class="hw-btn">Validate</button>
      <button class="hw-btn hw-btn--primary" (click)="apply()">Apply to core</button>
    </hw-page-header>

    @if (applied()) { <div class="banner">✓ Configuration validated and queued for rollout.</div> }

    <div class="grid">
      <div class="hw-card panel">
        <h3>Network slices</h3>
        <table class="tbl">
          <thead><tr><th>Slice (S-NSSAI)</th><th>SST</th><th>DNN</th><th>Status</th></tr></thead>
          <tbody>
            @for (s of slices; track s.snssai) {
              <tr><td class="mono">{{ s.snssai }}</td><td>{{ s.sst }}</td><td>{{ s.dnn }}</td>
                <td><span class="st" [class.on]="s.active">{{ s.active ? 'Active' : 'Draft' }}</span></td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="hw-card panel">
        <h3>QoS profiles</h3>
        @for (q of qos; track q.name) {
          <div class="qos"><div><strong>{{ q.name }}</strong><span>5QI {{ q.fiveqi }} · {{ q.type }}</span></div>
            <span class="gbr">{{ q.gbr }}</span></div>
        }
      </div>

      <div class="hw-card panel span2">
        <h3>PLMN &amp; AMF parameters</h3>
        <div class="fields">
          <div class="field"><label>MCC</label><input class="hw-input" value="208" /></div>
          <div class="field"><label>MNC</label><input class="hw-input" value="93" /></div>
          <div class="field"><label>TAC</label><input class="hw-input" value="0x0001" /></div>
          <div class="field"><label>AMF Region ID</label><input class="hw-input" value="128" /></div>
          <div class="field"><label>AMF Set ID</label><input class="hw-input" value="1" /></div>
          <div class="field"><label>NRF endpoint</label><input class="hw-input" value="https://nrf.5gc.svc:8443" /></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .banner { background: rgba(0,168,112,.1); color: var(--hw-success); border: 1px solid rgba(0,168,112,.3);
      padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel h3 { margin: 0 0 16px; font-size: 15px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 10px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; color: var(--hw-text); }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .st.on { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .qos { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--hw-border); }
    .qos strong { display: block; font-size: 14px; }
    .qos span { font-size: 12px; color: var(--hw-text-3); }
    .gbr { font-family: monospace; font-size: 13px; color: var(--hw-text-2); }
    .fields { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    .field label { display: block; font-size: 13px; margin-bottom: 6px; color: var(--hw-text-2); }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .fields { grid-template-columns: 1fr; } }
  `],
})
export class CoreConfig {
  applied = signal(false);
  slices = [
    { snssai: '01-000001', sst: 1, dnn: 'internet', active: true },
    { snssai: '02-000002', sst: 2, dnn: 'ims', active: true },
    { snssai: '03-000003', sst: 3, dnn: 'iot', active: false },
  ];
  qos = [
    { name: 'Voice (Conversational)', fiveqi: 1, type: 'GBR', gbr: '150 kbps' },
    { name: 'Video streaming', fiveqi: 4, type: 'GBR', gbr: '5 Mbps' },
    { name: 'Default data', fiveqi: 9, type: 'Non-GBR', gbr: '—' },
  ];
  apply() { this.applied.set(true); }
}
