import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import { RoamingService, Anomaly } from './roaming.service';

@Component({
  selector: 'app-roaming-anomalies',
  standalone: true,
  imports: [DatePipe, PageHeader, StatCard, BarChart, DonutChart, AsyncState],
  template: `
    <hw-page-header title="Roaming · Anomalies"
      subtitle="Statistical + rule-based anomaly detection with composite scoring">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="load()" />

    <div class="stats">
      <hw-stat-card label="Anomalies" [value]="anomalies().length" accent="#f53f3f" />
      <hw-stat-card label="Critical" [value]="count('CRITICAL')" accent="#c11536" />
      <hw-stat-card label="Warning" [value]="count('WARNING')" accent="#ff8f1f" />
      <hw-stat-card label="Info" [value]="count('INFO')" accent="#3491fa" />
    </div>

    <div class="grid g21">
      <div class="hw-card panel">
        <div class="panel-head"><h3>Highest anomaly scores</h3><span class="tag">top 8</span></div>
        <hw-bar-chart [data]="barData()" [labels]="barLabels()" color="#f53f3f" ariaLabel="Top anomaly scores" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>By severity</h3></div>
        <hw-donut-chart [slices]="sevSlices()" centerLabel="flags" />
      </div>
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Detected anomalies</h3><span class="tag">by anomaly score</span></div>
      <table class="tbl">
        <thead><tr><th>Time</th><th>PLMN</th><th>Country</th><th>Score</th><th>Risk</th><th>σ dev</th><th>Severity</th><th>Reasons</th></tr></thead>
        <tbody>
          @for (a of anomalies(); track a.id) {
            <tr>
              <td>{{ a.timestamp | date:'MMM d, HH:mm' }}</td>
              <td class="mono">{{ a.partnerPlmn }}</td><td>{{ a.country }}</td>
              <td><strong>{{ a.anomalyScore }}</strong></td>
              <td><span class="lvl" [class]="a.riskLevel">{{ a.riskScore }}</span></td>
              <td class="muted">{{ a.baselineDeviation }}</td>
              <td><span class="sev" [class]="a.severity">{{ a.severity }}</span></td>
              <td class="reasons">{{ a.reasons.join('; ') }}</td>
            </tr>
          } @empty { <tr><td class="empty" colspan="8">No anomalies detected.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .g21 { grid-template-columns: 2fr 1fr; }
    .panel { padding: 18px 20px; }
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
    .reasons { color: var(--hw-text-3); font-size: 12px; max-width: 340px; }
    .lvl { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .lvl.HIGH { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .lvl.MEDIUM { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .lvl.LOW { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .sev { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .sev.CRITICAL { background: rgba(245,63,63,.14); color: var(--hw-danger); }
    .sev.WARNING { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .sev.INFO { background: rgba(52,145,250,.12); color: var(--hw-info); }
    @media (max-width: 1000px) { .stats, .g21 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingAnomalies implements OnInit {
  private api = inject(RoamingService);

  anomalies = signal<Anomaly[]>([]);
  error = signal<string | null>(null);
  loading = signal(true);

  count = (sev: string) => this.anomalies().filter((a) => a.severity === sev).length;

  private top = computed(() => this.anomalies().slice(0, 8));
  barData = computed(() => this.top().map((a) => a.anomalyScore));
  barLabels = computed(() => this.top().map((a) => a.partnerPlmn));
  sevSlices = computed<DonutSlice[]>(() => [
    { label: 'Critical', value: this.count('CRITICAL'), color: '#f53f3f' },
    { label: 'Warning', value: this.count('WARNING'), color: '#ff8f1f' },
    { label: 'Info', value: this.count('INFO'), color: '#3491fa' },
  ]);

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.loading.set(true);
    this.api.anomalies().subscribe({
      next: (data) => { this.anomalies.set(data); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 403
          ? 'Forbidden — your token lacks roaming-events:read.'
          : (err.error?.error ?? `Request failed (${err.status})`));
      },
    });
  }
}
