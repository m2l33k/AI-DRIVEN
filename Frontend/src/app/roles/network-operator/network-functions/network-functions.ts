import { Component, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

interface NF {
  name: string; type: string; region: string; inst: number; cpu: number; mem: number; up: boolean;
}

@Component({
  selector: 'app-network-functions',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Network Functions"
      subtitle="Monitor and control 5G Core NF instances (nf:read · nf:restart)">
      <button class="hw-btn hw-btn--primary">+ Deploy NF</button>
    </hw-page-header>

    <div class="cards">
      @for (n of nfs(); track n.name) {
        <div class="hw-card nf">
          <div class="nf-top">
            <div><span class="type">{{ n.type }}</span><strong class="mono">{{ n.name }}</strong></div>
            <span class="st" [class.up]="n.up" [class.down]="!n.up">
              <i></i>{{ n.up ? 'Running' : 'Degraded' }}</span>
          </div>
          <div class="meta"><span>{{ n.region }}</span><span>{{ n.inst }} instances</span></div>
          <div class="gauge"><label>CPU</label><div class="bar"><i [style.width.%]="n.cpu" [class.hot]="n.cpu>85"></i></div><span>{{ n.cpu }}%</span></div>
          <div class="gauge"><label>MEM</label><div class="bar"><i [style.width.%]="n.mem" [class.hot]="n.mem>85"></i></div><span>{{ n.mem }}%</span></div>
          <div class="acts">
            <button class="mini" (click)="restart(n)">↻ Restart</button>
            <button class="mini">Logs</button>
            <button class="mini">Scale</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap: 16px; }
    .nf { padding: 18px 20px; }
    .nf-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .type { display: block; font-size: 11px; color: var(--hw-text-3); font-weight: 600; letter-spacing: .5px; }
    .mono { font-family: monospace; font-size: 15px; }
    .st { font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; }
    .st i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .st.up { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .st.down { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .meta { display: flex; gap: 14px; color: var(--hw-text-3); font-size: 12px; margin: 12px 0 14px; }
    .gauge { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .gauge label { width: 32px; font-size: 11px; color: var(--hw-text-3); font-weight: 600; }
    .bar { flex: 1; height: 6px; background: var(--hw-border); border-radius: 4px; overflow: hidden; }
    .bar i { display: block; height: 100%; background: var(--hw-info); }
    .bar i.hot { background: var(--hw-danger); }
    .gauge span { width: 38px; text-align: right; font-size: 12px; color: var(--hw-text-2); }
    .acts { display: flex; gap: 8px; margin-top: 14px; border-top: 1px solid var(--hw-border); padding-top: 14px; }
    .mini { flex: 1; border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 7px; font-size: 12px; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
  `],
})
export class NetworkFunctions {
  nfs = signal<NF[]>([
    { name: 'amf-01', type: 'AMF', region: 'eu-west-1', inst: 3, cpu: 42, mem: 61, up: true },
    { name: 'smf-01', type: 'SMF', region: 'eu-west-1', inst: 2, cpu: 55, mem: 48, up: true },
    { name: 'upf-01', type: 'UPF', region: 'eu-west-1', inst: 4, cpu: 78, mem: 72, up: true },
    { name: 'upf-02', type: 'UPF', region: 'eu-central-1', inst: 2, cpu: 91, mem: 88, up: false },
    { name: 'ausf-01', type: 'AUSF', region: 'eu-west-1', inst: 2, cpu: 24, mem: 33, up: true },
    { name: 'udm-01', type: 'UDM', region: 'eu-west-1', inst: 2, cpu: 37, mem: 45, up: true },
  ]);

  restart(n: NF) {
    // UI-only: mark degraded NF back to running for demo feedback
    this.nfs.update((list) => list.map((x) => x.name === n.name ? { ...x, up: true, cpu: 20, mem: 30 } : x));
  }
}
