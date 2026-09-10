import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import {
  RoamingService, KpiSet, KpiTimeseries, SlaEvaluation, SyntheticTestResult, KpiWindow, Agreement,
} from './roaming.service';

/**
 * Performance Assurance Engine (§5.2) — windowed roaming KPIs, SLA evaluation with
 * consecutive-breach alarming and rolling performance tiers, plus a synthetic test-call runner.
 */
@Component({
  selector: 'app-roaming-kpis',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, AsyncState],
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
        <span>P50 {{ k.latencyP50Ms }} ms</span><span>P95 {{ k.latencyP95Ms }} ms</span>
        <span>P99 {{ k.latencyP99Ms }} ms</span>
        <span class="muted">attach {{ k.attachAttempts }} · voice {{ k.voiceAttempts }} · sessions {{ k.sessionAttempts }}</span>
      </div>
    }

    <div class="hw-card panel">
      <div class="panel-head"><h3>Latency P95 trend</h3><span class="tag">last {{ series()?.points?.length || 0 }} windows</span></div>
      <hw-line-chart [data]="p95Trend()" [labels]="trendLabels()" color="#ff8f1f" [smooth]="true" ariaLabel="Latency P95 trend" />
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Drop-rate trend</h3><span class="tag">%</span></div>
      <hw-line-chart [data]="dropTrend()" [labels]="trendLabels()" color="#f53f3f" [smooth]="true" ariaLabel="Drop rate trend" />
    </div>

    <div class="hw-card panel">
      <div class="panel-head">
        <h3>Roaming agreements &amp; SLA thresholds</h3>
        <span class="tag">{{ agreements().length }} partners</span>
      </div>
      <table class="tbl">
        <thead><tr>
          <th>Partner</th><th>Name</th><th>IR.21</th><th>Tier</th><th>Score</th>
          <th>Reg&nbsp;min%</th><th>ASR&nbsp;min%</th><th>Setup&nbsp;min%</th>
          <th>P95&nbsp;max</th><th>Drop&nbsp;max%</th><th>Thr&nbsp;min</th><th>Breaches</th>
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
                @if (a.consecutiveBreaches > 0) { <span class="warn">{{ a.consecutiveBreaches }}w</span> }
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
                @if (s.alarm) { <span class="alarm">⚠ {{ s.consecutiveBreaches }}w</span> }
                @else if (s.breached) { <span class="warn">breach</span> }
                @else { <span class="ok">—</span> }
              </td>
            </tr>
          } @empty { <tr><td class="empty" colspan="11">No agreements. Load the dataset and seed agreements.</td></tr> }
        </tbody>
      </table>
    </div>

    <div class="hw-card panel">
      <div class="panel-head">
        <h3>Synthetic test-calls (IREG)</h3>
        <button class="hw-btn hw-btn--primary" [disabled]="running()" (click)="runTests()">
          {{ running() ? 'Running…' : 'Run test-calls' }}
        </button>
      </div>
      @if (tests().length) {
        <table class="tbl">
          <thead><tr><th>Partner</th><th>Transaction</th><th>Type</th><th>Result</th><th>Latency</th><th>Detail</th></tr></thead>
          <tbody>
            @for (t of tests(); track t.partner + t.transactionType) {
              <tr>
                <td class="mono">{{ t.partner }}</td><td>{{ t.transactionType }}</td>
                <td class="muted">{{ t.sessionType }}</td>
                <td>@if (t.success) { <span class="ok">PASS</span> } @else { <span class="warn">FAIL</span> }</td>
                <td class="muted">{{ t.latencyMs }} ms</td><td class="muted">{{ t.detail }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="muted">Run scheduled IREG-style probes (registration, MO/MT call, SMS, data) against every agreement. Flagged Synthetic_Test — excluded from live KPI denominators.</p>
      }
    </div>
  `,
  styles: [`
    .win { width: auto; margin-right: 8px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px; }
    .latline { display: flex; gap: 18px; font-size: 13px; color: var(--hw-text-2); margin-bottom: 16px; flex-wrap: wrap; }
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .alarm-row { background: rgba(245,63,63,.06); }
    .brk { max-width: 340px; }
    .chip { display: inline-block; font-size: 11px; padding: 2px 6px; margin: 1px 2px; border-radius: 4px; background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .ok { color: var(--hw-success); font-weight: 600; }
    .warn { color: var(--hw-warning); font-weight: 600; }
    .alarm { color: var(--hw-danger); font-weight: 700; }
    .tier { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .tier.PREFERRED { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .tier.STANDARD { background: rgba(52,145,250,.12); color: #3491fa; }
    .tier.PROBATION { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .tier.RESTRICTED { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class RoamingKpis implements OnInit {
  private api = inject(RoamingService);

  window = signal<KpiWindow>('DAY');
  kpi = signal<KpiSet | null>(null);
  series = signal<KpiTimeseries | null>(null);
  slas = signal<SlaEvaluation[]>([]);
  agreements = signal<Agreement[]>([]);
  tests = signal<SyntheticTestResult[]>([]);
  error = signal<string | null>(null);
  loading = signal(true);
  running = signal(false);

  p95Trend = computed(() => this.series()?.points.map((p) => p.latencyP95Ms) ?? []);
  dropTrend = computed(() => this.series()?.points.map((p) => p.dropRatePct) ?? []);
  trendLabels = computed(() =>
    this.series()?.points.map((p) => (p.windowStart ?? '').slice(5, 16).replace('T', ' ')) ?? []);

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
