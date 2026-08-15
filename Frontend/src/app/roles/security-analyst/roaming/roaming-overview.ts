import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { GaugeChart } from '../../../shared/charts/gauge-chart';
import { RoamingService, RoamingSummary, LiveMonitor, Forecast } from './roaming.service';

@Component({
  selector: 'app-roaming-overview',
  standalone: true,
  imports: [DecimalPipe, PageHeader, StatCard, LineChart, DonutChart, GaugeChart],
  template: `
    <hw-page-header title="Roaming · Overview"
      subtitle="Traffic, risk mix, live monitor and traffic forecast">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

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

      @if (forecast(); as f) {
        <div class="hw-card panel">
          <div class="panel-head">
            <h3>Traffic forecast</h3>
            <span class="tag">{{ f.method }} · trend {{ f.trendPerHour }}/h · right of divider = predicted</span>
          </div>
          <hw-line-chart [data]="forecastData()" [labels]="forecastLabels()" [smooth]="true" color="#722ed1" ariaLabel="Forecast" />
        </div>
      }
    } @else if (!error()) { <div class="hw-card note">Loading…</div> }
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
    @media (max-width: 1000px) { .stats, .g21, .g3 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingOverview implements OnInit {
  private api = inject(RoamingService);

  summary = signal<RoamingSummary | null>(null);
  live = signal<LiveMonitor | null>(null);
  forecast = signal<Forecast | null>(null);
  error = signal<string | null>(null);

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
  forecastData = computed(() => {
    const f = this.forecast(); if (!f) return [];
    return [...f.history.map((p) => p.subscribers), ...f.forecast.map((p) => p.subscribers)];
  });
  forecastLabels = computed(() => {
    const f = this.forecast(); if (!f) return [];
    return [...f.history.map((p) => p.hour), ...f.forecast.map((p) => p.hour)];
  });

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.api.summary().subscribe({ next: (v) => this.summary.set(v), error: (e) => this.fail(e) });
    this.api.live(60).subscribe({ next: (v) => this.live.set(v), error: () => {} });
    this.api.forecast(6).subscribe({ next: (v) => this.forecast.set(v), error: () => {} });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
