import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { UsersService } from '../../../core/users.service';
import { UserSummary } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart, DonutChart, RouterLink],
  template: `
    <hw-page-header title="Platform Overview"
      subtitle="Live user and access data across the 5G Core platform">
      <button class="hw-btn" (click)="load()">Refresh</button>
      <a class="hw-btn hw-btn--primary" routerLink="/admin/users">+ New user</a>
    </hw-page-header>

    @if (error()) { <div class="hw-card note err">{{ error() }}</div> }

    <div class="stats">
      <hw-stat-card label="Total users" [value]="loading() ? '—' : total()"
                    [delta]="loading() ? null : growthPct()" deltaHint="vs last month" accent="#c11536" />
      <hw-stat-card label="New this month" [value]="loading() ? '—' : newThisMonth()" accent="#722ed1" />
      <hw-stat-card label="Active users" [value]="loading() ? '—' : active()" accent="#00a870" />
      <hw-stat-card label="Active rate" [value]="loading() ? '—' : activeRate()" unit="%" accent="#3491fa" />
    </div>

    <div class="grid">
      <div class="hw-card panel">
        <div class="panel-head">
          <div>
            <h3>User growth</h3>
            <span class="sub">Cumulative accounts · last 6 months</span>
          </div>
          <span class="big">{{ loading() ? '—' : total() }}</span>
        </div>
        @if (!loading() && total() > 0) {
          <hw-line-chart [data]="growthSeries()" [labels]="monthLabels()" [smooth]="true"
                         color="#c11536" ariaLabel="User growth over the last 6 months" />
        } @else {
          <p class="muted">{{ loading() ? 'Loading…' : 'No users yet.' }}</p>
        }
      </div>

      <div class="hw-card panel">
        <div class="panel-head"><h3>Users by status</h3></div>
        @if (!loading() && total() > 0) {
          <hw-donut-chart [slices]="statusSplit()" centerLabel="Users" />
        } @else {
          <p class="muted">{{ loading() ? 'Loading…' : 'No users yet.' }}</p>
        }
      </div>

      <div class="hw-card panel span2">
        <div class="panel-head">
          <h3>Recent users</h3>
          <a class="link" routerLink="/admin/users">Manage users →</a>
        </div>
        <table class="tbl">
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="5" class="empty">Loading…</td></tr>
            } @else {
              @for (u of recent(); track u.id) {
                <tr>
                  <td><div class="who"><span class="av">{{ initials(u) }}</span>{{ fullName(u) }}</div></td>
                  <td>{{ u.username }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ joined(u) }}</td>
                  <td><span class="pill" [class.ok]="u.enabled" [class.no]="!u.enabled">
                    {{ u.enabled ? 'Active' : 'Disabled' }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">No users yet.</td></tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .panel-head .sub { font-size: 12px; color: var(--hw-text-3); }
    .panel-head .big { font-size: 24px; font-weight: 700; color: var(--hw-text); }
    .link { color: var(--hw-red); font-size: 13px; font-weight: 500; }
    .note { padding: 12px 16px; margin-bottom: 16px; font-size: 13px; }
    .note.err { color: var(--hw-danger); }
    .muted { color: var(--hw-text-3); font-size: 13px; text-align: center; padding: 24px 0; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .who { display: flex; align-items: center; gap: 10px; color: var(--hw-text); font-weight: 500; }
    .av { width: 28px; height: 28px; border-radius: 50%; background: var(--hw-red-soft); color: var(--hw-red);
      font-size: 11px; font-weight: 700; display: grid; place-items: center; }
    .pill { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .pill.ok { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .pill.no { background: rgba(134,144,156,.15); color: var(--hw-text-3); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 28px; }
    @media (max-width: 1100px) { .stats { grid-template-columns: repeat(2,1fr);} .grid { grid-template-columns: 1fr; } }
  `],
})
export class AdminDashboard implements OnInit {
  private users = inject(UsersService);

  private all = signal<UserSummary[]>([]);
  loading = signal(true);
  error = signal('');
  readonly rolesDefined = 4; // PLATFORM_ADMIN, NETWORK_OPERATOR, SECURITY_ANALYST, AUDITOR

  total = computed(() => this.all().length);
  active = computed(() => this.all().filter((u) => u.enabled).length);
  inactive = computed(() => this.all().filter((u) => !u.enabled).length);
  activeRate = computed(() => (this.total() ? Math.round((this.active() / this.total()) * 100) : 0));
  recent = computed(() =>
    [...this.all()].sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0)).slice(0, 6));

  statusSplit = computed<DonutSlice[]>(() => [
    { label: 'Active', value: this.active(), color: '#00a870' },
    { label: 'Inactive', value: this.inactive(), color: '#ff8f1f' },
  ]);

  /** Start-of-month timestamps for the last 6 months (oldest → current). */
  private months = computed(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, k) =>
      new Date(now.getFullYear(), now.getMonth() - (5 - k), 1));
  });

  monthLabels = computed(() =>
    this.months().map((d) => d.toLocaleString('en-US', { month: 'short' })));

  /** Cumulative user count at the end of each of the last 6 months. */
  growthSeries = computed(() => {
    const created = this.all().map((u) => u.createdTimestamp ?? 0);
    return this.months().map((d) => {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return created.filter((c) => c < next).length;
    });
  });

  newThisMonth = computed(() => {
    const m = this.months();
    const start = m[m.length - 1].getTime();
    return this.all().filter((u) => (u.createdTimestamp ?? 0) >= start).length;
  });

  new30d = computed(() => {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return this.all().filter((u) => (u.createdTimestamp ?? 0) >= cutoff).length;
  });

  avgPerMonth = computed(() => {
    const s = this.growthSeries();
    if (s.length < 2) return 0;
    return Math.round((s[s.length - 1] - s[0]) / (s.length - 1));
  });

  growthPct = computed<number | null>(() => {
    const s = this.growthSeries();
    const prev = s[s.length - 2] ?? 0;
    if (!prev) return null; // no prior baseline → don't show a misleading 0%
    return Math.round(((s[s.length - 1] - prev) / prev) * 1000) / 10;
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.users.list().subscribe({
      next: (list) => { this.all.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Failed to load user data.'); },
    });
  }

  fullName(u: UserSummary) {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;
  }
  initials(u: UserSummary) {
    return this.fullName(u).split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  }
  joined(u: UserSummary) {
    return u.createdTimestamp
      ? new Date(u.createdTimestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  }
}
