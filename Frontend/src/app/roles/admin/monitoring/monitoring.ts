import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';
import { LineChart } from '../../../shared/charts/line-chart';

type Status = 'UP' | 'DOWN' | 'checking';
interface Service { key: string; name: string; desc: string; port: number; }
interface Health { status: Status; detail: string; }
interface Tool { name: string; desc: string; url: string; color: string; }

const WINDOW = 24;      // rolling chart points
const POLL_MS = 3000;   // poll interval

@Component({
  selector: 'app-admin-monitoring',
  standalone: true,
  imports: [PageHeader, StatCard, LineChart],
  template: `
    <hw-page-header title="System Health"
      subtitle="Live service health and metrics for the 5G Core platform">
      <button class="hw-btn" (click)="checkAll()">Refresh</button>
    </hw-page-header>

    <div class="hw-card summary" [class.ok]="allUp()" [class.bad]="anyDown()">
      <span class="pulse"></span>
      <div>
        <strong>{{ summaryText() }}</strong>
        <span class="sub">{{ upCount() }} / {{ services.length }} services reporting UP</span>
      </div>
    </div>

    <h3 class="sec">Services</h3>
    <div class="grid">
      @for (s of services; track s.key) {
        <div class="hw-card svc">
          <div class="svc-top">
            <span class="dot" [class.up]="health()[s.key].status === 'UP'"
                  [class.down]="health()[s.key].status === 'DOWN'"
                  [class.checking]="health()[s.key].status === 'checking'"></span>
            <div class="svc-name">{{ s.name }}<span class="port">:{{ s.port }}</span></div>
            <span class="badge" [class.up]="health()[s.key].status === 'UP'"
                  [class.down]="health()[s.key].status === 'DOWN'">
              {{ health()[s.key].status === 'checking' ? '…' : health()[s.key].status }}
            </span>
          </div>
          <p class="svc-desc">{{ s.desc }}</p>
          <p class="svc-detail">{{ health()[s.key].detail }}</p>
        </div>
      }
    </div>

    <!-- Live gateway metrics (Spring Boot Actuator) -->
    <h3 class="sec">Gateway metrics <span class="live">● live</span></h3>
    <div class="stats">
      <hw-stat-card label="Process CPU" [value]="procCpu()" unit="%" accent="#c11536" />
      <hw-stat-card label="Heap used" [value]="heapUsedMb()" unit="MB" accent="#722ed1" />
      <hw-stat-card label="Live threads" [value]="threads()" accent="#3491fa" />
      <hw-stat-card label="Uptime" [value]="uptimeText()" accent="#00a870" />
      <hw-stat-card label="HTTP requests" [value]="reqTotal()" accent="#ff8f1f" />
    </div>

    <div class="grid charts">
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>CPU usage</h3><span class="tag">process · %</span></div>
        <hw-line-chart [data]="cpuSeries()" [smooth]="true" color="#c11536" ariaLabel="CPU usage" />
      </div>
      <div class="hw-card panel">
        <div class="panel-head"><h3>Heap memory</h3><span class="tag">MB</span></div>
        <hw-line-chart [data]="heapSeries()" [smooth]="true" color="#722ed1" ariaLabel="Heap memory" />
      </div>
      <div class="hw-card panel span2">
        <div class="panel-head"><h3>Request rate</h3><span class="tag">req/s</span></div>
        <hw-line-chart [data]="reqRateSeries()" [smooth]="true" color="#ff8f1f" ariaLabel="Request rate" />
      </div>
    </div>

    <h3 class="sec">Dashboards &amp; tools</h3>
    <div class="grid tools">
      @for (t of tools; track t.name) {
        <a class="hw-card tool" [href]="t.url" target="_blank" rel="noopener" [style.--c]="t.color">
          <div class="tool-icon">{{ t.name[0] }}</div>
          <div class="tool-body">
            <span class="tool-name">{{ t.name }} <span class="ext">↗</span></span>
            <span class="tool-desc">{{ t.desc }}</span>
          </div>
        </a>
      }
    </div>
  `,
  styles: [`
    .summary { display: flex; align-items: center; gap: 14px; padding: 16px 20px; margin-bottom: 22px; }
    .summary strong { display: block; font-size: 15px; color: var(--hw-text); }
    .summary .sub { font-size: 12px; color: var(--hw-text-3); }
    .summary.ok { border-left: 4px solid var(--hw-success); }
    .summary.bad { border-left: 4px solid var(--hw-danger); }
    .pulse { width: 12px; height: 12px; border-radius: 50%; background: var(--hw-text-3); flex: none; }
    .summary.ok .pulse { background: var(--hw-success); box-shadow: 0 0 0 4px rgba(0,168,112,.18); }
    .summary.bad .pulse { background: var(--hw-danger); box-shadow: 0 0 0 4px rgba(245,63,63,.18); }

    .sec { font-size: 14px; font-weight: 600; color: var(--hw-text); margin: 4px 0 12px; display: flex; align-items: center; gap: 8px; }
    .live { font-size: 11px; font-weight: 600; color: var(--hw-success); }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
    .charts { grid-template-columns: 2fr 1fr; }
    .span2 { grid-column: 1 / -1; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }

    .svc { padding: 16px 18px; }
    .svc-top { display: flex; align-items: center; gap: 10px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--hw-text-3); }
    .dot.up { background: var(--hw-success); box-shadow: 0 0 0 3px rgba(0,168,112,.18); }
    .dot.down { background: var(--hw-danger); box-shadow: 0 0 0 3px rgba(245,63,63,.18); }
    .dot.checking { background: var(--hw-warning); }
    .svc-name { flex: 1; font-weight: 600; font-size: 14px; color: var(--hw-text); }
    .port { color: var(--hw-text-3); font-weight: 400; font-size: 12px; margin-left: 4px; }
    .badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 10px; background: var(--hw-bg); color: var(--hw-text-3); }
    .badge.up { background: rgba(0,168,112,.12); color: var(--hw-success); }
    .badge.down { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .svc-desc { margin: 10px 0 2px; font-size: 12px; color: var(--hw-text-3); }
    .svc-detail { margin: 0; font-size: 12px; color: var(--hw-text-2); font-family: monospace; }

    .tool { display: flex; align-items: center; gap: 12px; padding: 16px 18px; transition: transform .12s, box-shadow .12s; }
    .tool:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,.1); }
    .tool-icon { width: 40px; height: 40px; border-radius: 10px; flex: none; display: grid; place-items: center;
      background: var(--c); color: #fff; font-weight: 800; font-size: 16px; }
    .tool-body { display: flex; flex-direction: column; min-width: 0; }
    .tool-name { font-size: 14px; font-weight: 600; color: var(--hw-text); }
    .tool-name .ext { color: var(--hw-text-3); font-weight: 400; }
    .tool-desc { font-size: 12px; color: var(--hw-text-3); }
    @media (max-width: 1100px) { .grid, .charts, .stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 620px) { .grid, .charts, .stats { grid-template-columns: 1fr; } }
  `],
})
export class AdminMonitoring implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private sub?: Subscription;

  services: Service[] = [
    { key: 'eureka', name: 'Eureka Server', desc: 'Service discovery', port: 8761 },
    { key: 'gateway', name: 'API Gateway', desc: 'Spring Cloud Gateway', port: 9000 },
    { key: 'auth', name: 'Auth Service', desc: 'Keycloak-backed auth & users', port: 9001 },
    { key: 'roaming', name: 'Roaming Analysis', desc: 'Roaming events & risk scoring', port: 9002 },
    { key: 'anomaly', name: 'Anomaly Detection', desc: 'Real-time anomaly detection', port: 9003 },
    { key: 'ratelimit', name: 'Rate Limiting', desc: 'Redis token-bucket protection', port: 9004 },
    { key: 'tracing', name: 'Distributed Tracing', desc: 'Trace facade (placeholder)', port: 9005 },
    { key: 'fault', name: 'Fault Injection', desc: 'Chaos / resilience testing', port: 9006 },
    { key: 'messaging', name: 'Messaging', desc: 'Direct messages between users', port: 9007 },
  ];

  tools: Tool[] = [
    { name: 'Grafana', desc: 'Dashboards & metrics', url: 'http://localhost:3000', color: '#f46800' },
    { name: 'Prometheus', desc: 'Metrics & scrape targets', url: 'http://localhost:9090', color: '#e6522c' },
    { name: 'Eureka', desc: 'Service registry dashboard', url: 'http://localhost:8761', color: '#00a870' },
    { name: 'Tempo', desc: 'Distributed traces (via Grafana)', url: 'http://localhost:3000/explore', color: '#3491fa' },
    { name: 'Loki', desc: 'Logs (via Grafana Explore)', url: 'http://localhost:3000/explore', color: '#f5c518' },
    { name: 'Swagger', desc: 'Aggregated API docs (gateway)', url: 'http://localhost:9000/swagger-ui.html', color: '#85ea2d' },
    { name: 'Keycloak', desc: 'Identity & realm admin', url: 'http://localhost:8081/admin', color: '#c11536' },
    { name: 'Actuator', desc: 'Gateway actuator endpoints', url: 'http://localhost:9000/actuator', color: '#722ed1' },
  ];

  // ---- health ----
  health = signal<Record<string, Health>>(
    Object.fromEntries(this.services.map((s) => [s.key, { status: 'checking' as Status, detail: '' }])));
  upCount = computed(() => Object.values(this.health()).filter((h) => h.status === 'UP').length);
  allUp = computed(() => this.upCount() === this.services.length);
  anyDown = computed(() => Object.values(this.health()).some((h) => h.status === 'DOWN'));
  summaryText = computed(() =>
    this.allUp() ? 'All systems operational' : this.anyDown() ? 'Some services are down' : 'Checking services…');

  // ---- live metrics ----
  procCpu = signal(0);
  heapUsedMb = signal(0);
  threads = signal(0);
  reqTotal = signal(0);
  private uptime = signal(0);
  uptimeText = computed(() => this.fmtUptime(this.uptime()));

  cpuSeries = signal<number[]>([]);
  heapSeries = signal<number[]>([]);
  reqRateSeries = signal<number[]>([]);

  private prevReq: number | null = null;
  private prevTs = 0;

  ngOnInit() {
    this.checkAll();
    this.sub = interval(POLL_MS).pipe(
      startWith(0),
      switchMap(() => forkJoin({
        procCpu: this.metric('process.cpu.usage'),
        heapUsed: this.metric('jvm.memory.used', 'area:heap'),
        threads: this.metric('jvm.threads.live'),
        uptime: this.metric('process.uptime'),
        req: this.metric('http.server.requests', undefined, 'COUNT'),
      })),
    ).subscribe((m) => this.applyMetrics(m));
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private applyMetrics(m: { procCpu: number | null; heapUsed: number | null; threads: number | null; uptime: number | null; req: number | null; }) {
    this.procCpu.set(m.procCpu != null ? Math.round(m.procCpu * 1000) / 10 : 0);
    this.heapUsedMb.set(m.heapUsed != null ? Math.round(m.heapUsed / 1e6) : 0);
    this.threads.set(m.threads ?? 0);
    this.uptime.set(m.uptime ?? 0);
    this.reqTotal.set(m.req ?? 0);

    // request rate from delta since last poll
    const now = Date.now();
    let rate = 0;
    if (m.req != null && this.prevReq != null && this.prevTs) {
      rate = Math.max(0, Math.round(((m.req - this.prevReq) / ((now - this.prevTs) / 1000)) * 10) / 10);
    }
    this.prevReq = m.req ?? this.prevReq;
    this.prevTs = now;

    this.push(this.cpuSeries, this.procCpu());
    this.push(this.heapSeries, this.heapUsedMb());
    this.push(this.reqRateSeries, rate);
  }

  private push(sig: ReturnType<typeof signal<number[]>>, v: number) {
    sig.update((a) => [...a, v].slice(-WINDOW));
  }

  private metric(name: string, tag?: string, stat = 'VALUE') {
    const url = `/actuator/metrics/${name}` + (tag ? `?tag=${tag}` : '');
    return this.http.get<{ measurements?: { statistic: string; value: number }[] }>(url).pipe(
      map((r) => {
        const list = r.measurements ?? [];
        const m = list.find((x) => x.statistic === stat) ?? list[0];
        return m ? m.value : null;
      }),
      catchError(() => of(null)),
    );
  }

  private fmtUptime(s: number): string {
    const h = Math.floor(s / 3600);
    const min = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  }

  // ---- health checks ----
  checkAll() {
    for (const s of this.services) {
      this.setHealth(s.key, { status: 'checking', detail: 'Checking…' });
      this.http.get<{ status: string; components?: Record<string, unknown> }>(`/infra-health/${s.key}`)
        .subscribe({
          next: (res) => {
            const up = (res.status ?? '').toUpperCase() === 'UP';
            const comps = res.components ? Object.keys(res.components).length : 0;
            this.setHealth(s.key, { status: up ? 'UP' : 'DOWN', detail: `status: ${res.status}${comps ? ` · ${comps} components` : ''}` });
          },
          error: (err) => this.setHealth(s.key, { status: 'DOWN', detail: err.status ? `HTTP ${err.status}` : 'Unreachable' }),
        });
    }
  }

  private setHealth(key: string, h: Health) {
    this.health.update((m) => ({ ...m, [key]: h }));
  }
}
