import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { GaugeChart } from '../../../shared/charts/gauge-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import { RoamingService, Qos, Experience } from './roaming.service';

@Component({
  selector: 'app-roaming-qos',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, GaugeChart, AsyncState],
  template: `
    <hw-page-header title="Roaming · QoS & Experience"
      subtitle="Quality of service and per-partner customer-experience scoring">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    @if (qos(); as q) {
      <div class="grid g13">
        <div class="hw-card panel center">
          <div class="panel-head"><h3>QoS score</h3></div>
          <hw-gauge-chart [value]="q.qosScore" label="quality" ariaLabel="QoS score" />
        </div>
        <div class="stats3">
          <hw-stat-card label="Avg latency" [value]="q.avgLatencyMs" unit="ms" accent="#ff8f1f" />
          <hw-stat-card label="Throughput" [value]="q.throughputMbps" unit="Mbps" accent="#3491fa" />
          <hw-stat-card label="Dropped sessions" [value]="q.dropRatePct" unit="%" accent="#f53f3f" />
        </div>
      </div>
    }

    <div class="hw-card panel">
      <div class="panel-head"><h3>Experience score by partner</h3><span class="tag">worst first</span></div>
      <hw-bar-chart [data]="barData()" [labels]="barLabels()" color="#00a870" ariaLabel="Experience score by partner" />
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Customer experience</h3><span class="tag">{{ experience().length }} partners</span></div>
      <table class="tbl">
        <thead><tr><th>PLMN</th><th>Country</th><th>Events</th><th>Latency</th><th>Throughput</th><th>Drops</th><th>Score</th><th>Rating</th></tr></thead>
        <tbody>
          @for (x of experience(); track x.partnerPlmn) {
            <tr>
              <td class="mono">{{ x.partnerPlmn }}</td><td>{{ x.country }}</td><td>{{ x.events }}</td>
              <td class="muted">{{ x.avgLatencyMs }} ms</td><td class="muted">{{ x.throughputMbps }} Mbps</td>
              <td class="muted">{{ x.dropRatePct }}%</td>
              <td><strong>{{ x.experienceScore }}</strong></td>
              <td><span class="rating" [class]="x.rating">{{ x.rating }}</span></td>
            </tr>
          } @empty { <tr><td class="empty" colspan="8">No experience data.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .g13 { grid-template-columns: 1fr 2fr; }
    .stats3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-content: start; }
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel.center { display: flex; flex-direction: column; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .rating.Excellent, .rating.Good { color: var(--hw-success); font-weight: 600; }
    .rating.Fair { color: var(--hw-warning); font-weight: 600; }
    .rating.Poor { color: var(--hw-danger); font-weight: 600; }
    @media (max-width: 1000px) { .g13, .stats3 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingQos implements OnInit {
  private api = inject(RoamingService);

  qos = signal<Qos | null>(null);
  experience = signal<Experience[]>([]);
  error = signal<string | null>(null);
  loading = signal(true);

  barData = computed(() => this.experience().map((x) => x.experienceScore));
  barLabels = computed(() => this.experience().map((x) => x.partnerPlmn));

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.loading.set(true);
    this.api.qos().subscribe({
      next: (v) => { this.qos.set(v); this.loading.set(false); },
      error: (e) => { this.fail(e); this.loading.set(false); },
    });
    this.api.experience().subscribe({ next: (v) => this.experience.set(v), error: (e) => this.fail(e) });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
