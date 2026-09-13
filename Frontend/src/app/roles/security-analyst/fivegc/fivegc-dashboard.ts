import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { AsyncState } from '../../../shared/ui/async-state';
import { FiveGcService, NfStatus, Subscriber, UeContext } from '../../shared/fivegc/fivegc.service';

@Component({
  selector: 'app-fivegc-dashboard',
  standalone: true,
  imports: [PageHeader, AsyncState],
  template: `
    <hw-page-header title="5G Core — Security View"
      subtitle="NF health, provisioned subscribers and active UE contexts — all behind Keycloak, credentials never leave the backend.">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    <!-- NF health strip -->
    @if (nfs().length) {
      <div class="hw-card nf-strip">
        <div class="strip-head"><span class="strip-title">Network Function Health</span>
          <span class="strip-tag">{{ upCount() }}/{{ nfs().length }} running</span></div>
        <div class="nf-pills">
          @for (n of nfs(); track n.type) {
            <div class="nf-pill" [class.up]="n.up" [class.down]="!n.up" [title]="n.description">
              <i></i>
              <span>{{ n.type }}</span>
            </div>
          }
        </div>
      </div>
    }

    <!-- summary cards -->
    <div class="summary-row">
      <div class="scard">
        <span class="sval blue">{{ upCount() }}</span>
        <span class="slab">NFs Running</span>
      </div>
      <div class="scard">
        <span class="sval red">{{ downCount() }}</span>
        <span class="slab">NFs Down</span>
      </div>
      <div class="scard">
        <span class="sval">{{ subscribers().length }}</span>
        <span class="slab">Provisioned Subscribers</span>
      </div>
      <div class="scard">
        <span class="sval" [class.active]="ueContexts().length > 0">{{ ueContexts().length }}</span>
        <span class="slab">Active UE Contexts</span>
      </div>
    </div>

    <!-- UE contexts — security-relevant: who is currently connected -->
    <div class="hw-card panel">
      <div class="panel-head">
        <h3>Active UE Contexts</h3>
        <span class="tag">{{ ueContexts().length ? ueContexts().length + ' connected' : 'No active sessions' }}</span>
      </div>
      @if (ueContexts().length) {
        <table class="tbl">
          <thead><tr><th>SUPI / IMSI</th><th>Access</th><th>GUTI</th></tr></thead>
          <tbody>
            @for (u of ueContexts(); track $index) {
              <tr>
                <td class="mono">{{ u['supi'] || '—' }}</td>
                <td class="muted">{{ u['accessType'] || '3GPP' }}</td>
                <td class="mono muted small">{{ u['guti'] || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="empty">No UEs registered. Connect UERANSIM or a physical gNB to generate sessions.</p>
      }
    </div>

    <!-- Subscriber list -->
    <div class="hw-card panel">
      <div class="panel-head">
        <h3>Provisioned Subscribers (UDR)</h3>
        <span class="tag">{{ subscribers().length }} total</span>
      </div>
      @if (subscribers().length) {
        <table class="tbl">
          <thead><tr><th>IMSI (SUPI)</th><th>PLMN</th><th>MSISDN (GPSI)</th></tr></thead>
          <tbody>
            @for (s of subscribers(); track s.ueId) {
              <tr>
                <td class="mono">{{ s.ueId }}</td>
                <td class="mono muted">{{ s.plmnID }}</td>
                <td class="muted">{{ s.gpsi || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="empty">No subscribers provisioned. Use the free5GC WebConsole (port 5000) to add SIM profiles.</p>
      }
    </div>
  `,
  styles: [`
    .nf-strip { padding: 16px 20px; margin-bottom: 14px; }
    .strip-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .strip-title { font-size: 14px; font-weight: 600; }
    .strip-tag { font-size: 12px; color: var(--hw-text-3); }
    .nf-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .nf-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px;
               font-size: 12px; font-weight: 700; letter-spacing: .3px; border: 1px solid transparent; }
    .nf-pill i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .nf-pill.up   { background: rgba(0,168,112,.08); color: var(--hw-success); border-color: rgba(0,168,112,.2); }
    .nf-pill.down { background: rgba(245,63,63,.08); color: var(--hw-danger);  border-color: rgba(245,63,63,.2); }

    .summary-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
    .scard { flex: 1; min-width: 130px; padding: 14px 18px; border-radius: 10px;
             border: 1px solid var(--hw-border); background: var(--hw-bg-2);
             display: flex; flex-direction: column; gap: 4px; }
    .sval { font-size: 26px; font-weight: 800; color: var(--hw-text); }
    .sval.blue   { color: #3491fa; }
    .sval.red    { color: var(--hw-danger); }
    .sval.active { color: var(--hw-success); }
    .slab { font-size: 12px; color: var(--hw-text-3); }

    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 10px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: none; }
    .mono  { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .small { font-size: 11px; }
    .empty { margin: 0; padding: 12px 0; color: var(--hw-text-3); font-size: 13px; text-align: center; }
  `],
})
export class FiveGcDashboard implements OnInit {
  private api = inject(FiveGcService);

  nfs         = signal<NfStatus[]>([]);
  subscribers = signal<Subscriber[]>([]);
  ueContexts  = signal<UeContext[]>([]);
  loading     = signal(true);
  error       = signal<string | null>(null);

  upCount   = computed(() => this.nfs().filter((n) => n.up).length);
  downCount = computed(() => this.nfs().filter((n) => !n.up).length);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.api.nfStatus().subscribe({
      next: (v) => { this.nfs.set(v); this.loading.set(false); },
      error: (e) => { this.error.set(`5GC proxy unreachable (${e.status ?? '?'})`); this.loading.set(false); },
    });
    this.api.subscribers().subscribe({ next: (v) => this.subscribers.set(v) });
    this.api.ueContexts().subscribe({ next: (v) => this.ueContexts.set(Array.isArray(v) ? v : []) });
  }
}
