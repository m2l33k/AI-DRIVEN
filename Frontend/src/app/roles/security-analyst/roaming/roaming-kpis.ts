import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import {
  RoamingService, KpiSet, KpiTimeseries, SlaEvaluation, SyntheticTestResult, KpiWindow, Agreement,
} from './roaming.service';

@Component({
  selector: 'app-roaming-kpis',
  standalone: true,
  imports: [DecimalPipe, PageHeader, StatCard, LineChart, AsyncState],
  template: `
    <hw-page-header title="Roaming · Performance Assurance (KPIs & SLA)"
      subtitle="Windowed KPI computation, SLA-breach detection and per-agreement steering tiers">
      <select class="hw-input win" [value]="window()" (change)="onWindow($event)">
        <option value="FIVE_MIN">5-min (real-time)</option>
        <option value="HOUR">1-hour</option>
        <option value="DAY">1-day</option>
        <option value="MONTH">1-month (billing)</option>
      </select>
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    @if (kpi(); as k) {
      <div class="stats">
        <hw-stat-card label="Registration success" [value]="k.registrationSuccessRate" unit="%" accent="#00a870" />
        <hw-stat-card label="ASR" [value]="k.asr" unit="%" accent="#3491fa" />
        <hw-stat-card label="NER" [value]="k.ner" unit="%" accent="#3491fa" />
        <hw-stat-card label="ACD" [value]="k.acdSeconds" unit="s" accent="#8a63d2" />
        <hw-stat-card label="Session setup success" [value]="k.sessionSetupSuccessRate" unit="%" accent="#00a870" />
        <hw-stat-card label="Drop rate" [value]="k.dropRatePct" unit="%" accent="#f53f3f" />
        <hw-stat-card label="Latency P95" [value]="k.latencyP95Ms" unit="ms" accent="#ff8f1f" />
        <hw-stat-card label="Throughput" [value]="k.throughputMbps" unit="Mbps" accent="#3491fa" />
      </div>
      <div class="latline">
        <span>P50 {{ k.latencyP50Ms }} ms</span>
        <span>P95 {{ k.latencyP95Ms }} ms</span>
        <span>P99 {{ k.latencyP99Ms }} ms</span>
        <span class="muted">attach {{ k.attachAttempts }} · voice {{ k.voiceAttempts }} · sessions {{ k.sessionAttempts }}</span>
      </div>
    }

    <div class="grid g2">
      <div class="hw-card panel">
        <div class="panel-head"><h3>Latency P95 trend</h3><span class="tag">last {{ series()?.points?.length || 0 }} windows</span></div>
        <hw-line-chart [data]="p95Trend()" [labels]="trendLabels()" color="#ff8f1f" [smooth]="true" ariaLabel="Latency P95 trend" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Drop-rate trend</h3><span class="tag">%</span></div>
        <hw-line-chart [data]="dropTrend()" [labels]="trendLabels()" color="#f53f3f" [smooth]="true" ariaLabel="Drop rate trend" />
      </div>
    </div>

    <div class="hw-card panel">
      <div class="panel-head">
        <h3>Roaming agreements &amp; SLA thresholds</h3>
        <span class="tag">{{ agreements().length }} partners</span>
      </div>
      <table class="tbl">
        <thead><tr>
          <th>Partner</th><th>Name</th><th>IR.21</th><th>Tier</th><th>Score</th>
          <th>Reg min%</th><th>ASR min%</th><th>Setup min%</th>
          <th>P95 max</th><th>Drop max%</th><th>Thr min</th><th>Breaches</th>
        </tr></thead>
        <tbody>
          @for (a of agreements(); track a.partnerOperatorId) {
            <tr>
              <td class="mono">{{ a.partnerOperatorId }}</td>
              <td>{{ a.partnerName }}</td>
              <td class="muted mono">{{ a.ir21Ref }}</td>
              <td><span class="tier" [class]="a.tier">{{ a.tier }}</span></td>
              <td><strong>{{ a.rollingPerformanceScore }}</strong></td>
              <td>{{ a.regSuccessMinPct }}</td>
              <td>{{ a.asrMinPct }}</td>
              <td>{{ a.sessionSuccessMinPct }}</td>
              <td>{{ a.latencyP95MaxMs }} ms</td>
              <td>{{ a.dropRateMaxPct }}</td>
              <td>{{ a.throughputMinMbps }} Mbps</td>
              <td>
                @if (a.consecutiveBreaches > 0) { <span class="badge-warn">{{ a.consecutiveBreaches }}w</span> }
                @else { <span class="ok">0</span> }
              </td>
            </tr>
          } @empty { <tr><td class="empty" colspan="12">No agreements. Load the dataset and seed agreements.</td></tr> }
        </tbody>
      </table>
    </div>

    <div class="hw-card panel">
      <div class="panel-head">
        <h3>SLA evaluation by roaming agreement</h3>
        <span class="tag">{{ slas().length }} partners · worst first</span>
      </div>
      <table class="tbl">
        <thead><tr>
          <th>Partner</th><th>Tier</th><th>Score</th><th>Reg%</th><th>ASR%</th><th>Setup%</th>
          <th>P95</th><th>Drop%</th><th>Thr</th><th>Breaches</th><th>Alarm</th>
        </tr></thead>
        <tbody>
          @for (s of slas(); track s.partner) {
            <tr [class.alarm-row]="s.alarm">
              <td class="mono">{{ s.partner }}</td>
              <td><span class="tier" [class]="s.tier">{{ s.tier }}</span></td>
              <td><strong>{{ s.rollingScore }}</strong></td>
              <td>{{ s.kpis.registrationSuccessRate }}</td>
              <td>{{ s.kpis.asr }}</td>
              <td>{{ s.kpis.sessionSetupSuccessRate }}</td>
              <td>{{ s.kpis.latencyP95Ms }}</td>
              <td>{{ s.kpis.dropRatePct }}</td>
              <td>{{ s.kpis.throughputMbps }}</td>
              <td class="brk">
                @if (s.breaches.length) {
                  @for (b of s.breaches; track b) { <span class="chip">{{ b }}</span> }
                } @else { <span class="ok">compliant</span> }
              </td>
              <td>
                @if (s.alarm) { <span class="badge-alarm">⚠ {{ s.consecutiveBreaches }}w</span> }
                @else if (s.breached) { <span class="badge-warn">breach</span> }
                @else { <span class="ok">—</span> }
              </td>
            </tr>
          } @empty { <tr><td class="empty" colspan="11">No agreements. Load the dataset and seed agreements.</td></tr> }
        </tbody>
      </table>
    </div>

    <!-- ══ IREG Synthetic Test-calls ═══════════════════════════════════ -->
    <div class="hw-card panel ireg-panel">
      <div class="ireg-head">
        <div class="ireg-title-block">
          <h3>Synthetic Test-calls (IREG)</h3>
          <p class="ireg-desc">
            Runs IREG-style probes — registration, MO/MT call, SMS and data session — against every
            active roaming agreement. Results are flagged <code>Synthetic_Test</code> and excluded
            from live KPI denominators so they don't distort production metrics.
          </p>
        </div>
        <button class="hw-btn hw-btn--primary ireg-btn" [disabled]="running()" (click)="runTests()">
          @if (running()) { <span class="spinner"></span>&nbsp;Running probes… }
          @else { Run test-calls }
        </button>
      </div>

      @if (tests().length) {
        <!-- summary cards -->
        <div class="ireg-summary">
          <div class="iscard total">
            <span class="isval">{{ tests().length }}</span>
            <span class="islab">Total probes</span>
          </div>
          <div class="iscard pass">
            <span class="isval">{{ passCount() }}</span>
            <span class="islab">Passed</span>
          </div>
          <div class="iscard fail">
            <span class="isval">{{ failCount() }}</span>
            <span class="islab">Failed</span>
          </div>
          <div class="iscard rate" [class.ok]="passRate() === 100" [class.warn]="passRate() < 100">
            <span class="isval">{{ passRate() | number:'1.0-1' }}%</span>
            <span class="islab">Pass rate</span>
          </div>
          <div class="iscard lat">
            <span class="isval">{{ avgLatency() | number:'1.0-0' }} ms</span>
            <span class="islab">Avg latency</span>
          </div>
        </div>

        <!-- results table -->
        <table class="tbl ireg-tbl">
          <thead><tr>
            <th>Partner</th><th>Transaction</th><th>Session type</th>
            <th>Result</th><th>Latency</th><th>Detail</th>
          </tr></thead>
          <tbody>
            @for (t of tests(); track t.partner + t.transactionType) {
              <tr [class.fail-row]="!t.success">
                <td class="mono">{{ t.partner }}</td>
                <td><span class="txn-badge" [class]="t.transactionType">{{ t.transactionType }}</span></td>
                <td class="muted">{{ t.sessionType }}</td>
                <td>
                  @if (t.success) { <span class="result-pass">PASS</span> }
                  @else { <span class="result-fail">FAIL</span> }
                </td>
                <td class="mono muted">{{ t.latencyMs }} ms</td>
                <td class="detail-cell">{{ t.detail }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="ireg-empty">
          <div class="ireg-probes">
            <div class="probe"><span class="probe-icon">📡</span><span>Registration</span></div>
            <div class="probe"><span class="probe-icon">📞</span><span>MO/MT Call</span></div>
            <div class="probe"><span class="probe-icon">💬</span><span>SMS</span></div>
            <div class="probe"><span class="probe-icon">📶</span><span>Data Session</span></div>
          </div>
          <p class="ireg-empty-hint">Click <strong>Run test-calls</strong> to execute probes against all {{ agreements().length }} agreements.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .win { width: auto; margin-right: 8px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px; }
    .latline { display: flex; gap: 18px; font-size: 13px; color: var(--hw-text-2); margin-bottom: 16px; flex-wrap: wrap; }
    .grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .g2 { grid-template-columns: 1fr 1fr; }
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 10px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: none; }
    .mono { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .alarm-row { background: rgba(245,63,63,.05); }
    .brk { max-width: 340px; }
    .chip { display: inline-block; font-size: 11px; padding: 2px 6px; margin: 1px 2px; border-radius: 4px; background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .ok   { color: var(--hw-success); font-weight: 600; }
    .badge-warn  { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px; background: rgba(255,143,31,.12); color: var(--hw-warning); }
    .badge-alarm { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px; background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .tier { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .tier.PREFERRED { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .tier.STANDARD  { background: rgba(52,145,250,.12); color: #3491fa; }
    .tier.PROBATION { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .tier.RESTRICTED{ background: rgba(245,63,63,.12); color: var(--hw-danger); }

    /* ── IREG section ─────────────────────────────────────────────── */
    .ireg-panel { border: 1px solid rgba(52,145,250,.2); }
    .ireg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .ireg-title-block h3 { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
    .ireg-desc { margin: 0; font-size: 13px; color: var(--hw-text-3); line-height: 1.5; max-width: 580px; }
    .ireg-desc code { background: var(--hw-bg); border: 1px solid var(--hw-border); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    .ireg-btn { flex-shrink: 0; align-self: flex-start; min-width: 140px; display: flex; align-items: center; gap: 6px; justify-content: center; }

    /* summary cards */
    .ireg-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .iscard { display: flex; flex-direction: column; gap: 3px; padding: 12px 18px; border-radius: 8px;
              background: var(--hw-bg); border: 1px solid var(--hw-border); min-width: 100px; }
    .iscard.pass { border-color: rgba(0,168,112,.25); background: rgba(0,168,112,.05); }
    .iscard.fail { border-color: rgba(245,63,63,.25); background: rgba(245,63,63,.05); }
    .iscard.rate.ok   { border-color: rgba(0,168,112,.3); }
    .iscard.rate.warn { border-color: rgba(245,63,63,.3); }
    .isval { font-size: 22px; font-weight: 800; color: var(--hw-text); }
    .iscard.pass .isval { color: var(--hw-success); }
    .iscard.fail .isval { color: var(--hw-danger); }
    .islab { font-size: 11px; color: var(--hw-text-3); text-transform: uppercase; letter-spacing: .4px; }

    /* results table */
    .ireg-tbl .fail-row { background: rgba(245,63,63,.04); }
    .txn-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
                 background: rgba(52,145,250,.1); color: #3491fa; }
    .txn-badge.REGISTRATION { background: rgba(114,46,209,.1); color: #722ed1; }
    .txn-badge.SMS          { background: rgba(0,168,112,.1); color: var(--hw-success); }
    .txn-badge.DATA         { background: rgba(255,143,31,.1); color: var(--hw-warning); }
    .result-pass { font-size: 11px; font-weight: 800; color: var(--hw-success); letter-spacing: .5px; }
    .result-fail { font-size: 11px; font-weight: 800; color: var(--hw-danger); letter-spacing: .5px; }
    .detail-cell { color: var(--hw-text-3); font-size: 12px; max-width: 260px; }

    /* empty state */
    .ireg-empty { padding: 10px 0 4px; }
    .ireg-probes { display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }
    .probe { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px;
             color: var(--hw-text-3); padding: 14px 20px; border: 1px dashed var(--hw-border);
             border-radius: 8px; min-width: 80px; }
    .probe-icon { font-size: 22px; }
    .ireg-empty-hint { font-size: 13px; color: var(--hw-text-3); }

    /* spinner */
    .spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3);
               border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2, 1fr); } .g2 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingKpis implements OnInit {
  private api = inject(RoamingService);

  window   = signal<KpiWindow>('DAY');
  kpi      = signal<KpiSet | null>(null);
  series   = signal<KpiTimeseries | null>(null);
  slas     = signal<SlaEvaluation[]>([]);
  agreements = signal<Agreement[]>([]);
  tests    = signal<SyntheticTestResult[]>([]);
  error    = signal<string | null>(null);
  loading  = signal(true);
  running  = signal(false);

  p95Trend   = computed(() => this.series()?.points.map((p) => p.latencyP95Ms) ?? []);
  dropTrend  = computed(() => this.series()?.points.map((p) => p.dropRatePct) ?? []);
  trendLabels = computed(() =>
    this.series()?.points.map((p) => (p.windowStart ?? '').slice(5, 16).replace('T', ' ')) ?? []);

  passCount  = computed(() => this.tests().filter((t) => t.success).length);
  failCount  = computed(() => this.tests().filter((t) => !t.success).length);
  passRate   = computed(() => this.tests().length ? (this.passCount() / this.tests().length) * 100 : 0);
  avgLatency = computed(() => {
    const t = this.tests(); return t.length ? t.reduce((s, x) => s + x.latencyMs, 0) / t.length : 0;
  });

  ngOnInit() { this.load(); }

  onWindow(e: Event) {
    this.window.set((e.target as HTMLSelectElement).value as KpiWindow);
    this.load();
  }

  load() {
    const w = this.window();
    this.error.set(null);
    this.loading.set(true);
    this.api.kpis(w).subscribe({
      next: (v) => { this.kpi.set(v); this.loading.set(false); },
      error: (e) => { this.fail(e); this.loading.set(false); },
    });
    this.api.kpisTimeseries(w, 12).subscribe({ next: (v) => this.series.set(v), error: (e) => this.fail(e) });
    this.api.sla(w).subscribe({ next: (v) => this.slas.set(v), error: (e) => this.fail(e) });
    this.api.agreements().subscribe({ next: (v) => this.agreements.set(v), error: (e) => this.fail(e) });
  }

  runTests() {
    this.running.set(true);
    this.api.runTestCalls().subscribe({
      next: (v) => { this.tests.set(v); this.running.set(false); },
      error: (e) => { this.fail(e); this.running.set(false); },
    });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
