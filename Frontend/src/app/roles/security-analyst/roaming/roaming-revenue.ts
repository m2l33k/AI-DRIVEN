import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { GaugeChart } from '../../../shared/charts/gauge-chart';
import { RoamingService, Revenue, Optimization } from './roaming.service';

@Component({
  selector: 'app-roaming-revenue',
  standalone: true,
  imports: [DecimalPipe, PageHeader, StatCard, BarChart, DonutChart, GaugeChart],
  template: `
    <hw-page-header title="Roaming · Revenue"
      subtitle="Revenue, cost, margin and per-partner agreement optimization">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

    @if (revenue(); as r) {
      <div class="stats">
        <hw-stat-card label="Revenue" [value]="(r.totalRevenueEur | number:'1.0-0') ?? ''" unit="€" accent="#00a870" />
        <hw-stat-card label="Cost" [value]="(r.totalCostEur | number:'1.0-0') ?? ''" unit="€" accent="#ff8f1f" />
        <hw-stat-card label="Margin" [value]="(r.marginEur | number:'1.0-0') ?? ''" unit="€" accent="#3491fa" />
        <hw-stat-card label="Per subscriber" [value]="(r.revenuePerSubscriberEur | number:'1.0-2') ?? ''" unit="€" accent="#722ed1" />
      </div>

      <div class="grid g3">
        <div class="hw-card panel">
          <div class="panel-head"><h3>Top partners by revenue</h3><span class="tag">€</span></div>
          <hw-bar-chart [data]="barData()" [labels]="barLabels()" color="#00a870" ariaLabel="Top partners by revenue" />
        </div>
        <div class="hw-card panel">
          <div class="panel-head"><h3>Revenue split</h3></div>
          <hw-donut-chart [slices]="splitSlices()" centerLabel="€" />
        </div>
        <div class="hw-card panel center">
          <div class="panel-head"><h3>Margin</h3></div>
          <hw-gauge-chart [value]="marginPctClamped()" label="margin %" ariaLabel="Margin percent" />
        </div>
      </div>
    }

    <div class="hw-card panel">
      <div class="panel-head"><h3>Agreement optimization</h3><span class="tag">recommendation per partner</span></div>
      <table class="tbl">
        <thead><tr><th>PLMN</th><th>Country</th><th>Revenue</th><th>Margin</th><th>Margin %</th><th>Risk</th><th>Exp.</th><th>Action</th><th>Recommendation</th></tr></thead>
        <tbody>
          @for (o of optimization(); track o.partnerPlmn) {
            <tr>
              <td class="mono">{{ o.partnerPlmn }}</td><td>{{ o.country }}</td>
              <td>{{ o.revenueEur | number:'1.0-0' }}€</td>
              <td [class.neg]="o.marginEur < 0">{{ o.marginEur | number:'1.0-0' }}€</td>
              <td>{{ o.marginPct | number:'1.0-1' }}%</td>
              <td>{{ o.avgRiskScore }}</td><td>{{ o.experienceScore }}</td>
              <td><span class="action" [class]="o.action">{{ o.action }}</span></td>
              <td class="reasons">{{ o.recommendation }}</td>
            </tr>
          } @empty { <tr><td class="empty" colspan="9">No optimization data.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; gap: 16px; margin-bottom: 16px; }
    .g3 { grid-template-columns: 1fr 1fr 1fr; }
    .panel { padding: 18px 20px; }
    .panel.center { display: flex; flex-direction: column; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .mono { font-family: monospace; }
    .neg { color: var(--hw-danger); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .reasons { color: var(--hw-text-3); font-size: 12px; max-width: 320px; }
    .action { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(52,145,250,.1); color: var(--hw-info); }
    .action.RENEGOTIATE { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .action.PREFERRED { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .action.IMPROVE_QOS, .action.MONITOR { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    @media (max-width: 1000px) { .stats, .g3 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingRevenue implements OnInit {
  private api = inject(RoamingService);

  revenue = signal<Revenue | null>(null);
  optimization = signal<Optimization[]>([]);
  error = signal<string | null>(null);

  barData = computed(() => this.revenue()?.topPartners.map((p) => Math.round(p.revenueEur)) ?? []);
  barLabels = computed(() => this.revenue()?.topPartners.map((p) => p.partnerPlmn) ?? []);
  splitSlices = computed<DonutSlice[]>(() => {
    const r = this.revenue();
    return [
      { label: 'Inbound', value: Math.round(r?.inboundRevenueEur ?? 0), color: '#3491fa' },
      { label: 'Outbound', value: Math.round(r?.outboundRevenueEur ?? 0), color: '#722ed1' },
    ];
  });
  marginPctClamped = computed(() => Math.max(0, Math.min(100, Math.round(this.revenue()?.marginPct ?? 0))));

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.api.revenue().subscribe({ next: (v) => this.revenue.set(v), error: (e) => this.fail(e) });
    this.api.optimization().subscribe({ next: (v) => this.optimization.set(v), error: (e) => this.fail(e) });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
