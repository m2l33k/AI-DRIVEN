import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { AuditService, AuditStats } from '../../shared/audit/audit.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, DonutChart, CommonModule, DatePipe, DecimalPipe, RouterLink],
  template: `
    <hw-page-header title="Audit Overview"
      subtitle="Platform activity and compliance signals — last 7 days (audit:read)">
      <span class="live-badge" [class.active]="live()">
        <span class="dot"></span>{{ live() ? 'LIVE' : 'connecting…' }}
      </span>
      <button class="hw-btn" (click)="refresh()">↻ Refresh</button>
    </hw-page-header>

    @if (!live()) {
      <div class="loading-bar">Loading audit statistics…</div>
    }

    @if (live()) {
      <div class="stats">
        <hw-stat-card label="Events logged (7d)" [value]="stats()!.total"    [delta]="0" accent="#ff8f1f" />
        <hw-stat-card label="Write actions"       [value]="stats()!.writeActions"  [delta]="0" accent="#c7000b" />
        <hw-stat-card label="Denied actions"      [value]="stats()!.deniedActions" [delta]="0" accent="#f53f3f" />
        <hw-stat-card label="Active actors"       [value]="stats()!.activeActors"  [delta]="0" accent="#3491fa" />
      </div>

      <div class="grid">
        <!-- bar chart -->
        <div class="hw-card panel span2">
          <div class="panel-head">
            <h3>Events by day</h3>
            <span class="tag">Last 7 days</span>
          </div>
          <hw-bar-chart [data]="perDay()" [labels]="dayLabels()" color="#ff8f1f" ariaLabel="Events by day" />
        </div>

        <!-- donut -->
        <div class="hw-card panel">
          <div class="panel-head"><h3>Events by outcome</h3></div>
          <hw-donut-chart [slices]="outcomeSlices()" centerLabel="Events" />
        </div>

        <!-- top actors -->
        <div class="hw-card panel span3">
          <div class="panel-head">
            <h3>Most active actors</h3>
            <a class="tag link" routerLink="../audit-logs">View full log →</a>
          </div>
          <table class="tbl">
            <thead>
              <tr><th>Actor</th><th>Role</th><th>Reads</th><th>Writes</th><th>Denied</th></tr>
            </thead>
            <tbody>
              @for (a of stats()!.topActors; track a.actor) {
                <tr>
                  <td class="mono bold">{{ a.actor }}</td>
                  <td><span class="role-chip">{{ a.role }}</span></td>
                  <td>{{ a.reads }}</td>
                  <td>{{ a.writes }}</td>
                  <td [class.warn]="a.denied > 0">{{ a.denied }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- outcome breakdown -->
        <div class="hw-card panel">
          <div class="panel-head"><h3>Outcome breakdown</h3></div>
          <div class="outcome-list">
            <div class="oc-row">
              <span class="oc-label">Allowed</span>
              <div class="oc-bar-wrap">
                <div class="oc-bar oc-allowed" [style.width.%]="pct(stats()!.allowed, stats()!.total)"></div>
              </div>
              <span class="oc-val">{{ stats()!.allowed }}</span>
            </div>
            <div class="oc-row">
              <span class="oc-label">Denied</span>
              <div class="oc-bar-wrap">
                <div class="oc-bar oc-denied" [style.width.%]="pct(stats()!.deniedActions, stats()!.total)"></div>
              </div>
              <span class="oc-val warn">{{ stats()!.deniedActions }}</span>
            </div>
            <div class="oc-row">
              <span class="oc-label">Error</span>
              <div class="oc-bar-wrap">
                <div class="oc-bar oc-error" [style.width.%]="pct(stats()!.errored, stats()!.total)"></div>
              </div>
              <span class="oc-val">{{ stats()!.errored }}</span>
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .loading-bar { padding:20px; color:var(--hw-text-3); text-align:center; font-size:14px; }

    .live-badge { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;
      color:var(--hw-text-3); padding:4px 10px; border-radius:20px; border:1px solid var(--hw-border); }
    .live-badge.active { color:#00a870; border-color:rgba(0,168,112,.3); background:rgba(0,168,112,.06); }
    .dot { width:7px; height:7px; border-radius:50%; background:currentColor; }
    .live-badge.active .dot { animation:pulse 1.4s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .grid  { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
    .span2 { grid-column:1 / -1; }
    .span3 { grid-column:1 / -1; }
    .panel { padding:18px 20px; }
    .panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .panel-head h3 { margin:0; font-size:15px; font-weight:600; }
    .tag { font-size:12px; color:var(--hw-text-3); }
    .link { color:var(--hw-primary); text-decoration:none; }
    .link:hover { text-decoration:underline; }

    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; color:var(--hw-text-3); font-weight:500;
      padding:10px 12px; border-bottom:1px solid var(--hw-border); }
    .tbl td { padding:12px; border-bottom:1px solid var(--hw-border); color:var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom:0; }
    .mono { font-family:monospace; }
    .bold { color:var(--hw-text); font-weight:500; }
    .warn { color:var(--hw-danger); font-weight:600; }

    .role-chip { font-size:11px; background:var(--hw-bg); padding:3px 8px;
      border-radius:6px; color:var(--hw-text-3); font-weight:600; white-space:nowrap; }

    .outcome-list { display:flex; flex-direction:column; gap:14px; padding-top:4px; }
    .oc-row { display:flex; align-items:center; gap:10px; font-size:13px; }
    .oc-label { width:56px; color:var(--hw-text-2); }
    .oc-bar-wrap { flex:1; height:8px; background:var(--hw-bg); border-radius:4px; overflow:hidden; }
    .oc-bar { height:100%; border-radius:4px; transition:width .5s cubic-bezier(.34,1.56,.64,1); }
    .oc-allowed { background:#00a870; }
    .oc-denied  { background:#f53f3f; }
    .oc-error   { background:#ff8f1f; }
    .oc-val { width:36px; text-align:right; font-weight:600; color:var(--hw-text-3); font-size:12px; }

    @media (max-width:1100px) {
      .stats { grid-template-columns:repeat(2,1fr); }
      .grid  { grid-template-columns:1fr; }
    }
  `],
})
export class AuditorDashboard implements OnInit, OnDestroy {
  private auditSvc = inject(AuditService);
  private sub?: Subscription;

  stats = signal<AuditStats | null>(null);
  live  = signal(false);

  perDay     = computed(() => this.stats()?.perDay     ?? []);
  dayLabels  = computed(() => this.stats()?.dayLabels  ?? []);

  outcomeSlices = computed<DonutSlice[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Allowed', value: s.allowed          || 0.01, color: '#00a870' },
      { label: 'Denied',  value: s.deniedActions     || 0.01, color: '#f53f3f' },
      { label: 'Error',   value: s.errored           || 0.01, color: '#ff8f1f' },
    ];
  });

  pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  refresh() {
    this.sub?.unsubscribe();
    this.sub = this.auditSvc.stats$.subscribe(s => {
      if (s) { this.stats.set(s); this.live.set(true); }
    });
  }

  ngOnInit() {
    this.sub = this.auditSvc.stats$.subscribe(s => {
      if (s) { this.stats.set(s); this.live.set(true); }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
