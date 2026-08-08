import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';

interface Overview {
  totalRequests: number; requestsPerSecond: number; totalExceptions: number;
  percent2xx: number; percent5xx: number;
  requestsByUri: { uri: string; count: number }[];
  avgDurationByUri: { uri: string; ms: number }[];
}

const POLL_MS = 5000;
const TOP = 8;

@Component({
  selector: 'app-admin-metrics',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, DonutChart],
  template: `
    <hw-page-header title="API Metrics"
      subtitle="Request throughput, latency and errors across the platform (Prometheus)">
      <span class="live">● live · {{ pollLabel }}</span>
    </hw-page-header>

    @if (o(); as m) {
      <div class="stats">
        <hw-stat-card label="Total requests" [value]="m.totalRequests" accent="#c11536" />
        <hw-stat-card label="Requests / sec" [value]="m.requestsPerSecond" accent="#3491fa" />
        <hw-stat-card label="Success (2xx)" [value]="m.percent2xx" unit="%" accent="#00a870" />
        <hw-stat-card label="Errors (5xx)" [value]="m.percent5xx" unit="%" accent="#ff8f1f" />
        <hw-stat-card label="Exceptions" [value]="m.totalExceptions" accent="#f53f3f" />
      </div>

      <div class="grid">
        <div class="hw-card panel span2">
          <div class="panel-head"><h3>Top endpoints by requests</h3><span class="tag">count</span></div>
          <hw-bar-chart [data]="reqData()" [labels]="reqLabels()" color="#c11536"
                        ariaLabel="Top endpoints by request count" />
        </div>

        <div class="hw-card panel">
          <div class="panel-head"><h3>Status mix</h3></div>
          <hw-donut-chart [slices]="statusSlices()" centerLabel="%" />
        </div>

        <div class="hw-card panel span2">
          <div class="panel-head"><h3>Slowest endpoints</h3><span class="tag">avg ms</span></div>
          <hw-bar-chart [data]="durData()" [labels]="durLabels()" color="#722ed1"
                        ariaLabel="Slowest endpoints by average duration" />
        </div>

        <div class="hw-card panel">
          <div class="panel-head"><h3>Endpoints</h3><span class="tag">req · ms</span></div>
          <table class="tbl">
            <tbody>
              @for (r of merged(); track r.uri) {
                <tr>
                  <td class="uri" [title]="r.uri">{{ short(r.uri) }}</td>
                  <td class="num">{{ r.count }}</td>
                  <td class="num muted">{{ r.ms }} ms</td>
                </tr>
              } @empty { <tr><td class="empty" colspan="3">No data.</td></tr> }
            </tbody>
          </table>
        </div>
      </div>
    } @else {
      <div class="hw-card note">
        No metric data yet. Ensure the observability stack is running and Prometheus is scraping the
        services (targets in <code>docker/prometheus/prometheus.yml</code>).
      </div>
    }
  `,
  styles: [`
    .live { font-size: 12px; font-weight: 600; color: var(--hw-success); }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .note { padding: 16px 20px; font-size: 13px; color: var(--hw-text-3); }
    .note code { font-family: monospace; background: var(--hw-bg); padding: 1px 5px; border-radius: 4px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl td { padding: 8px 4px; border-bottom: 1px solid var(--hw-border); }
    .tbl tr:last-child td { border-bottom: 0; }
    .uri { color: var(--hw-text-2); font-family: monospace; font-size: 12px; }
    .num { text-align: right; font-weight: 600; color: var(--hw-text); white-space: nowrap; }
    .num.muted { color: var(--hw-text-3); font-weight: 500; }
    .empty { text-align: center; color: var(--hw-text-3); padding: 20px; }
    @media (max-width: 1100px) { .grid, .stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 620px) { .grid, .stats { grid-template-columns: 1fr; } }
  `],
})
export class AdminMetrics implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private sub?: Subscription;
  pollLabel = `${POLL_MS / 1000}s`;

  o = signal<Overview | null>(null);

  private topReq = computed(() =>
    [...(this.o()?.requestsByUri ?? [])].sort((a, b) => b.count - a.count).slice(0, TOP));
  private topDur = computed(() =>
    [...(this.o()?.avgDurationByUri ?? [])].sort((a, b) => b.ms - a.ms).slice(0, TOP));

  reqData = computed(() => this.topReq().map((r) => r.count));
  reqLabels = computed(() => this.topReq().map((r) => this.short(r.uri)));
  durData = computed(() => this.topDur().map((r) => r.ms));
  durLabels = computed(() => this.topDur().map((r) => this.short(r.uri)));

  statusSlices = computed<DonutSlice[]>(() => {
    const m = this.o();
    if (!m) return [];
    const other = Math.max(0, Math.round((100 - m.percent2xx - m.percent5xx) * 10) / 10);
    return [
      { label: '2xx success', value: m.percent2xx, color: '#00a870' },
      { label: '5xx errors', value: m.percent5xx, color: '#f53f3f' },
      { label: 'other', value: other, color: '#c9cdd4' },
    ];
  });

  /** Requests-by-URI joined with avg duration, sorted by count. */
  merged = computed(() => {
    const m = this.o();
    if (!m) return [] as { uri: string; count: number; ms: number }[];
    const dur = new Map(m.avgDurationByUri.map((d) => [d.uri, d.ms]));
    return [...m.requestsByUri]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((r) => ({ uri: r.uri, count: r.count, ms: dur.get(r.uri) ?? 0 }));
  });

  ngOnInit() {
    this.sub = interval(POLL_MS).pipe(
      startWith(0),
      switchMap(() => this.http.get<Overview>('/api/metrics/overview')),
    ).subscribe({
      next: (data) => this.o.set(data),
      error: () => this.o.set(null),
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  short(uri: string): string {
    if (!uri) return 'UNKNOWN';
    return uri.length > 16 ? '…' + uri.slice(-15) : uri;
  }
}
