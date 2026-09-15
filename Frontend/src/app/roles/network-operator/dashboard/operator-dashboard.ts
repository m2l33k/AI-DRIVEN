import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarChart } from '../../../shared/charts/bar-chart';
import { DonutChart, DonutSlice } from '../../../shared/charts/donut-chart';
import { MultiLineChart } from '../../../shared/charts/multi-line-chart';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [RouterLink, BarChart, DonutChart, MultiLineChart],
  template: `
<!-- ═══ TOP BAR ═══════════════════════════════════════════════════════════ -->
<div class="topbar">
  <div class="topbar-left">
    <div class="page-title">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M12 22V12"/><path d="M3 7l9 5 9-5"/>
      </svg>
      <span>Network Operations Center</span>
    </div>
    <div class="breadcrumb">Dashboard <span>›</span> Network Operator</div>
  </div>
  <div class="topbar-right">
    <div class="live-badge"><span class="pulse"></span>LIVE</div>
    <div class="ts">{{ currentTime }}</div>
    <button class="btn-ghost">Last 24h ▾</button>
    <button class="btn-primary" (click)="refresh()">
      <svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
      Refresh
    </button>
  </div>
</div>

<!-- ═══ KPI CARDS ════════════════════════════════════════════════════════ -->
<div class="kpi-row">
  <div class="kpi-card kpi-green">
    <div class="kpi-icon">
      <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    </div>
    <div class="kpi-body">
      <div class="kpi-value">23<span class="kpi-denom">/24</span></div>
      <div class="kpi-label">NFs Healthy</div>
    </div>
    <div class="kpi-delta positive">↑ 2 this hour</div>
    <div class="kpi-sparkbar">
      @for (v of [85,88,90,95,92,95,96]; track $index) {
        <div class="spbar" [style.height.%]="v"></div>
      }
    </div>
  </div>

  <div class="kpi-card kpi-blue">
    <div class="kpi-icon">
      <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    </div>
    <div class="kpi-body">
      <div class="kpi-value">18.4<span class="kpi-unit">Gbps</span></div>
      <div class="kpi-label">Total Throughput</div>
    </div>
    <div class="kpi-delta positive">↑ 6.5%</div>
    <div class="kpi-sparkbar">
      @for (v of [55,62,70,80,85,78,82]; track $index) {
        <div class="spbar" [style.height.%]="v"></div>
      }
    </div>
  </div>

  <div class="kpi-card kpi-purple">
    <div class="kpi-icon">
      <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    </div>
    <div class="kpi-body">
      <div class="kpi-value">1.2M</div>
      <div class="kpi-label">PDU Sessions</div>
    </div>
    <div class="kpi-delta positive">↑ 3.1%</div>
    <div class="kpi-sparkbar">
      @for (v of [60,65,68,72,75,74,78]; track $index) {
        <div class="spbar" [style.height.%]="v"></div>
      }
    </div>
  </div>

  <div class="kpi-card kpi-orange">
    <div class="kpi-icon">
      <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>
    <div class="kpi-body">
      <div class="kpi-value">12<span class="kpi-unit">ms</span></div>
      <div class="kpi-label">Avg Latency</div>
    </div>
    <div class="kpi-delta positive">↓ 4.2%</div>
    <div class="kpi-sparkbar">
      @for (v of [70,62,55,48,44,42,40]; track $index) {
        <div class="spbar" [style.height.%]="v"></div>
      }
    </div>
  </div>
</div>

<!-- ═══ NF STATUS STRIP ═══════════════════════════════════════════════════ -->
<div class="card nf-strip">
  <div class="strip-title">Network Function Status</div>
  <div class="strip-nfs">
    @for (nf of nfPills; track nf.name) {
      <div class="nf-pill" [class.up]="nf.up" [class.warn]="nf.warn">
        <span class="pill-dot"></span>
        <span class="pill-name">{{ nf.name }}</span>
        <span class="pill-inst">{{ nf.inst }}×</span>
      </div>
    }
  </div>
  <div class="strip-summary">
    <span class="s-item green">● {{ upCount }} Running</span>
    <span class="s-item orange">● 1 Degraded</span>
    <span class="s-item gray">● 0 Down</span>
    <span class="s-sep">|</span>
    <span class="s-item muted">Last checked: just now</span>
  </div>
</div>

<!-- ═══ MAIN GRID ══════════════════════════════════════════════════════════ -->
<div class="main-grid">

  <!-- Throughput chart -->
  <div class="card chart-wide">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#3491fa" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Throughput — Uplink / Downlink
      </div>
      <div class="card-actions">
        <span class="badge badge-blue">Gbps</span>
        <span class="tag">24h</span>
      </div>
    </div>
    <hw-multi-line-chart
      [series]="[
        { label: 'Downlink', color: '#3491fa', data: downlink },
        { label: 'Uplink',   color: '#00a870', data: uplink }
      ]"
      [labels]="hours" />
    <div class="chart-legend">
      <span class="leg-dot" style="background:#3491fa"></span><span class="leg-lbl">Downlink</span>
      <span class="leg-dot" style="background:#00a870"></span><span class="leg-lbl">Uplink</span>
    </div>
  </div>

  <!-- NF status donut -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#c7000b" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        NF Health
      </div>
    </div>
    <hw-donut-chart [slices]="nfStatus" centerLabel="NFs" />
    <div class="donut-stats">
      <div class="dst"><span class="dst-val green">23</span><span class="dst-lbl">Running</span></div>
      <div class="dst"><span class="dst-val orange">1</span><span class="dst-lbl">Degraded</span></div>
      <div class="dst"><span class="dst-val red">0</span><span class="dst-lbl">Down</span></div>
    </div>
  </div>

  <!-- Sessions by NF -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#00a870" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        Sessions by NF
      </div>
      <span class="badge badge-green">×1000</span>
    </div>
    <hw-bar-chart [data]="sessions" [labels]="nfTypes" color="#3491fa" ariaLabel="Sessions by NF" />
  </div>

  <!-- Active incidents -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#ff8f1f" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Active Incidents
      </div>
      <span class="badge badge-orange">{{ incidents.length }}</span>
    </div>
    <div class="incident-list">
      @for (inc of incidents; track inc.id) {
        <div class="incident" [class]="'sev-' + inc.sev">
          <div class="inc-sev">{{ inc.sev.toUpperCase() }}</div>
          <div class="inc-body">
            <div class="inc-title">{{ inc.title }}</div>
            <div class="inc-meta">{{ inc.nf }} · {{ inc.time }}</div>
          </div>
          <div class="inc-dot"></div>
        </div>
      }
      @empty {
        <div class="no-incidents">
          <svg viewBox="0 0 24 24" width="28" fill="none" stroke="#00a870" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <p>All systems nominal</p>
        </div>
      }
    </div>
  </div>

  <!-- Network slices -->
  <div class="card slice-card">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/></svg>
        Network Slices
      </div>
    </div>
    <div class="slice-list">
      @for (sl of slices; track sl.sst) {
        <div class="slice-row">
          <div class="slice-name">
            <span class="slice-badge" [style.background]="sl.color">{{ sl.sst }}</span>
            {{ sl.name }}
          </div>
          <div class="slice-util">
            <div class="util-bar">
              <div class="util-fill" [style.width.%]="sl.util" [style.background]="sl.color"></div>
            </div>
            <span class="util-pct">{{ sl.util }}%</span>
          </div>
          <div class="slice-meta">{{ sl.sessions }} sessions</div>
        </div>
      }
    </div>
  </div>

  <!-- NF table -->
  <div class="card nf-table-card">
    <div class="card-head">
      <div class="card-title">
        <svg viewBox="0 0 24 24" width="16" fill="none" stroke="#3491fa" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Network Function Instances
      </div>
      <a class="link-btn" routerLink="../network-functions">View all →</a>
    </div>
    <table class="tbl">
      <thead>
        <tr>
          <th>Instance</th><th>Type</th><th>Instances</th>
          <th>CPU</th><th>Memory</th><th>Latency</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        @for (n of nfs; track n.name) {
          <tr>
            <td>
              <div class="nf-cell">
                <div class="nf-icon" [style.background]="n.color + '22'" [style.color]="n.color">
                  {{ n.type[0] }}
                </div>
                <span class="mono">{{ n.name }}</span>
              </div>
            </td>
            <td><span class="type-badge" [style.color]="n.color" [style.background]="n.color + '18'">{{ n.type }}</span></td>
            <td class="center">{{ n.inst }}</td>
            <td>
              <div class="res-bar-wrap">
                <div class="res-bar"><div class="res-fill" [class.warn]="n.cpu > 80" [style.width.%]="n.cpu"></div></div>
                <span class="res-pct" [class.warn-text]="n.cpu > 80">{{ n.cpu }}%</span>
              </div>
            </td>
            <td>
              <div class="res-bar-wrap">
                <div class="res-bar"><div class="res-fill mem" [style.width.%]="n.mem"></div></div>
                <span class="res-pct">{{ n.mem }}%</span>
              </div>
            </td>
            <td class="latency">{{ n.lat }}ms</td>
            <td>
              <span class="status-pill" [class.st-up]="n.up" [class.st-warn]="!n.up">
                <span class="s-dot"></span>{{ n.up ? 'Running' : 'Degraded' }}
              </span>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

</div>
  `,
  styles: [`
    :host { display: block; font-family: 'HarmonyOS Sans', 'Segoe UI', sans-serif; }

    /* ── TOP BAR ────────────────────────────────────────────── */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .page-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 20px; font-weight: 700; color: var(--hw-text);
    }
    .page-title svg { color: #3491fa; }
    .breadcrumb { font-size: 12px; color: var(--hw-text-3); margin-top: 2px; }
    .breadcrumb span { margin: 0 4px; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .live-badge {
      display: flex; align-items: center; gap: 6px;
      background: rgba(0,168,112,.1); color: #00a870;
      font-size: 11px; font-weight: 700; letter-spacing: .08em;
      padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(0,168,112,.25);
    }
    .pulse {
      width: 7px; height: 7px; border-radius: 50%; background: #00a870;
      animation: pulse 1.4s ease infinite;
    }
    @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.8); } }
    .ts { font-size: 12px; color: var(--hw-text-3); }
    .btn-ghost {
      padding: 7px 14px; border-radius: 8px; border: 1px solid var(--hw-border);
      background: white; font-size: 13px; cursor: pointer; color: var(--hw-text-2);
    }
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 16px; border-radius: 8px; border: none;
      background: linear-gradient(135deg, #3491fa, #1677e5); color: white;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-primary:hover { opacity: .9; }

    /* ── KPI CARDS ──────────────────────────────────────────── */
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
    .kpi-card {
      border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden;
      display: flex; flex-direction: column; gap: 6px;
      box-shadow: 0 2px 12px rgba(0,0,0,.07);
    }
    .kpi-green  { background: linear-gradient(135deg, #00a870 0%, #00875a 100%); color: white; }
    .kpi-blue   { background: linear-gradient(135deg, #3491fa 0%, #1677e5 100%); color: white; }
    .kpi-purple { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; }
    .kpi-orange { background: linear-gradient(135deg, #ff8f1f 0%, #d97706 100%); color: white; }
    .kpi-icon {
      width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-value { font-size: 30px; font-weight: 800; line-height: 1; }
    .kpi-denom { font-size: 16px; opacity: .75; }
    .kpi-unit { font-size: 14px; margin-left: 4px; opacity: .8; }
    .kpi-label { font-size: 12px; opacity: .85; font-weight: 500; }
    .kpi-delta { font-size: 11px; opacity: .9; }
    .kpi-sparkbar {
      display: flex; align-items: flex-end; gap: 3px; height: 28px;
      margin-top: 4px;
    }
    .spbar {
      flex: 1; background: rgba(255,255,255,.35); border-radius: 2px;
      min-height: 4px; transition: height .3s;
    }

    /* ── NF STRIP ───────────────────────────────────────────── */
    .card {
      background: white; border-radius: 14px; padding: 18px 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,.06); border: 1px solid var(--hw-border);
    }
    .nf-strip {
      margin-bottom: 16px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .strip-title { font-size: 12px; font-weight: 600; color: var(--hw-text-3); text-transform: uppercase; letter-spacing: .06em; white-space: nowrap; }
    .strip-nfs { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
    .nf-pill {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
      background: #f0f9f4; color: #00875a; border: 1px solid #b7ebd5;
    }
    .nf-pill.warn { background: #fff7ed; color: #c2410c; border-color: #fcd9a0; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .pill-inst { opacity: .7; font-weight: 400; }
    .strip-summary { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
    .s-item { font-size: 12px; }
    .s-item.green { color: #00a870; }
    .s-item.orange { color: #ff8f1f; }
    .s-item.gray { color: #86909c; }
    .s-item.muted { color: var(--hw-text-3); }
    .s-sep { color: var(--hw-border); }

    /* ── MAIN GRID ──────────────────────────────────────────── */
    .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .chart-wide { grid-column: 1 / -1; }
    .nf-table-card { grid-column: 1 / -1; }

    /* ── CARD INTERNALS ─────────────────────────────────────── */
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--hw-text); }
    .card-actions { display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 11px; color: var(--hw-text-3); }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .badge-blue { background: rgba(52,145,250,.1); color: #3491fa; }
    .badge-green { background: rgba(0,168,112,.1); color: #00a870; }
    .badge-orange { background: rgba(255,143,31,.1); color: #ff8f1f; }
    .link-btn { font-size: 13px; color: #3491fa; font-weight: 500; text-decoration: none; }
    .chart-legend { display: flex; gap: 16px; margin-top: 10px; justify-content: center; }
    .leg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .leg-lbl { font-size: 12px; color: var(--hw-text-3); }

    /* ── DONUT STATS ────────────────────────────────────────── */
    .donut-stats { display: flex; justify-content: space-around; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hw-border); }
    .dst { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .dst-val { font-size: 22px; font-weight: 700; }
    .dst-val.green { color: #00a870; }
    .dst-val.orange { color: #ff8f1f; }
    .dst-val.red { color: #f53f3f; }
    .dst-lbl { font-size: 11px; color: var(--hw-text-3); }

    /* ── INCIDENTS ──────────────────────────────────────────── */
    .incident-list { display: flex; flex-direction: column; gap: 8px; }
    .incident {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px; border-left: 3px solid;
    }
    .sev-warn { background: #fff7ed; border-color: #ff8f1f; }
    .sev-info { background: #eff6ff; border-color: #3491fa; }
    .inc-sev { font-size: 10px; font-weight: 700; letter-spacing: .06em; width: 30px; }
    .sev-warn .inc-sev { color: #c2410c; }
    .sev-info .inc-sev { color: #1677e5; }
    .inc-body { flex: 1; }
    .inc-title { font-size: 13px; font-weight: 600; color: var(--hw-text); }
    .inc-meta { font-size: 11px; color: var(--hw-text-3); margin-top: 1px; }
    .inc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--hw-border); }
    .no-incidents {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 0; color: var(--hw-text-3); font-size: 13px;
    }

    /* ── SLICES ─────────────────────────────────────────────── */
    .slice-list { display: flex; flex-direction: column; gap: 14px; }
    .slice-row { display: grid; grid-template-columns: 1fr 1fr auto; align-items: center; gap: 12px; }
    .slice-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--hw-text); }
    .slice-badge { font-size: 10px; font-weight: 700; color: white; padding: 2px 6px; border-radius: 5px; }
    .slice-util { display: flex; align-items: center; gap: 8px; }
    .util-bar { flex: 1; height: 6px; background: var(--hw-border); border-radius: 4px; overflow: hidden; }
    .util-fill { height: 100%; border-radius: 4px; transition: width .4s; }
    .util-pct { font-size: 12px; font-weight: 600; color: var(--hw-text-2); width: 30px; text-align: right; }
    .slice-meta { font-size: 12px; color: var(--hw-text-3); white-space: nowrap; }

    /* ── NF TABLE ───────────────────────────────────────────── */
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; padding: 8px 14px; border-bottom: 2px solid var(--hw-border); }
    .tbl td { padding: 12px 14px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); vertical-align: middle; }
    .tbl tr:last-child td { border-bottom: none; }
    .tbl tr:hover td { background: #f7f9fc; }
    .nf-cell { display: flex; align-items: center; gap: 10px; }
    .nf-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
    .mono { font-family: monospace; font-size: 13px; color: var(--hw-text); font-weight: 600; }
    .type-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .center { text-align: center; }
    .res-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .res-bar { flex: 1; height: 6px; background: #f0f2f5; border-radius: 4px; overflow: hidden; min-width: 70px; }
    .res-fill { height: 100%; background: #3491fa; border-radius: 4px; }
    .res-fill.warn { background: #ff8f1f; }
    .res-fill.mem { background: #7c3aed; }
    .res-pct { font-size: 12px; font-weight: 600; color: var(--hw-text-2); width: 32px; }
    .res-pct.warn-text { color: #c2410c; }
    .latency { font-family: monospace; font-size: 12px; color: #00a870; font-weight: 600; }
    .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
    .st-up { background: rgba(0,168,112,.1); color: #00875a; }
    .st-warn { background: rgba(255,143,31,.12); color: #c2410c; }
    .s-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

    @media (max-width: 1200px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
      .main-grid { grid-template-columns: 1fr; }
      .chart-wide, .nf-table-card { grid-column: 1; }
    }
    @media (max-width: 700px) {
      .kpi-row { grid-template-columns: 1fr 1fr; }
      .topbar { flex-direction: column; align-items: flex-start; gap: 10px; }
    }
  `],
})
export class OperatorDashboard implements OnInit, OnDestroy {
  currentTime = '';
  private _tick: ReturnType<typeof setInterval> | null = null;

  hours = ['00:00','04:00','08:00','12:00','16:00','20:00','24:00'];
  downlink = [11, 14, 17, 22, 24, 20, 18];
  uplink   = [5,  7,  9,  11, 13, 10, 9 ];

  nfTypes  = ['AMF', 'SMF', 'UPF', 'AUSF', 'UDM'];
  sessions = [42, 38, 55, 20, 30];

  nfStatus: DonutSlice[] = [
    { label: 'Running',  value: 23, color: '#00a870' },
    { label: 'Degraded', value: 1,  color: '#ff8f1f' },
    { label: 'Down',     value: 0,  color: '#f53f3f' },
  ];

  nfPills = [
    { name: 'NRF', inst: 1, up: true,  warn: false },
    { name: 'AMF', inst: 3, up: true,  warn: false },
    { name: 'SMF', inst: 2, up: true,  warn: false },
    { name: 'UPF', inst: 4, up: false, warn: true  },
    { name: 'AUSF', inst: 2, up: true, warn: false },
    { name: 'UDM', inst: 2, up: true,  warn: false },
    { name: 'UDR', inst: 2, up: true,  warn: false },
    { name: 'PCF', inst: 1, up: true,  warn: false },
    { name: 'NSSF', inst: 1, up: true, warn: false },
  ];

  get upCount() { return this.nfPills.filter(n => n.up).length; }

  incidents = [
    { id: 1, sev: 'warn', title: 'UPF-02 CPU threshold exceeded', nf: 'UPF-02', time: '3 min ago' },
    { id: 2, sev: 'info', title: 'AMF registered 2 new NF instances', nf: 'AMF-01', time: '18 min ago' },
  ];

  slices = [
    { sst: 'eMBB', name: 'Enhanced Mobile Broadband', util: 72, sessions: '840K', color: '#3491fa' },
    { sst: 'uRLLC', name: 'Ultra-Reliable Low Latency', util: 38, sessions: '210K', color: '#7c3aed' },
    { sst: 'mMTC', name: 'Massive Machine Type Comms', util: 55, sessions: '150K', color: '#00a870' },
  ];

  nfs = [
    { name: 'amf-01', type: 'AMF',  inst: 3, cpu: 42, mem: 58, lat: 4,  up: true,  color: '#3491fa' },
    { name: 'smf-01', type: 'SMF',  inst: 2, cpu: 55, mem: 63, lat: 6,  up: true,  color: '#00a870' },
    { name: 'upf-01', type: 'UPF',  inst: 4, cpu: 78, mem: 71, lat: 2,  up: true,  color: '#c7000b' },
    { name: 'upf-02', type: 'UPF',  inst: 2, cpu: 91, mem: 85, lat: 8,  up: false, color: '#c7000b' },
    { name: 'ausf-01', type: 'AUSF', inst: 2, cpu: 24, mem: 40, lat: 3, up: true,  color: '#7c3aed' },
    { name: 'udm-01', type: 'UDM',  inst: 2, cpu: 31, mem: 47, lat: 5,  up: true,  color: '#ff8f1f' },
  ];

  ngOnInit() {
    this.tick();
    this._tick = setInterval(() => this.tick(), 1000);
  }
  ngOnDestroy() { if (this._tick) clearInterval(this._tick); }

  tick() {
    this.currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  refresh() { /* hook to live data */ }
}
