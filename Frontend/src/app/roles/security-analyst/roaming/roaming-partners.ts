import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { RoamingService, PartnerSummary } from './roaming.service';

@Component({
  selector: 'app-roaming-partners',
  standalone: true,
  imports: [PageHeader, BarChart, DonutChart],
  template: `
    <hw-page-header title="Roaming · Partners"
      subtitle="Per-partner-PLMN roll-up ordered by average risk">
      <button class="hw-btn" (click)="load()">Refresh</button>
    </hw-page-header>

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

    <div class="grid g21">
      <div class="hw-card panel">
        <div class="panel-head"><h3>Average risk by partner</h3><span class="tag">top 10</span></div>
        <hw-bar-chart [data]="barData()" [labels]="barLabels()" color="#ff8f1f" ariaLabel="Average risk by partner" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Peak risk distribution</h3></div>
        <hw-donut-chart [slices]="peakSlices()" centerLabel="partners" />
      </div>
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Partners</h3><span class="tag">{{ partners().length }} partner PLMNs</span></div>
      <table class="tbl">
        <thead><tr><th>PLMN</th><th>Country</th><th>Events</th><th>Subscribers</th><th>Avg risk</th><th>Peak</th><th>High-risk</th></tr></thead>
        <tbody>
          @for (p of partners(); track p.partnerPlmn) {
            <tr>
              <td class="mono">{{ p.partnerPlmn }}</td><td>{{ p.country }}</td>
              <td>{{ p.events }}</td><td>{{ p.subscribers }}</td>
              <td><span class="lvl" [class]="p.peakRiskLevel">{{ p.avgRiskScore }}</span></td>
              <td>{{ p.peakRiskLevel }}</td><td>{{ p.highRiskCount }}</td>
            </tr>
          } @empty { <tr><td class="empty" colspan="7">No partner data.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
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
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .lvl { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .lvl.HIGH { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .lvl.MEDIUM { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .lvl.LOW { background: rgba(0,168,112,.12); color: var(--hw-success); }
    @media (max-width: 1000px) { .g21 { grid-template-columns: 1fr; } }
  `],
})
export class RoamingPartners implements OnInit {
  private api = inject(RoamingService);

  partners = signal<PartnerSummary[]>([]);
  error = signal<string | null>(null);

  private top = computed(() => this.partners().slice(0, 10));
  barData = computed(() => this.top().map((p) => p.avgRiskScore));
  barLabels = computed(() => this.top().map((p) => p.partnerPlmn));
  peakSlices = computed<DonutSlice[]>(() => {
    const c = (lvl: string) => this.partners().filter((p) => p.peakRiskLevel === lvl).length;
    return [
      { label: 'Low', value: c('LOW'), color: '#00a870' },
      { label: 'Medium', value: c('MEDIUM'), color: '#ff8f1f' },
      { label: 'High', value: c('HIGH'), color: '#f53f3f' },
    ];
  });

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.api.partners().subscribe({
      next: (data) => this.partners.set(data),
      error: (err) => this.error.set(err.status === 403
        ? 'Forbidden — your token lacks roaming-events:read.'
        : (err.error?.error ?? `Request failed (${err.status})`)),
    });
  }
}
