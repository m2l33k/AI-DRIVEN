import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';
import { AnomalyService, AnomalyEvent, Severity } from '../../shared/anomaly/anomaly.service';

type Tab = 'All' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION_FLOOD: 'Registration Flood',
  IMSI_ENUMERATION:   'IMSI Enumeration',
  AUTH_FAILURE_SPIKE: 'Auth Failure Spike',
};

@Component({
  selector: 'app-security-alerts',
  standalone: true,
  imports: [PageHeader, CommonModule, DatePipe, DecimalPipe],
  template: `
    <hw-page-header title="Security Alerts"
      subtitle="Live anomaly events from 5G Core signalling — 5 s refresh">
      <span class="live-badge" [class.active]="live()">
        <span class="dot"></span>{{ live() ? 'LIVE' : 'connecting…' }}
      </span>
    </hw-page-header>

    <!-- tabs -->
    <div class="tabs">
      @for (t of tabs; track t) {
        <button class="tab" [class.on]="tab()===t" [class]="tab()===t ? 'tab on ' + t : 'tab'"
          (click)="tab.set(t)">
          {{ t }}
          <span class="cnt" [class.cnt-on]="tab()===t">{{ countFor(t) }}</span>
        </button>
      }
      <div class="tabs-spacer"></div>
      @if (events().length > 0) {
        <button class="export-btn" (click)="exportCsv()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      }
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead>
          <tr>
            <th class="col-sev">Severity</th>
            <th>Type</th>
            <th>Target NF</th>
            <th class="col-rate">Rate</th>
            <th>Message</th>
            <th class="col-time">Detected</th>
            <th class="col-arrow"></th>
          </tr>
        </thead>
        <tbody>
          @for (e of filtered(); track e.id) {
            <tr
              [class.row-critical]="e.severity==='CRITICAL'"
              [class.row-high]="e.severity==='HIGH'"
              [class.row-expanded]="selected()?.id===e.id"
              (click)="toggle(e)">
              <td><span class="sev" [class]="e.severity">{{ e.severity }}</span></td>
              <td class="type-cell">{{ typeLabel(e.type) }}</td>
              <td class="nf">{{ e.targetNf }}</td>
              <td class="mono rate">{{ e.observedRate | number:'1.1-1' }}/s</td>
              <td class="msg">{{ e.message }}</td>
              <td class="mono muted time">{{ e.timestamp | date:'HH:mm:ss' }}</td>
              <td class="arrow">{{ selected()?.id===e.id ? '▲' : '▸' }}</td>
            </tr>

            @if (selected()?.id===e.id) {
              <tr class="detail-tr">
                <td colspan="7">
                  <div class="detail-panel">
                    <div class="detail-grid">

                      <div class="dl-block">
                        <span class="dl-label">Event ID</span>
                        <span class="dl-val mono small">{{ e.id }}</span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Metric</span>
                        <span class="dl-val mono">{{ e.metric || '—' }}</span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Observed rate</span>
                        <span class="dl-val">
                          <span class="rate-pill" [class.rate-critical]="e.severity==='CRITICAL'" [class.rate-high]="e.severity==='HIGH'">
                            {{ e.observedRate | number:'1.2-2' }} req/s
                          </span>
                        </span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Threshold</span>
                        <span class="dl-val">{{ e.threshold > 0 ? (e.threshold | number:'1.0-0') + ' req/s' : 'z-score based' }}</span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Z-score (σ)</span>
                        <span class="dl-val">
                          @if (e.zScore > 0) {
                            <span class="zscore-bar">
                              <span class="zb-fill" [style.width.%]="zscorepct(e.zScore)"></span>
                            </span>
                            {{ e.zScore | number:'1.2-2' }} σ
                          } @else { — }
                        </span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Target NF</span>
                        <span class="dl-val">{{ e.targetNf }}</span>
                      </div>

                      <div class="dl-block dl-span2">
                        <span class="dl-label">Detection message</span>
                        <span class="dl-val">{{ e.message }}</span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Timestamp</span>
                        <span class="dl-val mono">{{ e.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                      </div>

                      <div class="dl-block">
                        <span class="dl-label">Other events (same type)</span>
                        <span class="dl-val">{{ relatedCount(e) }}</span>
                      </div>

                    </div>

                    <div class="detail-footer">
                      <span class="sev" [class]="e.severity">{{ e.severity }}</span>
                      <button class="close-btn" (click)="selected.set(null); $event.stopPropagation()">
                        Close
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            }

          } @empty {
            <tr><td colspan="7" class="empty">No alerts for this filter — system is quiet.</td></tr>
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

    /* tabs */
    .tabs { display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
    .tabs-spacer { flex:1; }
    .tab { border:1px solid var(--hw-border); background:#fff; border-radius:8px;
      padding:7px 14px; font-size:13px; color:var(--hw-text-2);
      display:flex; align-items:center; gap:7px; cursor:pointer; font-weight:500;
      transition:all .15s; }
    .tab:hover { border-color:var(--hw-text-3); }
    .tab.on.All      { border-color:var(--hw-primary); color:var(--hw-primary); background:rgba(74,144,226,.06); }
    .tab.on.CRITICAL { border-color:#c7000b; color:#c7000b; background:rgba(199,0,11,.06); }
    .tab.on.HIGH     { border-color:#f59f00; color:#b85c00; background:rgba(245,159,0,.06); }
    .tab.on.MEDIUM   { border-color:#3491fa; color:var(--hw-info); background:rgba(52,145,250,.06); }
    .tab.on.LOW      { border-color:#00a870; color:#00714a; background:rgba(0,168,112,.06); }
    .tab.on { font-weight:600; }
    .cnt { background:var(--hw-bg); border-radius:20px; padding:1px 7px; font-size:11px;
      font-weight:600; min-width:18px; text-align:center; }
    .cnt-on { background:rgba(0,0,0,.08); }

    .export-btn { display:flex; align-items:center; gap:5px; padding:7px 13px; border-radius:8px;
      font-size:12px; font-weight:600; border:1px solid var(--hw-border); background:#fff;
      color:var(--hw-text-3); cursor:pointer; }
    .export-btn:hover { color:var(--hw-primary); border-color:var(--hw-primary); }

    /* table */
    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; color:var(--hw-text-3); font-weight:500;
      padding:10px 14px; border-bottom:1px solid var(--hw-border); font-size:12px; }
    .tbl td { padding:11px 14px; border-bottom:1px solid var(--hw-border); color:var(--hw-text-2);
      vertical-align:middle; }
    .tbl tbody tr:not(.detail-tr) { cursor:pointer; transition:background .12s; }
    .tbl tbody tr:not(.detail-tr):hover td { background:rgba(0,0,0,.02); }
    .row-critical td { background:rgba(199,0,11,.035); }
    .row-high td     { background:rgba(255,143,31,.035); }
    .row-expanded td { background:rgba(52,145,250,.05) !important; }
    .tbl tr:last-child td { border-bottom:0; }

    .col-sev   { width:100px; }
    .col-rate  { width:80px; }
    .col-time  { width:80px; }
    .col-arrow { width:20px; }

    .mono   { font-family:monospace; }
    .small  { font-size:11px; }
    .muted  { color:var(--hw-text-3); }
    .nf     { color:var(--hw-text-2); }
    .type-cell { font-weight:500; color:var(--hw-text); }
    .rate   { color:var(--hw-text); }
    .time   { }
    .msg    { max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .arrow  { text-align:right; color:var(--hw-text-3); font-size:11px; }
    .empty  { text-align:center; color:var(--hw-text-3); padding:36px; }

    /* severity chips */
    .sev { font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px; text-transform:uppercase; }
    .sev.CRITICAL { background:rgba(199,0,11,.12); color:var(--hw-red); }
    .sev.HIGH     { background:rgba(245,63,63,.12); color:var(--hw-danger); }
    .sev.MEDIUM   { background:rgba(255,143,31,.14); color:var(--hw-warning); }
    .sev.LOW      { background:rgba(52,145,250,.12); color:var(--hw-info); }

    /* drilldown */
    .detail-tr td { padding:0; border-bottom:2px solid rgba(52,145,250,.15); background:#fff !important; }
    .detail-panel { padding:18px 20px 14px; background:rgba(52,145,250,.04);
      border-top:1px dashed rgba(52,145,250,.2);
      animation:expand .18s ease; }
    @keyframes expand { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }

    .detail-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px 24px; margin-bottom:14px; }
    .dl-block { display:flex; flex-direction:column; gap:4px; }
    .dl-span2 { grid-column:span 2; }
    .dl-label { font-size:11px; color:var(--hw-text-3); font-weight:700;
      text-transform:uppercase; letter-spacing:.04em; }
    .dl-val { font-size:13px; color:var(--hw-text); word-break:break-all;
      display:flex; align-items:center; gap:7px; flex-wrap:wrap; }

    .rate-pill { padding:2px 9px; border-radius:20px; font-size:12px; font-weight:600; font-family:monospace; }
    .rate-critical { background:rgba(199,0,11,.1); color:#c7000b; }
    .rate-high { background:rgba(245,159,0,.1); color:#b85c00; }

    .zscore-bar { display:inline-block; width:60px; height:6px; background:var(--hw-bg);
      border-radius:3px; overflow:hidden; vertical-align:middle; }
    .zb-fill { display:block; height:100%; background:#3491fa; border-radius:3px; transition:width .4s; }

    .detail-footer { display:flex; align-items:center; gap:10px; }
    .close-btn { margin-left:auto; padding:5px 14px; border-radius:7px; font-size:12px;
      font-weight:600; border:1px solid var(--hw-border); background:#fff;
      color:var(--hw-text-2); cursor:pointer; }
    .close-btn:hover { border-color:#c7000b; color:#c7000b; }

    @media (max-width:900px) {
      .detail-grid { grid-template-columns:repeat(2,1fr); }
      .dl-span2 { grid-column:span 2; }
    }
  `],
})
export class SecurityAlerts implements OnInit, OnDestroy {
  private anomaly = inject(AnomalyService);
  private sub?: Subscription;

  tabs: Tab[] = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  tab      = signal<Tab>('All');
  live     = signal(false);
  events   = signal<AnomalyEvent[]>([]);
  selected = signal<AnomalyEvent | null>(null);

  filtered = computed(() =>
    this.tab() === 'All'
      ? this.events()
      : this.events().filter(e => e.severity === (this.tab() as Severity))
  );

  countFor(t: Tab): number {
    return t === 'All'
      ? this.events().length
      : this.events().filter(e => e.severity === (t as Severity)).length;
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  relatedCount(e: AnomalyEvent): number {
    return this.events().filter(x => x.type === e.type && x.id !== e.id).length;
  }

  zscorepct(z: number): number {
    return Math.min(100, (z / 6) * 100);
  }

  toggle(e: AnomalyEvent) {
    this.selected.update(cur => cur?.id === e.id ? null : e);
  }

  exportCsv() {
    const header = 'severity,type,targetNf,observedRate,threshold,zScore,message,timestamp';
    const rows = this.filtered().map(e =>
      [e.severity, e.type, e.targetNf, e.observedRate, e.threshold, e.zScore,
       `"${e.message.replace(/"/g, '""')}"`, e.timestamp].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit() {
    this.sub = this.anomaly.events$.subscribe(evts => {
      this.events.set(evts);
      this.live.set(true);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
