import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { BarChart } from '../../../shared/charts/bar-chart';
import { AsyncState } from '../../../shared/ui/async-state';
import { RoamingService, RoamingEvent, EventFilter } from './roaming.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-roaming-events-page',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, PageHeader, BarChart, AsyncState],
  template: `
    <hw-page-header title="Roaming · Events"
      subtitle="Inbound / outbound roaming events with risk scoring">
      <button class="hw-btn" (click)="loadEvents()">Refresh</button>
    </hw-page-header>

    <hw-async-state [loading]="loading()" [error]="error()" (retry)="loadEvents()" />

    <div class="hw-card panel">
      <div class="filters">
        <select [(ngModel)]="filter.direction" (change)="onFilter()">
          <option value="">All directions</option><option value="INBOUND">Inbound</option><option value="OUTBOUND">Outbound</option>
        </select>
        <select [(ngModel)]="filter.riskLevel" (change)="onFilter()">
          <option value="">All risk</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
        </select>
        <input [(ngModel)]="filter.partnerPlmn" (keyup.enter)="onFilter()" placeholder="Partner PLMN (partial)" />
        <button class="hw-btn" (click)="onFilter()">Filter</button>
      </div>
    </div>

    <div class="hw-card panel">
      <div class="panel-head"><h3>Top partners by subscribers</h3><span class="tag">current result set</span></div>
      <hw-bar-chart [data]="barData()" [labels]="barLabels()" color="#3491fa" ariaLabel="Top partners by subscribers" />
    </div>

    <div class="grid">
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Roaming events</h3>
          <span class="tag">{{ events().length }} rows</span>
        </div>
        <table class="tbl">
          <thead><tr><th>Time</th><th>Dir</th><th>PLMN</th><th>Country</th><th>Subs</th><th>Latency</th><th>Risk</th></tr></thead>
          <tbody>
            @for (e of pagedEvents(); track e.id) {
              <tr class="click" [class.sel]="selected()?.id === e.id" (click)="openEvent(e.id)">
                <td>{{ e.timestamp | date:'MMM d, HH:mm' }}</td>
                <td><span class="dir" [class.in]="e.direction==='INBOUND'" [class.out]="e.direction==='OUTBOUND'">{{ e.direction }}</span></td>
                <td class="mono">{{ e.partnerPlmn }}</td><td>{{ e.country }}</td><td>{{ e.subscribers }}</td>
                <td class="muted">{{ e.avgLatencyMs }} ms</td>
                <td><span class="lvl" [class]="e.riskLevel">{{ e.riskScore }}</span></td>
              </tr>
            } @empty { <tr><td class="empty" colspan="7">No events match.</td></tr> }
          </tbody>
        </table>
        @if (totalPages() > 1) {
          <div class="pager">
            <button class="hw-btn pager-btn" [disabled]="page() === 0" (click)="page.set(page() - 1)">← Prev</button>
            <span class="pager-info">Page {{ page() + 1 }} / {{ totalPages() }}</span>
            <button class="hw-btn pager-btn" [disabled]="page() >= totalPages() - 1" (click)="page.set(page() + 1)">Next →</button>
          </div>
        }
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Event detail</h3></div>
        @if (selected(); as e) {
          <dl class="detail">
            <dt>ID</dt><dd class="mono">{{ e.id }}</dd>
            <dt>Time</dt><dd>{{ e.timestamp | date:'medium' }}</dd>
            <dt>Direction</dt><dd>{{ e.direction }}</dd>
            <dt>Partner</dt><dd class="mono">{{ e.partnerPlmn }} · {{ e.country }}</dd>
            <dt>Subscribers</dt><dd>{{ e.subscribers }}</dd>
            <dt>Signalling errors</dt><dd>{{ e.signalingErrors }}</dd>
            <dt>New-device ratio</dt><dd>{{ e.newDeviceRatio * 100 | number:'1.0-0' }}%</dd>
            <dt>Impossible travel</dt><dd>{{ e.impossibleTravel ? 'Yes' : 'No' }}</dd>
            <dt>Latency / Throughput</dt><dd>{{ e.avgLatencyMs }} ms · {{ e.throughputMbps }} Mbps</dd>
            <dt>Dropped sessions</dt><dd>{{ e.droppedSessionRatio * 100 | number:'1.0-1' }}%</dd>
            <dt>Revenue / Cost</dt><dd>{{ e.revenueEur | number:'1.0-2' }}€ / {{ e.costEur | number:'1.0-2' }}€</dd>
            <dt>Risk</dt><dd><span class="lvl" [class]="e.riskLevel">{{ e.riskScore }} · {{ e.riskLevel }}</span></dd>
          </dl>
        } @else { <p class="muted small">Select an event to see full detail.</p> }
      </div>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .filters select, .filters input { padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px; font-size: 13px; background: var(--hw-bg); color: var(--hw-text); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .click { cursor: pointer; }
    .click:hover { background: var(--hw-bg); }
    .sel { background: rgba(52,145,250,.08); }
    .mono { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .small { font-size: 12px; }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .dir { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .dir.in { background: rgba(52,145,250,.12); color: var(--hw-info); }
    .dir.out { background: rgba(114,46,209,.12); color: #722ed1; }
    .lvl { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .lvl.HIGH { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .lvl.MEDIUM { background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .lvl.LOW { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .detail dt { font-size: 11px; color: var(--hw-text-3); margin-top: 8px; }
    .detail dd { margin: 0; font-size: 13px; color: var(--hw-text-2); }
    .pager { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 14px 0 4px; }
    .pager-btn { min-width: 80px; }
    .pager-info { font-size: 13px; color: var(--hw-text-3); min-width: 110px; text-align: center; }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class RoamingEventsPage implements OnInit {
  private api = inject(RoamingService);

  events = signal<RoamingEvent[]>([]);
  selected = signal<RoamingEvent | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);
  page = signal(0);
  readonly pageSize = PAGE_SIZE;

  filter: EventFilter = { direction: '', partnerPlmn: '', riskLevel: '' };

  pagedEvents = computed(() => {
    const p = this.page(), ps = this.pageSize;
    return this.events().slice(p * ps, (p + 1) * ps);
  });
  totalPages = computed(() => Math.ceil(this.events().length / this.pageSize));

  private topPartners = computed(() => {
    const totals = new Map<string, number>();
    for (const e of this.events()) { totals.set(e.partnerPlmn, (totals.get(e.partnerPlmn) ?? 0) + e.subscribers); }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  });
  barData = computed(() => this.topPartners().map((p) => p[1]));
  barLabels = computed(() => this.topPartners().map((p) => p[0]));

  ngOnInit() { this.loadEvents(); }

  onFilter() { this.page.set(0); this.loadEvents(); }

  loadEvents() {
    this.error.set(null);
    this.loading.set(true);
    this.api.events(this.filter).subscribe({
      next: (data) => { this.events.set(data); this.loading.set(false); },
      error: (e) => { this.fail(e); this.loading.set(false); },
    });
  }

  openEvent(id: string) {
    this.api.event(id).subscribe({ next: (e) => this.selected.set(e), error: (e) => this.fail(e) });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
