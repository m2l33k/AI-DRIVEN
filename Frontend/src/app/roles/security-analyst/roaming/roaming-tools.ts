import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/ui/page-header';
import { LineChart } from '../../../shared/charts/line-chart';
import { RoamingService, CsvAnalysis, SimulationResult } from './roaming.service';

@Component({
  selector: 'app-roaming-tools',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeader, LineChart],
  template: `
    <hw-page-header title="Roaming · Tools"
      subtitle="Analyse an uploaded CSV and simulate live roaming traffic" />

    @if (error()) { <div class="hw-card banner-err">{{ error() }}</div> }

    <div class="grid">
      <div class="hw-card panel">
        <div class="panel-head"><h3>Analyse a CSV</h3><span class="tag">POST /upload</span></div>
        <div class="tool">
          <input type="file" accept=".csv" (change)="onFile($event)" />
          <label>Forecast hours <input type="number" min="1" [(ngModel)]="uploadHours" /></label>
          <button class="hw-btn" [disabled]="!file || uploading()" (click)="upload()">
            {{ uploading() ? 'Analysing…' : 'Upload & analyse' }}
          </button>
        </div>
        @if (csv(); as c) {
          <div class="tool-result">
            <p><strong>{{ c.fileName }}</strong> — {{ c.rowsParsed }} rows parsed, {{ c.rowsSkipped }} skipped.</p>
            <p class="muted small">Columns: {{ c.columns.join(', ') }}</p>
            <div class="mini-stats">
              <div><span>{{ c.summary.totalEvents }}</span>events</div>
              <div><span>{{ c.summary.totalSubscribers }}</span>subscribers</div>
              <div><span>{{ c.summary.highRiskCount }}</span>high-risk</div>
              <div><span>{{ c.anomalies.length }}</span>anomalies</div>
            </div>
            <hw-line-chart [data]="csvForecastData()" [labels]="csvForecastLabels()" [smooth]="true" color="#722ed1" ariaLabel="CSV forecast" />
          </div>
        }
      </div>

      <div class="hw-card panel">
        <div class="panel-head"><h3>Simulate traffic</h3><span class="tag">POST /simulate</span></div>
        <div class="tool">
          <label>Count <input type="number" min="1" [(ngModel)]="simCount" /></label>
          <label>Spread (min) <input type="number" min="1" [(ngModel)]="simSpread" /></label>
          <label>Window (min) <input type="number" min="1" [(ngModel)]="simWindow" /></label>
          <button class="hw-btn" [disabled]="simulating()" (click)="simulate()">
            {{ simulating() ? 'Generating…' : 'Generate' }}
          </button>
        </div>
        @if (sim(); as s) {
          <div class="tool-result">
            <p>Generated <strong>{{ s.generated }}</strong> events. Live window: {{ s.monitor.windowMinutes }} min.</p>
            <div class="mini-stats">
              <div><span>{{ s.monitor.activeEvents }}</span>active</div>
              <div><span>{{ s.monitor.activeSubscribers }}</span>subscribers</div>
              <div><span>{{ s.monitor.highRiskCount }}</span>high-risk</div>
              <div><span>{{ s.monitor.windowRevenueEur | number:'1.0-0' }}€</span>revenue</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .panel { padding: 18px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .banner-err { padding: 12px 16px; margin-bottom: 16px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 13px; }
    .tool { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    .tool label { font-size: 12px; color: var(--hw-text-3); display: flex; gap: 6px; align-items: center; }
    .tool input[type=number] { width: 80px; padding: 6px 8px; border: 1px solid var(--hw-border); border-radius: 6px; }
    .tool-result { margin-top: 8px; font-size: 13px; }
    .tool-result p { margin: 4px 0; }
    .muted { color: var(--hw-text-3); }
    .small { font-size: 12px; }
    .mini-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 10px 0; }
    .mini-stats div { display: flex; flex-direction: column; font-size: 12px; color: var(--hw-text-3); }
    .mini-stats span { font-size: 20px; font-weight: 700; color: var(--hw-text); }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class RoamingTools {
  private api = inject(RoamingService);

  error = signal<string | null>(null);
  file: File | null = null;
  uploadHours = 6;
  uploading = signal(false);
  csv = signal<CsvAnalysis | null>(null);
  simCount = 20; simSpread = 60; simWindow = 60;
  simulating = signal(false);
  sim = signal<SimulationResult | null>(null);

  csvForecastData = computed(() => {
    const f = this.csv()?.forecast; if (!f) return [];
    return [...f.history.map((p) => p.subscribers), ...f.forecast.map((p) => p.subscribers)];
  });
  csvForecastLabels = computed(() => {
    const f = this.csv()?.forecast; if (!f) return [];
    return [...f.history.map((p) => p.hour), ...f.forecast.map((p) => p.hour)];
  });

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file = input.files && input.files.length ? input.files[0] : null;
  }

  upload() {
    if (!this.file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.api.uploadCsv(this.file, this.uploadHours).subscribe({
      next: (c) => { this.csv.set(c); this.uploading.set(false); },
      error: (e) => { this.fail(e); this.uploading.set(false); },
    });
  }

  simulate() {
    this.simulating.set(true);
    this.error.set(null);
    this.api.simulate(this.simCount, this.simSpread, this.simWindow).subscribe({
      next: (s) => { this.sim.set(s); this.simulating.set(false); },
      error: (e) => { this.fail(e); this.simulating.set(false); },
    });
  }

  private fail(err: { status?: number; error?: { error?: string } }) {
    this.error.set(err.status === 403
      ? 'Forbidden — your token lacks roaming-events:read.'
      : (err.error?.error ?? `Request failed (${err.status ?? '?'})`));
  }
}
