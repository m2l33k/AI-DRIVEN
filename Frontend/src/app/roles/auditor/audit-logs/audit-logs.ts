import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { PageHeader } from '../../../shared/ui/page-header';
import { AuditService, AuditEntry } from '../../shared/audit/audit.service';

type Outcome = '' | 'Allowed' | 'Denied' | 'Error';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [PageHeader, CommonModule, DatePipe, FormsModule],
  template: `
    <hw-page-header title="Audit Logs"
      subtitle="Immutable record of every platform action (audit:read — no delete by design)">
      <button class="hw-btn" (click)="exportCsv()" [disabled]="logs().length === 0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download (.csv)
      </button>
    </hw-page-header>

    <!-- filters -->
    <div class="hw-card toolbar">
      <input class="hw-input search" placeholder="Search actor, action, resource or details…"
        [(ngModel)]="queryModel" (ngModelChange)="queryChange$.next($event)" />
      <select class="hw-input sel" [(ngModel)]="outcome" (ngModelChange)="reload()">
        <option value="">All outcomes</option>
        <option value="Allowed">Allowed</option>
        <option value="Denied">Denied</option>
        <option value="Error">Error</option>
      </select>
      <select class="hw-input sel" [(ngModel)]="limitModel" (ngModelChange)="reload()">
        <option [ngValue]="50">50 rows</option>
        <option [ngValue]="100">100 rows</option>
        <option [ngValue]="200">200 rows</option>
      </select>
      <span class="result-cnt">
        {{ rangeStart() }}–{{ rangeEnd() }} of {{ logs().length }} entries
      </span>
      @if (loading()) {
        <span class="spinner">↻</span>
      }
    </div>

    <div class="hw-card">
      <table class="tbl">
        <thead>
          <tr>
            <th class="col-ts">Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Resource</th>
            <th class="col-oc">Outcome</th>
            <th class="col-ip">Source IP</th>
            <th class="col-arr"></th>
          </tr>
        </thead>
        <tbody>
          @for (l of pagedLogs(); track l.id) {
            <tr
              [class.row-denied]="l.outcome==='Denied'"
              [class.row-error]="l.outcome==='Error'"
              [class.row-expanded]="selected()?.id===l.id"
              (click)="toggle(l)">
              <td class="mono muted">{{ l.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</td>
              <td class="mono bold">{{ l.actor }}</td>
              <td class="action">{{ l.action }}</td>
              <td class="mono res">{{ l.resource }}</td>
              <td><span class="oc" [class]="l.outcome">{{ l.outcome }}</span></td>
              <td class="mono muted">{{ l.ip }}</td>
              <td class="arr">{{ selected()?.id===l.id ? '▲' : '▸' }}</td>
            </tr>

            @if (selected()?.id===l.id) {
              <tr class="detail-tr">
                <td colspan="7">
                  <div class="detail-panel">
                    <div class="detail-grid">
                      <div class="dl-block">
                        <span class="dl-label">Entry ID</span>
                        <span class="dl-val mono small">{{ l.id }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Actor</span>
                        <span class="dl-val mono">{{ l.actor }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Role</span>
                        <span class="dl-val"><span class="role-chip">{{ l.role }}</span></span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Outcome</span>
                        <span class="dl-val"><span class="oc" [class]="l.outcome">{{ l.outcome }}</span></span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Action</span>
                        <span class="dl-val mono">{{ l.action }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Resource</span>
                        <span class="dl-val mono">{{ l.resource }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Source IP</span>
                        <span class="dl-val mono">{{ l.ip }}</span>
                      </div>
                      <div class="dl-block">
                        <span class="dl-label">Timestamp</span>
                        <span class="dl-val mono">{{ l.timestamp | date:'yyyy-MM-dd HH:mm:ss.SSS' }}</span>
                      </div>
                      @if (l.details) {
                        <div class="dl-block dl-span3">
                          <span class="dl-label">Details</span>
                          <span class="dl-val">{{ l.details }}</span>
                        </div>
                      }
                    </div>
                    <div class="detail-footer">
                      <button class="close-btn" (click)="selected.set(null); $event.stopPropagation()">Close</button>
                    </div>
                  </div>
                </td>
              </tr>
            }

          } @empty {
            <tr><td colspan="7" class="empty">No log entries match your filters.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- pagination -->
    @if (totalPages() > 1) {
      <div class="pagination">
        <button class="pg-btn" (click)="goTo(0)" [disabled]="pageIndex()===0">«</button>
        <button class="pg-btn" (click)="goTo(pageIndex()-1)" [disabled]="pageIndex()===0">‹ Prev</button>

        @for (p of pageWindow(); track p) {
          @if (p === -1) {
            <span class="pg-ellipsis">…</span>
          } @else {
            <button class="pg-num" [class.active]="p===pageIndex()" (click)="goTo(p)">
              {{ p + 1 }}
            </button>
          }
        }

        <button class="pg-btn" (click)="goTo(pageIndex()+1)" [disabled]="pageIndex()===totalPages()-1">Next ›</button>
        <button class="pg-btn" (click)="goTo(totalPages()-1)" [disabled]="pageIndex()===totalPages()-1">»</button>
        <span class="pg-info">Page {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
      </div>
    }
  `,
  styles: [`
    .toolbar { display:flex; gap:12px; padding:14px 16px; margin-bottom:16px;
      align-items:center; flex-wrap:wrap; }
    .search { flex:1; min-width:200px; }
    .sel    { max-width:150px; }
    .result-cnt { font-size:12px; color:var(--hw-text-3); white-space:nowrap; }
    .spinner { animation:spin .8s linear infinite; display:inline-block; color:var(--hw-text-3); }
    @keyframes spin { to{transform:rotate(360deg)} }

    .tbl { width:100%; border-collapse:collapse; font-size:13px; }
    .tbl th { text-align:left; color:var(--hw-text-3); font-weight:500;
      padding:10px 14px; border-bottom:1px solid var(--hw-border); font-size:12px; }
    .tbl td { padding:11px 14px; border-bottom:1px solid var(--hw-border);
      color:var(--hw-text-2); vertical-align:middle; }
    .tbl tbody tr:not(.detail-tr) { cursor:pointer; transition:background .12s; }
    .tbl tbody tr:not(.detail-tr):hover td { background:rgba(0,0,0,.02); }
    .tbl tr:last-child td { border-bottom:0; }

    .col-ts  { width:155px; }
    .col-oc  { width:80px; }
    .col-ip  { width:100px; }
    .col-arr { width:20px; }

    .row-denied td   { background:rgba(245,63,63,.03); }
    .row-error td    { background:rgba(255,143,31,.03); }
    .row-expanded td { background:rgba(52,145,250,.05) !important; }

    .mono  { font-family:monospace; font-size:12px; }
    .small { font-size:11px; }
    .bold  { color:var(--hw-text); font-weight:500; }
    .muted { color:var(--hw-text-3); }
    .action { color:var(--hw-text); font-weight:500; }
    .res    { color:var(--hw-text-2); max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .arr    { text-align:right; color:var(--hw-text-3); font-size:11px; }
    .empty  { text-align:center; color:var(--hw-text-3); padding:36px; }

    .oc { font-size:12px; font-weight:600; padding:3px 9px; border-radius:20px; }
    .oc.Allowed { background:rgba(0,168,112,.12); color:var(--hw-success); }
    .oc.Denied  { background:rgba(245,63,63,.12); color:var(--hw-danger); }
    .oc.Error   { background:rgba(255,143,31,.14); color:var(--hw-warning); }

    .role-chip { font-size:11px; background:var(--hw-bg); padding:3px 8px;
      border-radius:6px; color:var(--hw-text-3); font-weight:600; }

    /* drilldown */
    .detail-tr td { padding:0; border-bottom:2px solid rgba(52,145,250,.12); background:#fff !important; }
    .detail-panel { padding:16px 20px 12px; background:rgba(52,145,250,.03);
      border-top:1px dashed rgba(52,145,250,.2); animation:expand .18s ease; }
    @keyframes expand { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }

    .detail-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px 20px; margin-bottom:12px; }
    .dl-block { display:flex; flex-direction:column; gap:4px; }
    .dl-span3 { grid-column:span 3; }
    .dl-label { font-size:11px; color:var(--hw-text-3); font-weight:700;
      text-transform:uppercase; letter-spacing:.04em; }
    .dl-val { font-size:13px; color:var(--hw-text); word-break:break-all; }

    .detail-footer { display:flex; justify-content:flex-end; }
    .close-btn { padding:5px 14px; border-radius:7px; font-size:12px; font-weight:600;
      border:1px solid var(--hw-border); background:#fff; color:var(--hw-text-2); cursor:pointer; }
    .close-btn:hover { border-color:#c7000b; color:#c7000b; }

    /* pagination */
    .pagination { display:flex; align-items:center; gap:6px; margin-top:12px;
      justify-content:center; flex-wrap:wrap; padding:4px 0; }
    .pg-btn { min-width:36px; height:32px; padding:0 10px; border:1px solid var(--hw-border);
      border-radius:6px; background:var(--hw-card,#fff); color:var(--hw-text-2);
      font-size:13px; cursor:pointer; transition:all .12s; }
    .pg-btn:disabled { opacity:.35; cursor:default; }
    .pg-btn:not(:disabled):hover { border-color:var(--hw-primary); color:var(--hw-primary); }
    .pg-num { min-width:32px; height:32px; padding:0 8px; border:1px solid var(--hw-border);
      border-radius:6px; background:var(--hw-card,#fff); color:var(--hw-text-2);
      font-size:13px; cursor:pointer; transition:all .12s; }
    .pg-num:hover { border-color:var(--hw-primary); color:var(--hw-primary); }
    .pg-num.active { background:var(--hw-primary,#3491fa); color:#fff; border-color:var(--hw-primary,#3491fa); font-weight:600; }
    .pg-ellipsis { color:var(--hw-text-3); padding:0 4px; }
    .pg-info { font-size:12px; color:var(--hw-text-3); margin-left:6px; }

    @media (max-width:900px) {
      .detail-grid { grid-template-columns:repeat(2,1fr); }
      .dl-span3 { grid-column:span 2; }
    }
  `],
})
export class AuditLogs implements OnInit, OnDestroy {
  private auditSvc = inject(AuditService);
  private sub?: Subscription;

  logs     = signal<AuditEntry[]>([]);
  selected = signal<AuditEntry | null>(null);
  loading  = signal(false);
  pageIndex = signal(0);

  queryModel = '';
  outcome: Outcome = '';
  limitModel = 200;

  queryChange$ = new Subject<string>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.logs().length / PAGE_SIZE)));

  pagedLogs = computed(() => {
    const start = this.pageIndex() * PAGE_SIZE;
    return this.logs().slice(start, start + PAGE_SIZE);
  });

  rangeStart = computed(() => this.logs().length === 0 ? 0 : this.pageIndex() * PAGE_SIZE + 1);
  rangeEnd   = computed(() => Math.min((this.pageIndex() + 1) * PAGE_SIZE, this.logs().length));

  pageWindow = computed(() => {
    const total = this.totalPages();
    const cur   = this.pageIndex();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: number[] = [];
    pages.push(0);
    if (cur > 2) pages.push(-1);
    for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
    if (cur < total - 3) pages.push(-1);
    pages.push(total - 1);
    return pages;
  });

  goTo(p: number) {
    const clamped = Math.max(0, Math.min(p, this.totalPages() - 1));
    this.pageIndex.set(clamped);
    this.selected.set(null);
  }

  toggle(l: AuditEntry) {
    this.selected.update(cur => cur?.id === l.id ? null : l);
  }

  reload() {
    this.pageIndex.set(0);
    this.loading.set(true);
    this.sub?.unsubscribe();
    this.sub = this.auditSvc.logs(this.queryModel, this.outcome, '', this.limitModel)
      .subscribe(entries => {
        this.logs.set(entries);
        this.loading.set(false);
      });
  }

  exportCsv() {
    const header = 'id,timestamp,actor,role,action,resource,outcome,ip,details';
    const rows = this.logs().map(l =>
      [l.id, l.timestamp, l.actor, l.role, l.action, l.resource, l.outcome, l.ip,
       `"${(l.details || '').replace(/"/g, '""')}"`].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit() {
    this.reload();
    this.sub = this.queryChange$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        this.loading.set(true);
        this.pageIndex.set(0);
        return this.auditSvc.logs(q, this.outcome, '', this.limitModel);
      })
    ).subscribe(entries => {
      this.logs.set(entries);
      this.loading.set(false);
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
