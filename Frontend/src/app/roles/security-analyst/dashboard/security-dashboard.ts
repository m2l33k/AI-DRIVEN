import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { AnomalyService, AnomalyEvent } from '../../shared/anomaly/anomaly.service';

interface SimScenario {
  label: string;
  icon: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  type: string;
  targetNf: string;
  rate: number;
  threshold: number;
  zScore: number;
  metric: string;
  message: string;
}

const SCENARIOS: SimScenario[] = [
  {
    label: 'Reg Flood',      icon: '⚡',
    severity: 'CRITICAL',    type: 'REGISTRATION_FLOOD',
    targetNf: 'AMF',         metric: 'amf_reg_requests_total',
    rate: 47.3, threshold: 20, zScore: 0,
    message: 'Registration flood: 47.3 req/s (threshold 20/s)',
  },
  {
    label: 'IMSI Enum',      icon: '🔍',
    severity: 'HIGH',        type: 'IMSI_ENUMERATION',
    targetNf: 'AMF/UDM',    metric: 'amf_auth_failure_total',
    rate: 10, threshold: 0,  zScore: 0,
    message: 'Sequential IMSI probe: 32 attempts in window',
  },
  {
    label: 'Auth Spike',     icon: '📈',
    severity: 'MEDIUM',      type: 'AUTH_FAILURE_SPIKE',
    targetNf: 'AMF/UDM',    metric: 'amf_auth_failure_total',
    rate: 8.4, threshold: 0, zScore: 3.72,
    message: 'amf_auth_failure_total rate 3.72σ above baseline',
  },
];

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION_FLOOD: 'Registration Flood',
  IMSI_ENUMERATION:   'IMSI Enumeration',
  AUTH_FAILURE_SPIKE: 'Auth Failure Spike',
};

const COOLDOWN_MS = 5000;

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, DonutChart, CommonModule, DatePipe, DecimalPipe],
  template: `
    <hw-page-header title="Security Posture"
      subtitle="Live threat detection — 5G Core signalling & roaming planes">
      <span class="live-badge" [class.active]="live()">
        <span class="dot"></span>{{ live() ? 'LIVE' : 'connecting…' }}
      </span>
    </hw-page-header>

    <!-- threat level bar -->
    <div class="threat-bar" [class]="'tl-' + threatLevel()">
      <span class="tl-label">Threat level</span>
      <span class="tl-level">{{ threatLevel().toUpperCase() }}</span>
      <span class="tl-desc">{{ threatDesc() }}</span>
      <span class="tl-time" *ngIf="events().length">
        Last event {{ events()[0].timestamp | date:'HH:mm:ss' }}
      </span>
    </div>

    <!-- banners for latest CRITICAL / HIGH -->
    @for (e of criticals(); track e.id) {
      <div class="alert-banner critical">
        <span class="sev-dot"></span>
        <strong>CRITICAL</strong>&nbsp;
        {{ typeLabel(e.type) }}&nbsp;—&nbsp;{{ e.message }}
        <span class="ab-time">{{ e.timestamp | date:'HH:mm:ss' }}</span>
      </div>
    }
    @for (e of highs(); track e.id) {
      <div class="alert-banner high">
        <span class="sev-dot"></span>
        <strong>HIGH</strong>&nbsp;
        {{ typeLabel(e.type) }}&nbsp;—&nbsp;{{ e.message }}
        <span class="ab-time">{{ e.timestamp | date:'HH:mm:ss' }}</span>
      </div>
    }

    <!-- simulate panel -->
    <div class="sim-bar">
      <div class="sim-left">
        <span class="sim-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Simulate attack
        </span>
        @for (s of scenarios; track s.type) {
          <button class="sim-btn"
            [class.sim-critical]="s.severity==='CRITICAL'"
            [class.sim-high]="s.severity==='HIGH'"
            [class.sim-medium]="s.severity==='MEDIUM'"
            [class.sim-firing]="firing()===s.type"
            [class.sim-cooldown]="onCooldown().has(s.type)"
            [disabled]="firing()!==null || onCooldown().has(s.type)"
            (click)="simulate(s)">
            {{ s.icon }}&nbsp;{{ s.label }}
            @if (firing()===s.type) {
              <span class="spin">↻</span>
            } @else if (onCooldown().has(s.type)) {
              <span class="cd-badge">{{ cooldownSec(s.type) }}s</span>
            }
          </button>
        }
      </div>
      <div class="sim-right">
        @if (lastInjected()) {
          <span class="sim-ok">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ lastInjected() }} injected
          </span>
        }
        <button class="clear-btn" [disabled]="events().length===0" (click)="clearAll()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/>
          </svg>
          Clear all
        </button>
      </div>
    </div>

    <!-- stat cards -->
    <div class="stats">
      <hw-stat-card label="Open alerts"  [value]="totalCount()"    [delta]="0" accent="#f53f3f" />
      <hw-stat-card label="Critical"     [value]="criticalCount()" [delta]="0" accent="#c7000b" />
      <hw-stat-card label="High"         [value]="highCount()"     [delta]="0" accent="#ff8f1f" />
      <hw-stat-card label="Medium / Low" [value]="medLowCount()"   [delta]="0" accent="#3491fa" />
    </div>

    <div class="grid">

      <!-- timeline chart -->
      <div class="hw-card panel span2">
        <div class="panel-head">
          <h3>Registration rate over time</h3>
          <span class="tag">live · last 12 flood events</span>
        </div>
        <hw-line-chart [data]="rateHistory()" [labels]="rateLabels()" color="#f53f3f" ariaLabel="Reg rate" />
      </div>

      <!-- donut -->
      <div class="hw-card panel">
        <div class="panel-head"><h3>Alerts by severity</h3></div>
        <hw-donut-chart [slices]="severitySlices()" centerLabel="Alerts" />
      </div>

      <!-- attack type bars -->
      <div class="hw-card panel">
        <div class="panel-head"><h3>Attack types</h3></div>
        <div class="type-list">
          @for (t of typeCounts(); track t.type) {
            <div class="type-row">
              <span class="type-name">{{ typeLabel(t.type) }}</span>
              <div class="type-bar-wrap">
                <div class="type-bar" [class]="'tb-' + typeColor(t.type)" [style.width.%]="t.pct"></div>
              </div>
              <span class="type-cnt">{{ t.count }}</span>
            </div>
          }
          @empty { <p class="empty-msg">No attacks detected yet.</p> }
        </div>
      </div>

      <!-- alert table -->
      <div class="hw-card panel span2">
        <div class="panel-head">
          <h3>Latest alerts</h3>
          <span class="tag">{{ events().length }} total · click row for details</span>
        </div>
        <table class="tbl">
          <thead>
            <tr><th>Severity</th><th>Type</th><th>NF</th><th>Rate</th><th>Message</th><th>Time</th><th></th></tr>
          </thead>
          <tbody>
            @for (e of events().slice(0, 20); track e.id) {
              <tr
                [class.row-critical]="e.severity==='CRITICAL'"
                [class.row-high]="e.severity==='HIGH'"
                [class.row-selected]="selected()?.id===e.id"
                (click)="toggleSelect(e)">
                <td><span class="sev" [class]="e.severity">{{ e.severity }}</span></td>
                <td class="mono bold">{{ typeLabel(e.type) }}</td>
                <td class="nf">{{ e.targetNf }}</td>
                <td class="mono">{{ e.observedRate | number:'1.1-1' }}/s</td>
                <td class="msg">{{ e.message }}</td>
                <td class="mono muted">{{ e.timestamp | date:'HH:mm:ss' }}</td>
                <td class="chevron">{{ selected()?.id===e.id ? '▲' : '▸' }}</td>
              </tr>
              <!-- inline drilldown -->
              @if (selected()?.id===e.id) {
                <tr class="detail-row">
                  <td colspan="7">
                    <div class="detail-panel">
                      <div class="detail-grid">
                        <div class="detail-block">
                          <span class="dl">Event ID</span>
                          <span class="dv mono">{{ e.id }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Metric</span>
                          <span class="dv mono">{{ e.metric || '—' }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Observed rate</span>
                          <span class="dv">{{ e.observedRate | number:'1.2-2' }} req/s</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Threshold</span>
                          <span class="dv">{{ e.threshold > 0 ? (e.threshold | number:'1.0-0') + ' req/s' : '—' }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Z-score</span>
                          <span class="dv">{{ e.zScore > 0 ? (e.zScore | number:'1.2-2') + ' σ' : '—' }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Target NF</span>
                          <span class="dv">{{ e.targetNf }}</span>
                        </div>
                        <div class="detail-block span-2">
                          <span class="dl">Detection message</span>
                          <span class="dv">{{ e.message }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Timestamp</span>
                          <span class="dv mono">{{ e.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                        </div>
                        <div class="detail-block">
                          <span class="dl">Related events (same type)</span>
                          <span class="dv">{{ relatedCount(e) }}</span>
                        </div>
                      </div>
                      <div class="detail-actions">
                        <span class="sev" [class]="e.severity">{{ e.severity }}</span>
                        <button class="close-btn" (click)="selected.set(null); $event.stopPropagation()">Dismiss</button>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            }
            @empty {
              <tr><td colspan="7" class="empty">No anomalies detected — system is quiet.</td></tr>
            }
          </tbody>
        </table>
      </div>

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

    /* threat level bar */
    .threat-bar { display:flex; align-items:center; gap:12px; padding:10px 18px; border-radius:10px;
      margin-bottom:12px; font-size:13px; border:1px solid transparent; }
    .tl-quiet  { background:rgba(0,168,112,.07); border-color:rgba(0,168,112,.2); color:#00714a; }
    .tl-medium { background:rgba(255,143,31,.08); border-color:rgba(255,143,31,.25); color:#b85c00; }
    .tl-high   { background:rgba(245,63,63,.08); border-color:rgba(245,63,63,.2); color:#c73030; }
    .tl-critical { background:rgba(199,0,11,.10); border-color:rgba(199,0,11,.25); color:var(--hw-red); }
    .tl-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; opacity:.7; }
    .tl-level { font-weight:800; font-size:14px; }
    .tl-desc  { flex:1; opacity:.85; }
    .tl-time  { font-size:11px; opacity:.6; font-family:monospace; margin-left:auto; }

    /* alert banners */
    .alert-banner { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px;
      margin-bottom:8px; font-size:13px; animation:slide-in .2s ease; }
    @keyframes slide-in { from{transform:translateY(-6px);opacity:0} to{transform:none;opacity:1} }
    .alert-banner.critical { background:rgba(199,0,11,.10); color:var(--hw-red); border:1px solid rgba(199,0,11,.2); }
    .alert-banner.high { background:rgba(255,143,31,.10); color:#b85c00; border:1px solid rgba(255,143,31,.25); }
    .sev-dot { width:8px; height:8px; border-radius:50%; background:currentColor; flex:none; }
    .ab-time { margin-left:auto; font-size:11px; opacity:.7; font-family:monospace; }

    /* simulate bar */
    .sim-bar { display:flex; align-items:center; justify-content:space-between; gap:10px;
      margin-bottom:16px; padding:11px 16px; background:var(--hw-bg);
      border:1px solid var(--hw-border); border-radius:12px; flex-wrap:wrap; }
    .sim-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .sim-right { display:flex; align-items:center; gap:10px; }
    .sim-label { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700;
      color:var(--hw-text-3); text-transform:uppercase; letter-spacing:.05em; margin-right:4px; }
    .sim-btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:8px;
      font-size:13px; font-weight:600; border:1.5px solid; cursor:pointer;
      transition:background .15s, transform .1s, opacity .15s; }
    .sim-btn:active:not(:disabled) { transform:scale(.96); }
    .sim-btn:disabled { opacity:.45; cursor:not-allowed; }
    .sim-critical { border-color:rgba(199,0,11,.4); color:var(--hw-red); background:rgba(199,0,11,.06); }
    .sim-critical:hover:not(:disabled) { background:rgba(199,0,11,.13); }
    .sim-high { border-color:rgba(255,143,31,.45); color:#b85c00; background:rgba(255,143,31,.06); }
    .sim-high:hover:not(:disabled) { background:rgba(255,143,31,.13); }
    .sim-medium { border-color:rgba(52,145,250,.45); color:var(--hw-info); background:rgba(52,145,250,.06); }
    .sim-medium:hover:not(:disabled) { background:rgba(52,145,250,.13); }
    .sim-firing { opacity:.65; }
    .sim-cooldown { opacity:.5; }
    .spin { display:inline-block; animation:spin .6s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .cd-badge { font-size:10px; background:rgba(0,0,0,.08); border-radius:10px;
      padding:1px 5px; font-weight:700; }
    .sim-ok { display:flex; align-items:center; gap:5px; font-size:12px;
      color:#00a870; font-weight:600; animation:fade-in .2s ease; }
    @keyframes fade-in { from{opacity:0} to{opacity:1} }
    .clear-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px;
      font-size:12px; font-weight:600; border:1px solid var(--hw-border); background:#fff;
      color:var(--hw-text-3); cursor:pointer; transition:color .15s, border-color .15s; }
    .clear-btn:hover:not(:disabled) { color:#c7000b; border-color:rgba(199,0,11,.3); }
    .clear-btn:disabled { opacity:.35; cursor:not-allowed; }

    /* stats */
    .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }

    /* grid */
    .grid { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
    .span2 { grid-column:1 / -1; }
    .panel { padding:18px 20px; }
    .panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .panel-head h3 { margin:0; font-size:15px; font-weight:600; }
    .tag { font-size:12px; color:var(--hw-text-3); }

    /* type bars */
    .type-list { display:flex; flex-direction:column; gap:10px; }
    .type-row { display:flex; align-items:center; gap:10px; font-size:13px; }
    .type-name { width:170px; flex:none; color:var(--hw-text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .type-bar-wrap { flex:1; height:7px; background:var(--hw-bg); border-radius:4px; overflow:hidden; }
    .type-bar { height:100%; border-radius:4px; transition:width .5s cubic-bezier(.34,1.56,.64,1); }
    .tb-critical { background:#c7000b; }
    .tb-high     { background:#f59f00; }
    .tb-medium   { background:#3491fa; }
    .type-cnt { width:24px; text-align:right; font-size:12px; font-weight:600; color:var(--hw-text-3); }
    .empty-msg { color:var(--hw-text-3); font-size:13px; margin:0; }

    /* alert table */
    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; color:var(--hw-text-3); font-weight:500;
      padding:9px 12px; border-bottom:1px solid var(--hw-border); font-size:12px; }
    .tbl td { padding:10px 12px; border-bottom:1px solid var(--hw-border); color:var(--hw-text-2); }
    .tbl tbody tr:not(.detail-row) { cursor:pointer; transition:background .12s; }
    .tbl tbody tr:not(.detail-row):hover td { background:rgba(0,0,0,.025) !important; }
    .row-critical td { background:rgba(199,0,11,.035); }
    .row-high td    { background:rgba(255,143,31,.035); }
    .row-selected td { background:rgba(52,145,250,.06) !important; }
    .mono  { font-family:monospace; }
    .bold  { color:var(--hw-text); font-weight:500; }
    .muted { color:var(--hw-text-3); }
    .nf    { color:var(--hw-text-2); }
    .msg   { max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .chevron { text-align:right; color:var(--hw-text-3); font-size:11px; width:20px; }
    .empty { text-align:center; color:var(--hw-text-3); padding:32px; }

    /* drilldown */
    .detail-row td { padding:0; border-bottom:2px solid rgba(52,145,250,.2); }
    .detail-panel { padding:16px 20px; background:rgba(52,145,250,.04);
      animation:expand .18s ease; }
    @keyframes expand { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
    .detail-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px 20px; margin-bottom:14px; }
    .detail-block { display:flex; flex-direction:column; gap:3px; }
    .detail-block.span-2 { grid-column:span 2; }
    .dl { font-size:11px; color:var(--hw-text-3); font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
    .dv { font-size:13px; color:var(--hw-text); word-break:break-all; }
    .detail-actions { display:flex; align-items:center; gap:10px; }
    .close-btn { margin-left:auto; padding:5px 14px; border-radius:7px; font-size:12px;
      font-weight:600; border:1px solid var(--hw-border); background:#fff;
      color:var(--hw-text-2); cursor:pointer; }
    .close-btn:hover { border-color:var(--hw-red); color:var(--hw-red); }

    /* severity chips */
    .sev { font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; text-transform:uppercase; }
    .sev.CRITICAL { background:rgba(199,0,11,.12); color:var(--hw-red); }
    .sev.HIGH     { background:rgba(245,63,63,.12); color:var(--hw-danger); }
    .sev.MEDIUM   { background:rgba(255,143,31,.14); color:var(--hw-warning); }
    .sev.LOW      { background:rgba(52,145,250,.12); color:var(--hw-info); }

    @media (max-width:1100px) {
      .stats { grid-template-columns:repeat(2,1fr); }
      .grid  { grid-template-columns:1fr; }
      .detail-grid { grid-template-columns:repeat(2,1fr); }
      .detail-block.span-2 { grid-column:span 2; }
    }
  `],
})
export class SecurityDashboard implements OnInit, OnDestroy {
  private anomaly = inject(AnomalyService);
  private sub?: Subscription;
  private cooldownTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cooldownTick?: ReturnType<typeof setInterval>;
  private clearTimer?: ReturnType<typeof setTimeout>;

  readonly scenarios = SCENARIOS;

  events       = signal<AnomalyEvent[]>([]);
  live         = signal(false);
  firing       = signal<string | null>(null);
  lastInjected = signal<string | null>(null);
  selected     = signal<AnomalyEvent | null>(null);
  onCooldown   = signal<Set<string>>(new Set());
  cooldownEnds = new Map<string, number>();

  /* ── threat level ─────────────────────────────────────────────── */
  threatLevel = computed<'quiet' | 'medium' | 'high' | 'critical'>(() => {
    if (this.criticalCount() > 0) return 'critical';
    if (this.highCount() > 0)     return 'high';
    if (this.medLowCount() > 0)   return 'medium';
    return 'quiet';
  });

  threatDesc = computed(() => ({
    quiet:    'No anomalies detected — system operating normally.',
    medium:   'Statistical anomaly detected. Monitor closely.',
    high:     'Suspicious activity detected. Investigate immediately.',
    critical: 'Active attack in progress. Immediate action required.',
  }[this.threatLevel()]));

  /* ── counts ───────────────────────────────────────────────────── */
  criticals = computed(() => this.events().filter(e => e.severity === 'CRITICAL').slice(0, 2));
  highs     = computed(() => this.events().filter(e => e.severity === 'HIGH').slice(0, 1));

  totalCount    = computed(() => this.events().length);
  criticalCount = computed(() => this.events().filter(e => e.severity === 'CRITICAL').length);
  highCount     = computed(() => this.events().filter(e => e.severity === 'HIGH').length);
  medLowCount   = computed(() =>
    this.events().filter(e => e.severity === 'MEDIUM' || e.severity === 'LOW').length);

  severitySlices = computed<DonutSlice[]>(() => [
    { label: 'Critical', value: this.criticalCount() || 0.01, color: '#c7000b' },
    { label: 'High',     value: this.highCount()     || 0.01, color: '#f59f00' },
    { label: 'Med/Low',  value: this.medLowCount()   || 0.01, color: '#3491fa' },
  ]);

  typeCounts = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.events()) map.set(e.type, (map.get(e.type) ?? 0) + 1);
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([type, count]) => ({ type, count, pct: (count / max) * 100 }));
  });

  rateHistory = computed(() => {
    const flood = this.events().filter(e => e.type === 'REGISTRATION_FLOOD').slice(0, 12).reverse();
    return flood.length ? flood.map(e => e.observedRate) : [0];
  });

  rateLabels = computed(() => {
    const flood = this.events().filter(e => e.type === 'REGISTRATION_FLOOD').slice(0, 12).reverse();
    return flood.length
      ? flood.map(e => new Date(e.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      : ['now'];
  });

  /* ── helpers ──────────────────────────────────────────────────── */
  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  typeColor(type: string): string {
    if (type === 'REGISTRATION_FLOOD') return 'critical';
    if (type === 'IMSI_ENUMERATION')   return 'high';
    return 'medium';
  }

  relatedCount(e: AnomalyEvent): number {
    return this.events().filter(x => x.type === e.type && x.id !== e.id).length;
  }

  toggleSelect(e: AnomalyEvent) {
    this.selected.update(cur => cur?.id === e.id ? null : e);
  }

  cooldownSec(type: string): number {
    const end = this.cooldownEnds.get(type) ?? 0;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  /* ── simulate ─────────────────────────────────────────────────── */
  simulate(s: SimScenario) {
    this.firing.set(s.type);
    this.lastInjected.set(null);

    this.anomaly.inject({
      id: crypto.randomUUID(),
      type: s.type,
      severity: s.severity,
      targetNf: s.targetNf,
      metric: s.metric,
      observedRate: s.rate,
      threshold: s.threshold,
      zScore: s.zScore,
      message: s.message,
      timestamp: new Date().toISOString(),
    }).subscribe({
      next: () => {
        this.firing.set(null);
        this.lastInjected.set(s.label);

        // per-button cooldown
        const end = Date.now() + COOLDOWN_MS;
        this.cooldownEnds.set(s.type, end);
        this.onCooldown.update(set => { const n = new Set(set); n.add(s.type); return n; });

        clearTimeout(this.cooldownTimers.get(s.type));
        this.cooldownTimers.set(s.type, setTimeout(() => {
          this.cooldownEnds.delete(s.type);
          this.onCooldown.update(set => { const n = new Set(set); n.delete(s.type); return n; });
        }, COOLDOWN_MS));

        clearTimeout(this.clearTimer);
        this.clearTimer = setTimeout(() => this.lastInjected.set(null), 4000);
      },
      error: () => this.firing.set(null),
    });
  }

  clearAll() {
    this.anomaly.clearAll().subscribe(() => {
      this.events.set([]);
      this.selected.set(null);
    });
  }

  /* ── lifecycle ────────────────────────────────────────────────── */
  ngOnInit() {
    this.sub = this.anomaly.events$.subscribe(evts => {
      this.events.set(evts);
      this.live.set(true);
    });
    // tick every second to update cooldown countdowns
    this.cooldownTick = setInterval(() => {
      if (this.onCooldown().size > 0) this.onCooldown.update(s => new Set(s));
    }, 1000);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    clearTimeout(this.clearTimer);
    clearInterval(this.cooldownTick);
    this.cooldownTimers.forEach(t => clearTimeout(t));
  }
}
