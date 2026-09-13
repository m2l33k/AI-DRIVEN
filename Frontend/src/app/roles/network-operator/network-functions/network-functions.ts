import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { AsyncState } from '../../../shared/ui/async-state';
import { FiveGcService, NfStatus, Subscriber, UeContext } from '../../shared/fivegc/fivegc.service';

const NF_ICONS: Record<string, string> = {
  NRF:  'M12 2a2 2 0 012 2v1h4a1 1 0 011 1v2h1a1 1 0 010 2h-1v2a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1H5a1 1 0 01-1-1v-2H3a1 1 0 010-2h1V6a1 1 0 011-1h4V4a2 2 0 012-2z',
  AMF:  'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L19 8v8l-7 3.89L5 16V8l7-3.82z',
  SMF:  'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3a3 3 0 100 6 3 3 0 000-6z',
  AUSF: 'M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z',
  UDM:  'M20 8h-3V4H3v16h14v-4h3V8zM7 9h6v2H7V9zm0 4h6v2H7v-2z',
  UDR:  'M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z',
  PCF:  'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  NSSF: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  UPF:  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
};

const NF_DESCRIPTIONS: Record<string, string> = {
  NRF:  'Network Repository Function — NF discovery and OAuth2 token issuance',
  AMF:  'Access and Mobility Function — UE registration, paging, handover',
  SMF:  'Session Management Function — PDU session lifecycle, PFCP to UPF',
  AUSF: 'Authentication Server Function — EAP-AKA′ / 5G-AKA authentication',
  UDM:  'Unified Data Management — subscription data and authentication credentials',
  UDR:  'Unified Data Repository — persistent storage for UDM/PCF/AUSF',
  PCF:  'Policy Control Function — QoS, charging, and traffic rules',
  NSSF: 'Network Slice Selection Function — slice selection for UEs',
  UPF:  'User Plane Function — GTP-U tunnel, forwarding, QoS enforcement',
};

@Component({
  selector: 'app-network-functions',
  standalone: true,
  imports: [PageHeader, AsyncState],
  template: `
    <hw-page-header title="5G Core — Network Functions"
      subtitle="Live status of free5GC control-plane NFs. Data from WebConsole proxy (Keycloak-gated).">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    <!-- NF status grid -->
    @if (nfs().length) {
      <div class="nf-grid">
        @for (n of nfs(); track n.type) {
          <div class="hw-card nf-card" [class.nf-down]="!n.up">
            <div class="nf-head">
              <svg class="nf-icon" viewBox="0 0 24 24" fill="currentColor">
                <path [attr.d]="icon(n.type)" />
              </svg>
              <div>
                <span class="nf-type">{{ n.type }}</span>
                <span class="nf-id">{{ n.instanceId }}</span>
              </div>
              <span class="nf-badge" [class.up]="n.up" [class.down]="!n.up">
                <i></i>{{ n.up ? 'Running' : 'Down' }}
              </span>
            </div>
            <p class="nf-desc">{{ desc(n.type) }}</p>
          </div>
        }
      </div>
    }

    <!-- stats row -->
    @if (nfs().length) {
      <div class="stats-row">
        <div class="scard green">
          <span class="sv">{{ upCount() }}</span>
          <span class="sl">NFs Running</span>
        </div>
        <div class="scard red">
          <span class="sv">{{ downCount() }}</span>
          <span class="sl">NFs Down</span>
        </div>
        <div class="scard blue">
          <span class="sv">{{ subscribers().length }}</span>
          <span class="sl">Provisioned Subscribers</span>
        </div>
        <div class="scard purple">
          <span class="sv">{{ ueContexts().length }}</span>
          <span class="sl">Active UE Sessions</span>
        </div>
      </div>
    }

    <!-- Subscribers table -->
    @if (subscribers().length) {
      <div class="hw-card panel">
        <div class="panel-head"><h3>Provisioned Subscribers</h3><span class="tag">{{ subscribers().length }} total</span></div>
        <table class="tbl">
          <thead><tr><th>IMSI (SUPI)</th><th>PLMN</th><th>MSISDN (GPSI)</th></tr></thead>
          <tbody>
            @for (s of subscribers(); track s.ueId) {
              <tr>
                <td class="mono">{{ s.ueId }}</td>
                <td class="mono">{{ s.plmnID }}</td>
                <td class="muted">{{ s.gpsi || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- UE Contexts table -->
    @if (ueContexts().length) {
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Registered UE Contexts</h3>
          <span class="tag">{{ ueContexts().length }} active</span>
        </div>
        <table class="tbl">
          <thead><tr><th>SUPI</th><th>Access Type</th><th>GUTI</th></tr></thead>
          <tbody>
            @for (u of ueContexts(); track $index) {
              <tr>
                <td class="mono">{{ u['supi'] || '—' }}</td>
                <td class="muted">{{ u['accessType'] || '3GPP' }}</td>
                <td class="mono muted">{{ u['guti'] || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!loading() && nfs().length) {
      <div class="hw-card panel empty-ue">
        <p>No UE contexts registered. Connect a UE (UERANSIM or physical device) to the AMF to see active sessions here.</p>
      </div>
    }
  `,
  styles: [`
    .nf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .nf-card { padding: 18px 20px; transition: border-color .2s; }
    .nf-card.nf-down { border-color: rgba(245,63,63,.3); background: rgba(245,63,63,.03); }
    .nf-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .nf-icon { width: 26px; height: 26px; color: var(--hw-info); flex-shrink: 0; }
    .nf-down .nf-icon { color: var(--hw-text-3); }
    .nf-type { display: block; font-size: 15px; font-weight: 800; color: var(--hw-text); letter-spacing: .3px; }
    .nf-id   { display: block; font-size: 11px; color: var(--hw-text-3); font-family: monospace; }
    .nf-badge { margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; }
    .nf-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .nf-badge.up   { background: rgba(0,168,112,.1); color: var(--hw-success); }
    .nf-badge.down { background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .nf-desc { font-size: 12px; color: var(--hw-text-3); line-height: 1.5; margin: 0; }

    .stats-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
    .scard { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 4px; padding: 14px 18px;
             border-radius: 10px; border: 1px solid var(--hw-border); background: var(--hw-bg-2); }
    .scard.green { border-color: rgba(0,168,112,.25); background: rgba(0,168,112,.06); }
    .scard.red   { border-color: rgba(245,63,63,.2);  background: rgba(245,63,63,.04); }
    .scard.blue  { border-color: rgba(52,145,250,.2); background: rgba(52,145,250,.04); }
    .scard.purple{ border-color: rgba(114,46,209,.2); background: rgba(114,46,209,.04); }
    .sv { font-size: 28px; font-weight: 800; color: var(--hw-text); }
    .scard.green .sv  { color: var(--hw-success); }
    .scard.red   .sv  { color: var(--hw-danger); }
    .scard.blue  .sv  { color: #3491fa; }
    .scard.purple .sv { color: #722ed1; }
    .sl { font-size: 12px; color: var(--hw-text-3); }

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
    .empty-ue { padding: 24px; text-align: center; color: var(--hw-text-3); font-size: 13px; }
    .empty-ue p { margin: 0; }
  `],
})
export class NetworkFunctions implements OnInit {
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
      error: (e) => { this.error.set(`Cannot reach 5GC proxy (${e.status ?? '?'})`); this.loading.set(false); },
    });

    this.api.subscribers().subscribe({ next: (v) => this.subscribers.set(v) });
    this.api.ueContexts().subscribe({ next: (v) => this.ueContexts.set(Array.isArray(v) ? v : []) });
  }

  icon(type: string): string { return NF_ICONS[type] ?? NF_ICONS['NRF']; }
  desc(type: string): string { return NF_DESCRIPTIONS[type] ?? ''; }
}
