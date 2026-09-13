import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { MultiLineChart, ChartSeries } from '../../../shared/charts/multi-line-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { GaugeChart } from '../../../shared/charts/gauge-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import { RoamingService, RoamingSummary, LiveMonitor, MultiModelForecast } from './roaming.service';

@Component({
  selector: 'app-roaming-overview',
  standalone: true,
  imports: [DecimalPipe, PageHeader, StatCard, LineChart, MultiLineChart, DonutChart, GaugeChart, AsyncState],
  template: `
    <hw-page-header title="Roaming · Overview"
      subtitle="Traffic, risk mix, live monitor and traffic forecast">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    @if (summary(); as s) {
      <div class="stats">
        <hw-stat-card label="Total events" [value]="s.totalEvents" accent="#3491fa" />
        <hw-stat-card label="Subscribers" [value]="s.totalSubscribers" accent="#00a870" />
        <hw-stat-card label="Inbound / Outbound" [value]="s.inboundCount + ' / ' + s.outboundCount" accent="#722ed1" />
        <hw-stat-card label="High-risk events" [value]="s.highRiskCount" accent="#f53f3f" />
      </div>

      <div class="grid g21">
        <div class="hw-card panel">
          <div class="panel-head"><h3>Roaming volume</h3><span class="tag">subscribers over time</span></div>
          <hw-line-chart [data]="volumeData()" [labels]="volumeLabels()" [smooth]="true" color="#3491fa" ariaLabel="Roaming volume" />
        </div>
        <div class="hw-card panel">
          <div class="panel-head"><h3>Risk mix</h3></div>
          <hw-donut-chart [slices]="riskSlices()" centerLabel="events" />
        </div>
      </div>

      <div class="grid g3">
        <div class="hw-card panel center">
          <div class="panel-head"><h3>Avg risk</h3><span class="tag">live</span></div>
          <hw-gauge-chart [value]="live()?.avgRiskScore ?? 0" [higherIsBetter]="false" label="risk" ariaLabel="Average risk" />
        </div>
        <div class="hw-card panel">
          <div class="panel-head"><h3>Direction split</h3></div>
          <hw-donut-chart [slices]="dirSlices()" centerLabel="events" />
        </div>
        @if (live(); as l) {
          <div class="hw-card panel">
            <div class="panel-head"><h3>Real-time monitor</h3><span class="tag">last {{ l.windowMinutes }} min</span></div>
            <div class="mini-stats">
              <div><span>{{ l.activeEvents }}</span>events</div>
              <div><span>{{ l.activeSubscribers }}</span>subscribers</div>
              <div><span>{{ l.eventsPerMinute | number:'1.0-1' }}</span>events/min</div>
              <div><span>{{ l.windowRevenueEur | number:'1.0-0' }}€</span>revenue</div>
            </div>
          </div>
        }
      </div>

      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Traffic forecast — ML models</h3>
          <span class="tag">
            @if (mlLoading()) {
              Loading ML models…
            } @else if (mlHasPredictions()) {
              LSTM · Prophet · ARIMA · Ensemble &nbsp;|&nbsp; {{ mlForecast()!.history.length }} history pts · right of divider = predicted
            } @else if (mlForecast()) {
              {{ mlForecast()!.history.length }} history pts loaded — train models in Tools tab
            } @else {
              Roaming service unavailable
            }
          </span>
        </div>
        @if (mlHasPredictions()) {
          <hw-multi-line-chart
            [series]="mlSeries()"
            [labels]="mlLabels()"
            [dividerIndex]="mlForecast()!.history.length"
            ariaLabel="ML traffic forecast" />
        } @else if (!mlLoading() && mlForecast()) {
          <div class="ml-hint">
            <div class="ml-hint-icon">🤖</div>
            <div>
              <strong>{{ mlForecast()!.history.length }} data points loaded.</strong>
              Go to <strong>Tools</strong> to train LSTM · Prophet · ARIMA — predictions will appear here automatically.
            </div>
          </div>
        } @else if (!mlLoading()) {
          <p class="muted-note">Cannot reach roaming service. Check that the roaming-analysis JAR is running and the ML service is up: <code>docker compose -f docker/docker-compose-infra.yml up ml-service -d</code></p>
        }
      </div>
    }
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .g21 { grid-template-columns: 2fr 1fr; }
    .g3 { grid-template-columns: 1fr 1fr 1fr; }
    .panel { padding: 18px 20px; }
    .panel.center { display: flex; flex-direction: column; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .note { padding: 16px 20px; font-size: 13px; color: var(--hw-text-3); }
    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }
    .mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .mini-stats div { display: flex; flex-direction: column; font-size: 12px; color: var(--hw-text-3); }
    .mini-stats span { font-size: 22px; font-weight: 700; color: var(--hw-text); }
    .muted-note { font-size: 13px; color: var(--hw-text-3); padding: 8px 0; }
    .muted-note code { background: var(--hw-bg-2); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .ml-hint { display: flex; align-items: center; gap: 14px; padding: 18px; background: rgba(52,145,250,.06); border-radius: 8px; border: 1px solid rgba(52,145,250,.15); font-size: 13px; color: var(--hw-text-2); }
    .ml-hint-icon { font-size: 28px; }
    @media (max-width: 1000px) { .stats, .g21, .g3 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingOverview implements OnInit {
  private api = inject(RoamingService);

  summary = signal<RoamingSummary | null>(null);
  live = signal<LiveMonitor | null>(null);
  mlForecast = signal<MultiModelForecast | null>(null);
  mlLoading = signal(true);
  mlHasPredictions = computed(() => {
    const f = this.mlForecast();
    return !!(f && (f.lstm.length || f.prophet.length || f.arima.length || f.ensemble.length));
  });
  error = signal<string | null>(null);
  loading = signal(true);

  volumeData = computed(() => this.summary()?.volumeSeries.map((p) => p.subscribers) ?? []);
  volumeLabels = computed(() => this.summary()?.volumeSeries.map((p) => p.label) ?? []);
  riskSlices = computed<DonutSlice[]>(() => {
    const m = this.summary()?.byRiskLevel ?? {};
    return [
      { label: 'Low', value: m['LOW'] ?? 0, color: '#00a870' },
      { label: 'Medium', value: m['MEDIUM'] ?? 0, color: '#ff8f1f' },
      { label: 'High', value: m['HIGH'] ?? 0, color: '#f53f3f' },
    ];
  });
  dirSlices = computed<DonutSlice[]>(() => {
    const s = this.summary();
    return [
      { label: 'Inbound', value: s?.inboundCount ?? 0, color: '#3491fa' },
      { label: 'Outbound', value: s?.outboundCount ?? 0, color: '#722ed1' },
    ];
  });
  mlLabels = computed(() => {
    const f = this.mlForecast();
    if (!f) return [];
    const histLabels = f.history.map((p) => p.timestamp.slice(11, 16));
    const predLabels = (f.ensemble.length ? f.ensemble : f.lstm.length ? f.lstm : f.arima)
      .map((p) => p.timestamp.slice(11, 16));
    return [...histLabels, ...predLabels];
  });

  mlSeries = computed<ChartSeries[]>(() => {
    const f = this.mlForecast();
    if (!f) return [];
    const histVals = f.history.map((p) => p.subscribers);
    const pad = (arr: typeof f.lstm) =>
      arr.length ? [...Array(f.history.length).fill(null as unknown as number), ...arr.map((p) => p.subscribers)] : [];
    return [
      { label: 'History', color: '#c9cdd4', data: [...histVals, ...Array(f.ensemble.length || f.lstm.length || 0).fill(null as unknown as number)] },
      { label: 'LSTM', color: '#3491fa', data: pad(f.lstm) },
      { label: 'Prophet', color: '#00a870', data: pad(f.prophet) },
      { label: 'ARIMA', color: '#ff8f1f', data: pad(f.arima) },
      { label: 'Ensemble', color: '#722ed1', data: pad(f.ensemble), dashed: true },
    ].filter((s) => s.data.some((v) => v !== null && v > 0));
  });

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.loading.set(true);
    this.mlLoading.set(true);
    this.api.summary().subscribe({
      next: (v) => { this.summary.set(v); this.loading.set(false); },
      error: (e) => { this.fail(e); this.loading.set(false); },
    });
    this.api.live(60).subscribe({ next: (v) => this.live.set(v), error: () => {} });
    this.api.forecastMl(6).subscribe({
      next: (v) => { this.mlForecast.set(v); this.mlLoading.set(false); },
      error: () => { this.mlLoading.set(false); },
    });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
