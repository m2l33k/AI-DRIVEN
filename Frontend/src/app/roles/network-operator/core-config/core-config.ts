import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../shared/ui/page-header';
import { FiveGcService, NetworkConfig, NetworkSlice, QosProfile, PlmnConfig } from '../../shared/fivegc/fivegc.service';

@Component({
  selector: 'app-core-config',
  standalone: true,
  imports: [PageHeader, FormsModule],
  template: `
    <hw-page-header title="5GC Core Configuration"
      subtitle="Live configuration derived from the UDR — edit and apply to push changes back to free5GC.">
      <button class="hw-btn" (click)="reload()" [disabled]="loading()">
        @if (loading()) { Loading… } @else { Refresh }
      </button>
      <button class="hw-btn hw-btn--primary" [disabled]="applying() || loading()" (click)="apply()">
        @if (applying()) { Applying… } @else { Apply to core }
      </button>
    </hw-page-header>

    @if (error()) {
      <div class="banner err">{{ error() }}</div>
    }
    @if (applyResult()) {
      <div class="banner" [class.err]="applyResult()!.status === 'partial'">
        @if (applyResult()!.status === 'ok') {
          ✓ Applied — {{ applyResult()!.updated }} of {{ applyResult()!.total }} subscriber(s) updated.
        } @else {
          ⚠ Partial — {{ applyResult()!.updated }} updated, {{ applyResult()!.errors?.length }} failed.
        }
      </div>
    }

    @if (loading()) {
      <div class="skeleton-wrap">
        <div class="skel"></div><div class="skel"></div><div class="skel"></div>
      </div>
    } @else if (config()) {
      <div class="grid">

        <!-- Network slices -->
        <div class="hw-card panel">
          <h3>Network slices <span class="src-tag">UDR live</span></h3>
          <table class="tbl">
            <thead>
              <tr><th>Slice (S-NSSAI)</th><th>SST</th><th>SD</th><th>DNN(s)</th><th>Status</th></tr>
            </thead>
            <tbody>
              @for (s of config()!.slices; track s.snssai) {
                <tr>
                  <td class="mono">{{ s.snssai }}</td>
                  <td>{{ s.sst }}</td>
                  <td class="mono">{{ s.sd || '—' }}</td>
                  <td>{{ s.dnn || '—' }}</td>
                  <td><span class="st" [class.on]="s.active">{{ s.active ? 'Active' : 'Draft' }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">No slices found in UDR</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- QoS profiles (editable) -->
        <div class="hw-card panel">
          <h3>QoS profiles <span class="src-tag editable-tag">editable</span></h3>
          @for (q of editableQos(); track q.dnn + q.fiveqi) {
            <div class="qos-row">
              <div class="qos-meta">
                <strong>{{ q.dnn }}</strong>
                <span class="qos-type" [class.gbr]="q.type === 'GBR'">{{ q.type }}</span>
              </div>
              <div class="qos-fields">
                <label>5QI
                  <input class="hw-input sm" type="number" min="1" max="79"
                         [value]="q.fiveqi"
                         (change)="patchQos(q, 'fiveqi', +$any($event.target).value)" />
                </label>
                <label>UL
                  <input class="hw-input sm" [value]="q.uplink"
                         (change)="patchQos(q, 'uplink', $any($event.target).value)" />
                </label>
                <label>DL
                  <input class="hw-input sm" [value]="q.downlink"
                         (change)="patchQos(q, 'downlink', $any($event.target).value)" />
                </label>
              </div>
            </div>
          } @empty {
            <p class="empty">No QoS profiles in UDR</p>
          }
        </div>

        <!-- PLMN & AMF parameters (editable) -->
        <div class="hw-card panel span2">
          <h3>PLMN &amp; AMF parameters <span class="src-tag editable-tag">editable</span></h3>
          @if (editablePlmn(); as p) {
            <div class="fields">
              <div class="field">
                <label>MCC</label>
                <input class="hw-input" [value]="p.mcc"
                       (change)="patchPlmn('mcc', $any($event.target).value)" />
              </div>
              <div class="field">
                <label>MNC</label>
                <input class="hw-input" [value]="p.mnc"
                       (change)="patchPlmn('mnc', $any($event.target).value)" />
              </div>
              <div class="field">
                <label>TAC</label>
                <input class="hw-input" [value]="p.tac"
                       (change)="patchPlmn('tac', $any($event.target).value)" />
              </div>
              <div class="field">
                <label>AMF Region ID</label>
                <input class="hw-input" [value]="p.amfRegionId"
                       (change)="patchPlmn('amfRegionId', $any($event.target).value)" />
              </div>
              <div class="field">
                <label>AMF Set ID</label>
                <input class="hw-input" [value]="p.amfSetId"
                       (change)="patchPlmn('amfSetId', $any($event.target).value)" />
              </div>
              <div class="field">
                <label>NRF endpoint</label>
                <input class="hw-input" [value]="p.nrfEndpoint"
                       (change)="patchPlmn('nrfEndpoint', $any($event.target).value)" />
              </div>
            </div>
          }
        </div>

      </div>
    }
  `,
  styles: [`
    .banner { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px;
      background: rgba(0,168,112,.1); color: var(--hw-success); border: 1px solid rgba(0,168,112,.3); }
    .banner.err { background: rgba(245,63,63,.1); color: var(--hw-danger); border-color: rgba(245,63,63,.3); }

    /* skeleton */
    .skeleton-wrap { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
    .skel { height: 140px; border-radius: 12px; background: linear-gradient(90deg,#f0e8ea 25%,#f8f0f2 50%,#f0e8ea 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel h3 { margin: 0 0 14px; font-size: 15px; display: flex; align-items: center; gap: 8px; }

    .src-tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
      background: rgba(0,168,112,.12); color: var(--hw-success); text-transform: uppercase; letter-spacing: .04em; }
    .editable-tag { background: rgba(52,145,250,.12); color: #3491fa; }

    /* table */
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 10px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; color: var(--hw-text); }
    .st { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
      background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .st.on { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .empty { text-align: center; color: var(--hw-text-3); font-size: 13px; padding: 20px; }

    /* QoS rows */
    .qos-row { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--hw-border); }
    .qos-row:last-child { border-bottom: none; }
    .qos-meta { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
    .qos-meta strong { font-size: 14px; }
    .qos-type { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; width: fit-content;
      background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .qos-type.gbr { background: rgba(245,145,50,.12); color: #f59132; }
    .qos-fields { display: flex; gap: 10px; flex-wrap: wrap; }
    .qos-fields label { font-size: 12px; color: var(--hw-text-2); display: flex; flex-direction: column; gap: 4px; }

    /* PLMN fields */
    .fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .field label { display: block; font-size: 13px; margin-bottom: 6px; color: var(--hw-text-2); }

    /* small input */
    .hw-input.sm { width: 80px; padding: 5px 8px; font-size: 12px; }

    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .fields { grid-template-columns: 1fr; } }
  `],
})
export class CoreConfig implements OnInit {
  private svc = inject(FiveGcService);

  loading   = signal(true);
  applying  = signal(false);
  error     = signal('');
  applyResult = signal<{ updated: number; total: number; status: string; errors?: string[] } | null>(null);

  config       = signal<NetworkConfig | null>(null);
  editableQos  = signal<QosProfile[]>([]);
  editablePlmn = signal<PlmnConfig | null>(null);

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.applyResult.set(null);
    this.svc.getNetworkConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.editableQos.set(cfg.qosProfiles.map(q => ({ ...q })));
        this.editablePlmn.set({ ...cfg.plmn });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Could not load configuration from free5GC: ' + (err.message ?? err.status));
        this.loading.set(false);
      },
    });
  }

  patchQos(q: QosProfile, field: keyof QosProfile, value: unknown) {
    this.editableQos.update(list =>
      list.map(item => item.dnn === q.dnn && item.fiveqi === (field === 'fiveqi' ? q.fiveqi : q.fiveqi)
        ? { ...item, [field]: value }
        : item)
    );
  }

  patchPlmn(field: keyof PlmnConfig, value: string) {
    this.editablePlmn.update(p => p ? { ...p, [field]: value } : p);
  }

  apply() {
    const cfg = this.config();
    if (!cfg) return;
    this.applying.set(true);
    this.applyResult.set(null);
    this.error.set('');

    const payload: NetworkConfig = {
      plmn:        this.editablePlmn()!,
      slices:      cfg.slices,
      qosProfiles: this.editableQos(),
    };

    this.svc.applyNetworkConfig(payload).subscribe({
      next: (res) => {
        this.applyResult.set(res);
        this.applying.set(false);
        this.reload();
      },
      error: (err) => {
        this.error.set('Apply failed: ' + (err.error?.message ?? err.message ?? err.status));
        this.applying.set(false);
      },
    });
  }
}
