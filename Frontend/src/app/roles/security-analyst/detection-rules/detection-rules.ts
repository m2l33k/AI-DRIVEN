import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, catchError, of } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Category = 'Signalling' | 'Fraud' | 'Auth' | 'Roaming' | 'Other';

interface DetectionRule {
  id?: string;
  name: string;
  category: string;
  severity: Severity;
  enabled: boolean;
  thresholdValue: number;
  description: string;
  hitCount: number;
  createdAt?: string;
  updatedAt?: string;
}

const BLANK: DetectionRule = {
  name: '', category: 'Signalling', severity: 'MEDIUM',
  enabled: true, thresholdValue: 0, description: '', hitCount: 0,
};

const BASE = '/api/rules';

const SEV_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

@Component({
  selector: 'app-detection-rules',
  standalone: true,
  imports: [PageHeader, CommonModule, DatePipe, FormsModule],
  template: `
    <hw-page-header title="Detection Rules"
      subtitle="Configure signalling and roaming detection logic (detection-rules:read · detection-rules:write)">
      <span class="live-badge" [class.active]="live()">
        <span class="dot"></span>{{ live() ? 'LIVE' : 'connecting…' }}
      </span>
      <button class="hw-btn hw-btn--primary" (click)="openAdd()">+ New rule</button>
    </hw-page-header>

    <!-- add / edit form -->
    @if (formOpen()) {
      <div class="hw-card form-card">
        <div class="form-head">
          <h3>{{ editId() ? 'Edit rule ' + editId() : 'New detection rule' }}</h3>
          <button class="icon-btn" (click)="closeForm()">✕</button>
        </div>
        <div class="form-grid">
          <label class="field span2">
            <span class="fl">Name</span>
            <input class="hw-input" placeholder="e.g. Registration Flood" [(ngModel)]="draft.name" />
          </label>
          <label class="field">
            <span class="fl">Category</span>
            <select class="hw-input" [(ngModel)]="draft.category">
              <option>Signalling</option><option>Fraud</option>
              <option>Auth</option><option>Roaming</option><option>Other</option>
            </select>
          </label>
          <label class="field">
            <span class="fl">Severity</span>
            <select class="hw-input" [(ngModel)]="draft.severity">
              <option value="CRITICAL">CRITICAL</option><option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
            </select>
          </label>
          <label class="field">
            <span class="fl">Threshold value <small class="muted">(0 = z-score based)</small></span>
            <input type="number" min="0" class="hw-input" [(ngModel)]="draft.thresholdValue" />
          </label>
          <label class="field field-toggle">
            <span class="fl">Enabled</span>
            <button class="switch" [class.on]="draft.enabled" (click)="draft.enabled = !draft.enabled">
              <i></i>
            </button>
          </label>
          <label class="field span4">
            <span class="fl">Description</span>
            <textarea class="hw-input ta" rows="2" placeholder="Describe when and why this rule fires…"
              [(ngModel)]="draft.description"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button class="hw-btn" (click)="closeForm()">Cancel</button>
          <button class="hw-btn hw-btn--primary" [disabled]="!draft.name.trim()" (click)="saveForm()">
            {{ editId() ? 'Save changes' : 'Create rule' }}
          </button>
        </div>
      </div>
    }

    <!-- table -->
    <div class="hw-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Threshold</th>
            <th>Hits (all-time)</th>
            <th>Enabled</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (r of sorted(); track r.id) {
            <tr
              [class.row-disabled]="!r.enabled"
              [class.row-expanded]="selected()?.id===r.id"
              (click)="toggleSelect(r)">
              <td>
                <div class="rn">
                  <span class="mono id-label">{{ r.id }}</span>
                  <strong class="rn-name" [class.dim]="!r.enabled">{{ r.name }}</strong>
                </div>
              </td>
              <td><span class="cat">{{ r.category }}</span></td>
              <td><span class="sev" [class]="r.severity">{{ r.severity }}</span></td>
              <td class="mono">{{ r.thresholdValue > 0 ? r.thresholdValue + '/s' : 'z-score' }}</td>
              <td class="mono hits">{{ r.hitCount }}</td>
              <td>
                <button class="switch" [class.on]="r.enabled"
                  (click)="toggleRule(r); $event.stopPropagation()">
                  <i></i>
                </button>
              </td>
              <td class="right actions" (click)="$event.stopPropagation()">
                <button class="mini" (click)="openEdit(r)">Edit</button>
                <button class="mini del" (click)="deleteRule(r)">Delete</button>
              </td>
            </tr>

            @if (selected()?.id===r.id) {
              <tr class="detail-tr">
                <td colspan="7">
                  <div class="detail-panel">
                    <div class="detail-grid">
                      <div class="dl-block span2">
                        <span class="dl-label">Description</span>
                        <span class="dl-val">{{ r.description || '—' }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Created</span>
                        <span class="dl-val mono small">{{ r.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Last updated</span>
                        <span class="dl-val mono small">{{ r.updatedAt | date:'yyyy-MM-dd HH:mm' }}</span>
                      </div>
                    </div>
                    <div class="detail-footer">
                      <span class="sev" [class]="r.severity">{{ r.severity }}</span>
                      <span class="cat">{{ r.category }}</span>
                      <button class="close-btn" (click)="selected.set(null); $event.stopPropagation()">Dismiss</button>
                    </div>
                  </div>
                </td>
              </tr>
            }

          } @empty {
            <tr><td colspan="7" class="empty">No rules configured.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    /* live badge */
    .live-badge { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;
      color:var(--hw-text-3); padding:4px 10px; border-radius:20px; border:1px solid var(--hw-border); }
    .live-badge.active { color:#00a870; border-color:rgba(0,168,112,.3); background:rgba(0,168,112,.06); }
    .dot { width:7px; height:7px; border-radius:50%; background:currentColor; }
    .live-badge.active .dot { animation:pulse 1.4s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* form */
    .form-card { padding:20px; margin-bottom:16px; animation:slide-in .18s ease; }
    @keyframes slide-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
    .form-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .form-head h3 { margin:0; font-size:15px; font-weight:600; }
    .icon-btn { border:none; background:none; font-size:18px; color:var(--hw-text-3); cursor:pointer;
      padding:4px 8px; border-radius:6px; }
    .icon-btn:hover { color:var(--hw-text); background:var(--hw-bg); }

    .form-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px 16px; margin-bottom:16px; }
    .field { display:flex; flex-direction:column; gap:5px; }
    .field-toggle { justify-content:center; }
    .fl { font-size:12px; font-weight:600; color:var(--hw-text-3); }
    .span2 { grid-column:span 2; }
    .span4 { grid-column:1 / -1; }
    .ta { resize:vertical; min-height:52px; font-family:inherit; }
    .muted { color:var(--hw-text-3); font-weight:400; }

    .form-actions { display:flex; justify-content:flex-end; gap:10px; }

    /* table */
    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; color:var(--hw-text-3); font-weight:500;
      padding:10px 14px; border-bottom:1px solid var(--hw-border); font-size:12px; }
    .tbl td { padding:11px 14px; border-bottom:1px solid var(--hw-border);
      color:var(--hw-text-2); vertical-align:middle; }
    .tbl tbody tr:not(.detail-tr) { cursor:pointer; transition:background .12s; }
    .tbl tbody tr:not(.detail-tr):hover td { background:rgba(0,0,0,.02); }
    .tbl tr:last-child td { border-bottom:0; }
    .row-disabled td { opacity:.55; }
    .row-expanded td { background:rgba(52,145,250,.05) !important; }

    .rn { display:flex; flex-direction:column; gap:2px; }
    .id-label { font-size:11px; color:var(--hw-text-3); }
    .rn-name  { color:var(--hw-text); font-weight:500; font-size:13px; }
    .dim      { color:var(--hw-text-3); }
    .mono { font-family:monospace; }
    .hits { color:var(--hw-text); font-weight:500; }
    .right { text-align:right; }
    .empty { text-align:center; color:var(--hw-text-3); padding:36px; }

    .cat { font-size:12px; background:var(--hw-bg); padding:3px 9px;
      border-radius:6px; color:var(--hw-text-2); font-weight:500; }
    .sev { font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px; text-transform:uppercase; }
    .sev.CRITICAL { background:rgba(199,0,11,.12); color:var(--hw-red); }
    .sev.HIGH     { background:rgba(245,63,63,.12); color:var(--hw-danger); }
    .sev.MEDIUM   { background:rgba(255,143,31,.14); color:var(--hw-warning); }
    .sev.LOW      { background:rgba(52,145,250,.12); color:var(--hw-info); }

    .switch { width:44px; height:24px; border-radius:20px; border:0;
      background:var(--hw-border-strong); position:relative; transition:background .15s; cursor:pointer; }
    .switch i { position:absolute; top:2px; left:2px; width:20px; height:20px;
      border-radius:50%; background:#fff; transition:left .15s; pointer-events:none; }
    .switch.on { background:var(--hw-success); }
    .switch.on i { left:22px; }

    .actions { display:flex; justify-content:flex-end; gap:6px; }
    .mini { border:1px solid var(--hw-border-strong); background:#fff; border-radius:6px;
      padding:5px 11px; font-size:12px; color:var(--hw-text-2); cursor:pointer; }
    .mini:hover { border-color:var(--hw-primary); color:var(--hw-primary); }
    .mini.del:hover { border-color:var(--hw-red); color:var(--hw-red); }

    /* drilldown */
    .detail-tr td { padding:0; border-bottom:2px solid rgba(52,145,250,.12); background:#fff !important; }
    .detail-panel { padding:16px 20px 12px; background:rgba(52,145,250,.04);
      border-top:1px dashed rgba(52,145,250,.2); animation:expand .18s ease; }
    @keyframes expand { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
    .detail-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px 20px; margin-bottom:12px; }
    .dl-block { display:flex; flex-direction:column; gap:4px; }
    .span2 { grid-column:span 2; }
    .dl-label { font-size:11px; color:var(--hw-text-3); font-weight:700;
      text-transform:uppercase; letter-spacing:.04em; }
    .dl-val { font-size:13px; color:var(--hw-text); }
    .small  { font-size:11px; }
    .detail-footer { display:flex; align-items:center; gap:8px; }
    .close-btn { margin-left:auto; padding:5px 14px; border-radius:7px; font-size:12px;
      font-weight:600; border:1px solid var(--hw-border); background:#fff;
      color:var(--hw-text-2); cursor:pointer; }
    .close-btn:hover { border-color:#c7000b; color:#c7000b; }

    @media (max-width:900px) {
      .form-grid { grid-template-columns:repeat(2,1fr); }
      .span4 { grid-column:span 2; }
    }
  `],
})
export class DetectionRules implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private sub?: Subscription;

  rules    = signal<DetectionRule[]>([]);
  live     = signal(false);
  formOpen = signal(false);
  editId   = signal<string | null>(null);
  selected = signal<DetectionRule | null>(null);
  draft: DetectionRule = { ...BLANK };

  sorted = computed(() =>
    [...this.rules()].sort((a, b) =>
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || (a.id ?? '').localeCompare(b.id ?? ''))
  );

  private load() {
    this.sub?.unsubscribe();
    this.sub = this.http.get<DetectionRule[]>(BASE).pipe(catchError(() => of([])))
      .subscribe(rules => { this.rules.set(rules); this.live.set(true); });
  }

  openAdd() {
    this.draft = { ...BLANK };
    this.editId.set(null);
    this.formOpen.set(true);
    this.selected.set(null);
  }

  openEdit(r: DetectionRule) {
    this.draft = { ...r };
    this.editId.set(r.id ?? null);
    this.formOpen.set(true);
    this.selected.set(null);
  }

  closeForm() { this.formOpen.set(false); this.editId.set(null); }

  saveForm() {
    const id = this.editId();
    const req = id
      ? this.http.put<DetectionRule>(`${BASE}/${id}`, this.draft)
      : this.http.post<DetectionRule>(BASE, this.draft);
    req.subscribe(r => {
      this.rules.update(list =>
        id ? list.map(x => x.id === id ? r : x) : [...list, r]);
      this.closeForm();
    });
  }

  toggleRule(r: DetectionRule) {
    this.http.patch<DetectionRule>(`${BASE}/${r.id}/toggle`, {}).subscribe(updated => {
      this.rules.update(list => list.map(x => x.id === updated.id ? updated : x));
    });
  }

  deleteRule(r: DetectionRule) {
    if (!confirm(`Delete rule "${r.name}" (${r.id})?`)) return;
    this.http.delete(`${BASE}/${r.id}`).subscribe(() => {
      this.rules.update(list => list.filter(x => x.id !== r.id));
      if (this.selected()?.id === r.id) this.selected.set(null);
    });
  }

  toggleSelect(r: DetectionRule) {
    if (this.formOpen()) return;
    this.selected.update(cur => cur?.id === r.id ? null : r);
  }

  ngOnInit()    { this.load(); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
