import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, JsonPipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { PageHeader } from '../../../shared/ui/page-header';
import { LineChart } from '../../../shared/charts/line-chart';
import { RoamingService, CsvAnalysis, SimulationResult, MlTrainState } from './roaming.service';

@Component({
  selector: 'app-roaming-tools',
  standalone: true,
  imports: [FormsModule, DecimalPipe, JsonPipe, PageHeader, LineChart],
  template: `
    <hw-page-header title="Roaming · Tools"
      subtitle="Train ML models, analyse an uploaded CSV and simulate live roaming traffic" />

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

    <!-- ══ ML Model Training ══════════════════════════════════════════ -->
    <div class="section-label">
      <div>
        <span class="section-title">ML Model Training</span>
        <span class="section-desc">Trains LSTM · Prophet · ARIMA on the full historical subscriber dataset. Results appear on the Overview chart.</span>
      </div>
    </div>

    <div class="hw-card panel mb">
      <div class="panel-head">
        <div class="head-left">
          <h3>Model status</h3>
          <span class="badge" [class]="statusClass()">{{ trainState()?.status ?? 'unavailable' }}</span>
        </div>
        <button class="hw-btn hw-btn--primary"
                [disabled]="trainState()?.status === 'training' || training()"
                (click)="train()">
          @if (trainState()?.status === 'training' || training()) {
            <span class="spinner"></span>&nbsp;Training in progress…
          } @else {
            Train all models
          }
        </button>
      </div>

      <div class="train-meta">
        <div class="meta-item">
          <span class="meta-label">Data points</span>
          <span class="meta-val">{{ trainState()?.data_points ?? '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Train set</span>
          <span class="meta-val">{{ trainState()?.train_points ?? '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Test set (20%)</span>
          <span class="meta-val">{{ trainState()?.test_points ?? '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Completed</span>
          <span class="meta-val">{{ trainState()?.finished_at ?? '—' }}</span>
        </div>
      </div>

      @if (trainState()?.status === 'trained') {
        <div class="metrics-block">
          <div class="metrics-title">Evaluation results — held-out 20% test set</div>
          <table class="tbl">
            <thead>
              <tr><th>Model</th><th>MAE ↓</th><th>RMSE ↓</th><th>AIC ↓</th><th>Details</th></tr>
            </thead>
            <tbody>
              @if (trainState()?.metrics?.lstm; as m) {
                <tr>
                  <td><span class="model-dot" style="background:#3491fa"></span>LSTM</td>
                  <td class="num">{{ m.mae | number:'1.2-2' }}</td>
                  <td class="num">{{ m.rmse | number:'1.2-2' }}</td>
                  <td class="dim">—</td>
                  <td class="dim">{{ m.epochs }} epochs · lookback {{ m.lookback }}h · loss {{ m.final_loss | number:'1.4-4' }}</td>
                </tr>
              }
              @if (trainState()?.metrics?.prophet; as m) {
                <tr>
                  <td><span class="model-dot" style="background:#00a870"></span>Prophet</td>
                  <td class="num">{{ m.mae | number:'1.2-2' }}</td>
                  <td class="num">{{ m.rmse | number:'1.2-2' }}</td>
                  <td class="dim">—</td>
                  <td class="dim">daily {{ m.daily_seasonality ? '✓' : '✗' }} · weekly {{ m.weekly_seasonality ? '✓' : '✗' }}</td>
                </tr>
              }
              @if (trainState()?.metrics?.arima; as m) {
                <tr>
                  <td><span class="model-dot" style="background:#ff8f1f"></span>ARIMA</td>
                  <td class="num">{{ m.mae | number:'1.2-2' }}</td>
                  <td class="num">{{ m.rmse | number:'1.2-2' }}</td>
                  <td class="num">{{ m.aic | number:'1.1-1' }}</td>
                  <td class="dim">order {{ m.order | json }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="metrics-legend">
            <span class="leg-item"><strong>MAE</strong> — avg absolute error in subscribers/hour. Lower = better.</span>
            <span class="leg-item"><strong>RMSE</strong> — penalises large errors more. Lower = better.</span>
            <span class="leg-item"><strong>AIC</strong> — ARIMA complexity/fit trade-off. Lower = better.</span>
          </div>
        </div>
      }

      @if (trainState()?.error) {
        <p class="train-err">{{ trainState()!.error }}</p>
      }
    </div>

    <!-- ══ Data Tools ════════════════════════════════════════════════ -->
    <div class="section-label">
      <div>
        <span class="section-title">Data Tools</span>
        <span class="section-desc">Upload a CSV to analyse and forecast, or generate synthetic roaming events to test the live monitor.</span>
      </div>
    </div>

    <div class="tools-grid">

      <!-- CSV Upload -->
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Analyse a CSV</h3>
          <span class="endpoint-tag">POST /upload</span>
        </div>
        <p class="tool-desc">Upload a roaming CDR CSV. The backend parses it, scores anomalies and runs a linear forecast — nothing is persisted.</p>
        <div class="tool-form">
          <div class="field-row">
            <label class="field-label">CSV file</label>
            <input type="file" accept=".csv" (change)="onFile($event)" class="file-input" />
          </div>
          <div class="field-row">
            <label class="field-label">Forecast hours</label>
            <input type="number" min="1" max="24" [(ngModel)]="uploadHours" class="num-input" />
          </div>
          <button class="hw-btn hw-btn--primary full-btn" [disabled]="!file || uploading()" (click)="upload()">
            {{ uploading() ? 'Analysing…' : 'Upload & Analyse' }}
          </button>
        </div>

        @if (csv(); as c) {
          <div class="result-block">
            <div class="result-header">
              <div>
                <div class="result-title">{{ c.fileName }}</div>
                <div class="result-meta">{{ c.rowsParsed }} rows parsed · {{ c.rowsSkipped }} skipped</div>
              </div>
              <button class="hw-btn" (click)="showForecastModal.set(true)">View forecast chart</button>
            </div>
            <div class="result-kpis">
              <div class="kpi"><span>{{ c.summary.totalEvents }}</span>events</div>
              <div class="kpi"><span>{{ c.summary.totalSubscribers }}</span>subscribers</div>
              <div class="kpi"><span>{{ c.summary.highRiskCount }}</span>high-risk</div>
              <div class="kpi"><span>{{ c.anomalies.length }}</span>anomalies</div>
            </div>
          </div>
        }
      </div>

      <!-- Traffic Simulator -->
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Simulate traffic</h3>
          <span class="endpoint-tag">POST /simulate</span>
        </div>
        <p class="tool-desc">Generate synthetic roaming events with realistic risk distribution. Useful for testing anomaly detection and the live monitor without real data.</p>
        <div class="tool-form">
          <div class="field-row">
            <label class="field-label">Event count</label>
            <input type="number" min="1" max="500" [(ngModel)]="simCount" class="num-input" />
          </div>
          <div class="field-row">
            <label class="field-label">Spread (min)</label>
            <input type="number" min="1" [(ngModel)]="simSpread" class="num-input" />
          </div>
          <div class="field-row">
            <label class="field-label">Monitor window (min)</label>
            <input type="number" min="1" [(ngModel)]="simWindow" class="num-input" />
          </div>
          <button class="hw-btn hw-btn--primary full-btn" [disabled]="simulating()" (click)="simulate()">
            {{ simulating() ? 'Generating…' : 'Generate events' }}
          </button>
        </div>

        @if (sim(); as s) {
          <div class="result-block">
            <div class="result-title">{{ s.generated }} events generated</div>
            <div class="result-meta">Live window: {{ s.monitor.windowMinutes }} min</div>
            <div class="result-kpis">
              <div class="kpi"><span>{{ s.monitor.activeEvents }}</span>active</div>
              <div class="kpi"><span>{{ s.monitor.activeSubscribers }}</span>subscribers</div>
              <div class="kpi"><span>{{ s.monitor.highRiskCount }}</span>high-risk</div>
              <div class="kpi"><span>{{ s.monitor.windowRevenueEur | number:'1.0-0' }}€</span>revenue</div>
            </div>
            @if (s.monitor.recent.length) {
              <div class="sim-sample">
                <div class="sample-label">Sample events</div>
                @for (e of s.monitor.recent; track e.id) {
                  <div class="sample-row">
                    <span class="dir" [class.in]="e.direction==='INBOUND'" [class.out]="e.direction==='OUTBOUND'">{{ e.direction }}</span>
                    <span class="mono">{{ e.partnerPlmn }}</span>
                    <span class="dim">{{ e.country }}</span>
                    <span class="dim">{{ e.subscribers }} subs</span>
                    <span class="lvl" [class]="e.riskLevel">{{ e.riskScore }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ══ Forecast Modal ═════════════════════════════════════════════ -->
    @if (showForecastModal() && csv(); as c) {
      <div class="modal-backdrop" (click)="showForecastModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Forecast — {{ c.fileName }}</h2>
              <p class="modal-sub">{{ c.forecast.history.length }} history points · {{ c.forecast.forecast.length }} predicted · linear regression trend {{ trendSign() }}{{ trendAbs() | number:'1.0-0' }} subs/h</p>
            </div>
            <button class="modal-close" (click)="showForecastModal.set(false)">✕</button>
          </div>

          <div class="modal-stats">
            <div class="ms"><span>{{ c.rowsParsed }}</span>rows parsed</div>
            <div class="ms"><span>{{ c.summary.totalEvents }}</span>events</div>
            <div class="ms"><span>{{ c.summary.totalSubscribers }}</span>subscribers</div>
            <div class="ms"><span>{{ c.summary.highRiskCount }}</span>high-risk</div>
            <div class="ms"><span>{{ c.anomalies.length }}</span>anomalies detected</div>
          </div>

          <div class="modal-chart-wrap">
            <div class="chart-legend">
              <span class="leg history">History</span>
              <span class="leg forecast">Forecast ({{ uploadHours }}h)</span>
            </div>
            <hw-line-chart [data]="csvAllData()" [labels]="csvAllLabels()"
                           [smooth]="true" color="#3491fa" ariaLabel="CSV detailed forecast" />
          </div>

          @if (c.forecast.history.length) {
            <div class="modal-table-wrap">
              <div class="mt-title">Hourly forecast breakdown</div>
              <table class="tbl">
                <thead><tr><th>Hour</th><th>Subscribers</th><th>Type</th></tr></thead>
                <tbody>
                  @for (p of modalRows(c); track p.hour) {
                    <tr [class.pred-row]="p.predicted">
                      <td class="mono">{{ p.hour }}</td>
                      <td class="num">{{ p.subscribers }}</td>
                      <td>
                        <span class="type-badge" [class.is-pred]="p.predicted">
                          {{ p.predicted ? 'Predicted' : 'Historical' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (c.anomalies.length) {
            <div class="modal-table-wrap">
              <div class="mt-title">Anomalies detected in this CSV ({{ c.anomalies.length }})</div>
              <table class="tbl">
                <thead><tr><th>PLMN</th><th>Score</th><th>Severity</th><th>Reasons</th></tr></thead>
                <tbody>
                  @for (a of c.anomalies.slice(0, 10); track a.id) {
                    <tr>
                      <td class="mono">{{ a.partnerPlmn }}</td>
                      <td class="num">{{ a.anomalyScore }}</td>
                      <td><span class="sev" [class]="a.severity">{{ a.severity }}</span></td>
                      <td class="dim">{{ a.reasons.join('; ') }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── section headers ─────────────────────────────────────────── */
    .section-label { display: flex; align-items: flex-start; gap: 12px; margin: 0 0 12px; padding: 0 2px; }
    .section-title { font-size: 15px; font-weight: 700; color: var(--hw-text); display: block; }
    .section-desc  { font-size: 12px; color: var(--hw-text-3); display: block; margin-top: 2px; }

    /* ── cards ─────────────────────────────────────────────────────── */
    .panel { padding: 20px 22px; }
    .mb { margin-bottom: 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .head-left { display: flex; align-items: center; gap: 10px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .endpoint-tag { font-size: 11px; font-family: monospace; background: var(--hw-bg-2); color: var(--hw-text-3);
                    padding: 2px 8px; border-radius: 4px; border: 1px solid var(--hw-border); }
    .tool-desc { font-size: 13px; color: var(--hw-text-3); margin: -4px 0 16px; line-height: 1.5; }

    /* ── status badge ─────────────────────────────────────────────── */
    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; letter-spacing: .3px; }
    .badge.idle        { background: rgba(100,100,100,.1); color: var(--hw-text-3); }
    .badge.training    { background: rgba(52,145,250,.15); color: #3491fa; }
    .badge.trained     { background: rgba(0,168,112,.15);  color: var(--hw-success); }
    .badge.error       { background: rgba(245,63,63,.12);  color: var(--hw-danger); }
    .badge.unavailable { background: rgba(245,63,63,.08);  color: var(--hw-text-3); }

    /* ── training meta ────────────────────────────────────────────── */
    .train-meta { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 18px;
                  padding: 14px 16px; background: var(--hw-bg); border-radius: 8px; }
    .meta-item  { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 11px; color: var(--hw-text-3); text-transform: uppercase; letter-spacing: .5px; }
    .meta-val   { font-size: 15px; font-weight: 700; color: var(--hw-text); }

    /* ── spinner ──────────────────────────────────────────────────── */
    .spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35);
               border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── metrics table ────────────────────────────────────────────── */
    .metrics-block { margin-top: 4px; border: 1px solid var(--hw-border); border-radius: 8px; overflow: hidden; }
    .metrics-title { padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--hw-text-3);
                     text-transform: uppercase; letter-spacing: .4px; background: var(--hw-bg); border-bottom: 1px solid var(--hw-border); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 9px 14px; border-bottom: 1px solid var(--hw-border); background: var(--hw-bg); }
    .tbl td { padding: 10px 14px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: none; }
    .num  { font-weight: 700; color: var(--hw-text); font-family: monospace; }
    .dim  { color: var(--hw-text-3); font-size: 12px; }
    .mono { font-family: monospace; }
    .model-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
    .metrics-legend { display: flex; gap: 20px; padding: 10px 14px; background: var(--hw-bg);
                      border-top: 1px solid var(--hw-border); flex-wrap: wrap; }
    .leg-item { font-size: 12px; color: var(--hw-text-3); }
    .train-err { color: var(--hw-danger); font-size: 13px; margin-top: 10px; padding: 10px 14px;
                 background: rgba(245,63,63,.06); border-radius: 6px; }

    /* ── tools grid ───────────────────────────────────────────────── */
    .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .tool-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
    .field-row { display: flex; align-items: center; gap: 12px; }
    .field-label { font-size: 12px; color: var(--hw-text-3); min-width: 130px; }
    .file-input { flex: 1; font-size: 13px; }
    .num-input { width: 90px; padding: 7px 10px; border: 1px solid var(--hw-border); border-radius: 6px;
                 font-size: 13px; background: var(--hw-bg); color: var(--hw-text); }
    .full-btn { width: 100%; margin-top: 6px; justify-content: center; }

    /* ── result block ─────────────────────────────────────────────── */
    .result-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--hw-border); }
    .result-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .result-title { font-size: 14px; font-weight: 600; color: var(--hw-text); }
    .result-meta { font-size: 12px; color: var(--hw-text-3); margin-top: 2px; }
    .result-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
    .kpi { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--hw-text-3); }
    .kpi span { font-size: 20px; font-weight: 700; color: var(--hw-text); }

    /* ── sim sample ───────────────────────────────────────────────── */
    .sim-sample { margin-top: 14px; }
    .sample-label { font-size: 11px; color: var(--hw-text-3); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
    .sample-row { display: flex; align-items: center; gap: 10px; padding: 7px 0;
                  border-bottom: 1px solid var(--hw-border); font-size: 12px; }
    .sample-row:last-child { border-bottom: none; }
    .dir { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }
    .dir.in  { background: rgba(52,145,250,.12); color: var(--hw-info); }
    .dir.out { background: rgba(114,46,209,.12); color: #722ed1; }
    .lvl { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px; margin-left: auto; flex-shrink: 0; }
    .lvl.HIGH   { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .lvl.MEDIUM { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .lvl.LOW    { background: rgba(0,168,112,.12); color: var(--hw-success); }

    /* ── modal ────────────────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 24px;
    }
    .modal {
      background: var(--hw-bg-card, var(--hw-bg)); border: 1px solid var(--hw-border);
      border-radius: 12px; width: 100%; max-width: 860px; max-height: 90vh;
      overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,.3);
    }
    .modal-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 22px 24px 0; margin-bottom: 18px;
    }
    .modal-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--hw-text); }
    .modal-sub { margin: 4px 0 0; font-size: 13px; color: var(--hw-text-3); }
    .modal-close {
      background: none; border: none; font-size: 18px; cursor: pointer;
      color: var(--hw-text-3); padding: 4px 8px; border-radius: 6px; flex-shrink: 0;
      line-height: 1;
    }
    .modal-close:hover { background: var(--hw-bg); color: var(--hw-text); }

    .modal-stats {
      display: flex; gap: 24px; padding: 14px 24px; background: var(--hw-bg);
      border-top: 1px solid var(--hw-border); border-bottom: 1px solid var(--hw-border);
      margin-bottom: 20px; flex-wrap: wrap;
    }
    .ms { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--hw-text-3); }
    .ms span { font-size: 20px; font-weight: 700; color: var(--hw-text); }

    .modal-chart-wrap { padding: 0 24px 20px; }
    .chart-legend { display: flex; gap: 16px; margin-bottom: 10px; }
    .leg { font-size: 12px; font-weight: 600; padding: 2px 0; }
    .leg::before { content: ''; display: inline-block; width: 24px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
    .leg.history::before { background: #c9cdd4; }
    .leg.forecast::before { background: #3491fa; border-top: 2px dashed #3491fa; background: none; }

    .modal-table-wrap { padding: 0 24px 20px; }
    .mt-title { font-size: 12px; font-weight: 600; color: var(--hw-text-3); text-transform: uppercase;
                letter-spacing: .4px; margin-bottom: 10px; }
    .pred-row td { color: #3491fa; }
    .type-badge { font-size: 11px; padding: 2px 8px; border-radius: 6px;
                  background: rgba(100,100,100,.08); color: var(--hw-text-3); }
    .type-badge.is-pred { background: rgba(52,145,250,.12); color: #3491fa; }
    .sev { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .sev.CRITICAL { background: rgba(245,63,63,.14); color: var(--hw-danger); }
    .sev.WARNING  { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .sev.INFO     { background: rgba(52,145,250,.12); color: var(--hw-info); }

    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }

    @media (max-width: 1000px) { .tools-grid, .train-meta { grid-template-columns: 1fr; } }
    @media (max-width: 640px)  { .result-kpis { grid-template-columns: 1fr 1fr; } }
  `],
})
export class RoamingTools implements OnDestroy {
  private api = inject(RoamingService);
  private pollSub: Subscription | null = null;

  error    = signal<string | null>(null);
  training = signal(false);
  trainState = signal<MlTrainState | null>(null);

  file: File | null = null;
  uploadHours = 6;
  uploading   = signal(false);
  csv         = signal<CsvAnalysis | null>(null);
  showForecastModal = signal(false);

  simCount = 40; simSpread = 120; simWindow = 120;
  simulating = signal(false);
  sim        = signal<SimulationResult | null>(null);

  statusClass = computed(() => this.trainState()?.status ?? 'unavailable');

  csvAllData = computed(() => {
    const f = this.csv()?.forecast; if (!f) return [];
    return [...f.history.map((p) => p.subscribers), ...f.forecast.map((p) => p.subscribers)];
  });
  csvAllLabels = computed(() => {
    const f = this.csv()?.forecast; if (!f) return [];
    return [...f.history.map((p) => p.hour), ...f.forecast.map((p) => p.hour)];
  });

  trendSign  = computed(() => (this.csv()?.forecast?.trendPerHour ?? 0) >= 0 ? '+' : '');
  trendAbs   = computed(() => Math.abs(this.csv()?.forecast?.trendPerHour ?? 0));

  modalRows(c: CsvAnalysis) {
    const f = c.forecast;
    return [
      ...f.history.map((p) => ({ hour: p.hour, subscribers: p.subscribers, predicted: false })),
      ...f.forecast.map((p) => ({ hour: p.hour, subscribers: p.subscribers, predicted: true })),
    ];
  }

  constructor() { this.fetchStatus(); }

  ngOnDestroy() { this.pollSub?.unsubscribe(); }

  fetchStatus() {
    this.api.trainStatus().subscribe({
      next: (s) => this.trainState.set(s),
      error: () => this.trainState.set({
        status: 'unavailable', started_at: null, finished_at: null,
        data_points: 0, train_points: 0, test_points: 0, metrics: {}, error: 'ML service unreachable',
      }),
    });
  }

  train() {
    this.training.set(true);
    this.error.set(null);
    this.api.trainMl().subscribe({
      next: (s) => {
        this.trainState.set(s);
        this.training.set(false);
        if (s.status === 'started' || s.status === 'training') { this.startPolling(); }
      },
      error: (e) => { this.fail(e); this.training.set(false); },
    });
  }

  private startPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(2500).pipe(
      switchMap(() => this.api.trainStatus()),
      takeWhile((s) => s.status === 'training' || s.status === 'idle', true),
    ).subscribe({ next: (s) => this.trainState.set(s), error: () => {} });
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file = input.files && input.files.length ? input.files[0] : null;
  }

  upload() {
    if (!this.file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.showForecastModal.set(false);
    this.api.uploadCsv(this.file, this.uploadHours).subscribe({
      next: (c) => { this.csv.set(c); this.uploading.set(false); this.showForecastModal.set(true); },
      error: (e) => { this.fail(e); this.uploading.set(false); },
    });
  }

  simulate() {
    this.simulating.set(true);
    this.error.set(null);
    this.api.simulate(this.simCount, this.simSpread, this.simWindow).subscribe({
      next: (s) => { this.sim.set(s); this.simulating.set(false); },
      error: (e) => { this.fail(e); this.simulating.set(false); },
    });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : ((err.error as any)?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
