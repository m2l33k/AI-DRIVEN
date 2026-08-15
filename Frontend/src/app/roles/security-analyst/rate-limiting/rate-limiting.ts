import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatCard } from '../../../shared/ui/stat-card';

interface TopKey { key: string; blocks: number; }
interface ProtectionStats {
  allowed: number; blocked: number; blockRatePct: number; policyCount: number; topBlocked: TopKey[];
}
type Action = 'THROTTLE' | 'BLOCK';
interface Policy {
  keyType: string; capacity: number; refillTokens: number; refillIntervalMs: number;
  action: Action; enabled: boolean; description: string;
}
interface CheckResult {
  allowed: boolean; keyType: string; key: string; limit: number; remaining: number;
  retryAfterMs: number; action: Action;
}

const API = '/api/protection';
const POLL_MS = 5000;
const EMPTY_POLICY: Policy = {
  keyType: '', capacity: 100, refillTokens: 10, refillIntervalMs: 1000,
  action: 'THROTTLE', enabled: true, description: '',
};

@Component({
  selector: 'app-rate-limiting',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeader, StatCard],
  template: `
    <hw-page-header title="Rate Limiting"
      subtitle="Redis token-bucket abuse protection for the 5G Core (protection:read)">
      <span class="live">● live · {{ pollLabel }}</span>
    </hw-page-header>

    @if (stats(); as s) {
      <div class="stats">
        <hw-stat-card label="Allowed decisions" [value]="s.allowed" accent="#00a870" />
        <hw-stat-card label="Blocked decisions" [value]="s.blocked" accent="#f53f3f" />
        <hw-stat-card label="Block rate" [value]="s.blockRatePct" unit="%" accent="#ff8f1f" />
        <hw-stat-card label="Active policies" [value]="s.policyCount" accent="#3491fa" />
      </div>
    } @else {
      <div class="hw-card note">
        No protection stats yet. Ensure <code>rate-limiting-service</code> (and its Redis) is running
        and reachable through the gateway at <code>/api/protection</code>.
      </div>
    }

    <div class="grid">
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>Rate-limit policies</h3>
          @if (canWrite) {
            <button class="hw-btn" (click)="newPolicy()">+ New policy</button>
          } @else {
            <span class="tag">read-only · needs detection-rules:write</span>
          }
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Key type</th><th>Capacity</th><th>Refill</th><th>Action</th><th>Status</th>
              @if (canWrite) { <th class="right">Manage</th> }
            </tr>
          </thead>
          <tbody>
            @for (p of policies(); track p.keyType) {
              <tr>
                <td class="mono">{{ p.keyType }}</td>
                <td>{{ p.capacity }}</td>
                <td class="muted">{{ p.refillTokens }} / {{ p.refillIntervalMs }}ms</td>
                <td><span class="act" [class.block]="p.action==='BLOCK'">{{ p.action }}</span></td>
                <td><span class="dot" [class.on]="p.enabled">{{ p.enabled ? 'Enabled' : 'Disabled' }}</span></td>
                @if (canWrite) {
                  <td class="right nowrap">
                    <button class="mini" (click)="editPolicy(p)">Edit</button>
                    <button class="mini danger" (click)="deletePolicy(p)">Delete</button>
                  </td>
                }
              </tr>
            } @empty {
              <tr><td class="empty" [attr.colspan]="canWrite ? 6 : 5">No policies configured.</td></tr>
            }
          </tbody>
        </table>
        @if (saveError() && !editing()) { <div class="banner-err">{{ saveError() }}</div> }
      </div>

      <div class="hw-card panel">
        <div class="panel-head"><h3>Top blocked offenders</h3><span class="tag">blocks</span></div>
        <table class="tbl">
          <tbody>
            @for (t of stats()?.topBlocked ?? []; track t.key) {
              <tr><td class="mono">{{ t.key }}</td><td class="num">{{ t.blocks }}</td></tr>
            } @empty { <tr><td class="empty" colspan="2">No blocks recorded.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>

    @if (canWrite && editing(); as e) {
      <div class="hw-card panel">
        <div class="panel-head">
          <h3>{{ isNew() ? 'New policy' : 'Edit policy · ' + e.keyType }}</h3>
          <span class="tag">PUT /policies/:keyType</span>
        </div>
        <form class="editor" (ngSubmit)="savePolicy()">
          <label>Key type
            <input [(ngModel)]="e.keyType" name="keyType" [readonly]="!isNew()"
                   placeholder="imsi / operator / ip / default" required />
          </label>
          <label>Capacity (burst)
            <input type="number" min="1" [(ngModel)]="e.capacity" name="capacity" required />
          </label>
          <label>Refill tokens
            <input type="number" min="1" [(ngModel)]="e.refillTokens" name="refillTokens" required />
          </label>
          <label>Refill interval (ms)
            <input type="number" min="1" [(ngModel)]="e.refillIntervalMs" name="refillIntervalMs" required />
          </label>
          <label>Action
            <select [(ngModel)]="e.action" name="action">
              <option value="THROTTLE">THROTTLE</option>
              <option value="BLOCK">BLOCK</option>
            </select>
          </label>
          <label class="chk">
            <input type="checkbox" [(ngModel)]="e.enabled" name="enabled" /> Enabled
          </label>
          <label class="wide">Description
            <input [(ngModel)]="e.description" name="description" placeholder="Optional note" />
          </label>
          <div class="actions">
            <button class="hw-btn" type="submit" [disabled]="saving() || !e.keyType">
              {{ saving() ? 'Saving…' : 'Save policy' }}
            </button>
            <button class="hw-btn ghost" type="button" (click)="cancelEdit()">Cancel</button>
            @if (saveError()) { <span class="inline-err">{{ saveError() }}</span> }
          </div>
        </form>
      </div>
    }

    <div class="hw-card panel">
      <div class="panel-head"><h3>Test a rate-limit decision</h3><span class="tag">POST /check</span></div>
      <form class="check" (ngSubmit)="runCheck()">
        <label>Key type
          <input [(ngModel)]="keyType" name="tkKeyType" placeholder="imsi / operator / ip / default" required />
        </label>
        <label>Key
          <input [(ngModel)]="key" name="tkKey" placeholder="e.g. 234-15-000123" required />
        </label>
        <label>Tokens
          <input type="number" min="1" [(ngModel)]="tokens" name="tkTokens" />
        </label>
        <button class="hw-btn" type="submit" [disabled]="busy()">Send request</button>
      </form>

      @if (result(); as r) {
        <div class="verdict" [class.allowed]="r.allowed" [class.denied]="!r.allowed">
          <strong>{{ r.allowed ? 'ALLOWED' : 'BLOCKED (' + r.action + ')' }}</strong>
          <span>remaining: {{ r.remaining }} / {{ r.limit }}</span>
          @if (!r.allowed) { <span>retry after {{ (r.retryAfterMs / 1000) | number:'1.0-1' }}s</span> }
        </div>
      }
      @if (error()) { <div class="verdict err">{{ error() }}</div> }
    </div>
  `,
  styles: [`
    .live { font-size: 12px; font-weight: 600; color: var(--hw-success); }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
    .panel { padding: 18px 20px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .tag { font-size: 12px; color: var(--hw-text-3); }
    .note { padding: 16px 20px; font-size: 13px; color: var(--hw-text-3); margin-bottom: 16px; }
    .note code { font-family: monospace; background: var(--hw-bg); padding: 1px 5px; border-radius: 4px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th { text-align: left; color: var(--hw-text-3); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--hw-border); }
    .tbl td { padding: 11px 12px; border-bottom: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .tbl tr:last-child td { border-bottom: 0; }
    .right { text-align: right; }
    .nowrap { white-space: nowrap; }
    .mono { font-family: monospace; }
    .muted { color: var(--hw-text-3); }
    .num { text-align: right; font-weight: 600; color: var(--hw-text); }
    .empty { text-align: center; color: var(--hw-text-3); padding: 18px; }
    .act { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; background: rgba(255,143,31,.14); color: var(--hw-warning); }
    .act.block { background: rgba(245,63,63,.12); color: var(--hw-danger); }
    .dot { font-size: 12px; color: var(--hw-text-3); }
    .dot.on { color: var(--hw-success); font-weight: 600; }
    .mini { font-size: 12px; padding: 4px 10px; margin-left: 6px; border: 1px solid var(--hw-border); background: var(--hw-card, #fff); border-radius: 6px; cursor: pointer; color: var(--hw-text-2); }
    .mini:hover { border-color: var(--hw-info); color: var(--hw-info); }
    .mini.danger:hover { border-color: var(--hw-danger); color: var(--hw-danger); }
    .editor { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .editor label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--hw-text-3); }
    .editor .wide { grid-column: span 2; }
    .editor .chk { flex-direction: row; align-items: center; gap: 8px; margin-top: 22px; color: var(--hw-text-2); font-size: 13px; }
    .editor input, .editor select { padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px; font-size: 13px; }
    .editor input[readonly] { background: var(--hw-bg); color: var(--hw-text-3); }
    .editor .chk input { width: auto; }
    .actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; margin-top: 4px; }
    .hw-btn.ghost { background: transparent; border: 1px solid var(--hw-border); color: var(--hw-text-2); }
    .inline-err { color: var(--hw-danger); font-size: 12px; }
    .banner-err { margin-top: 12px; padding: 10px 14px; border-radius: 6px; background: rgba(245,63,63,.1); color: var(--hw-danger); font-size: 12px; }
    .check { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
    .check label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--hw-text-3); }
    .check input { padding: 8px 10px; border: 1px solid var(--hw-border); border-radius: 6px; font-size: 13px; min-width: 200px; }
    .check input[type=number] { min-width: 90px; }
    .verdict { margin-top: 16px; padding: 12px 16px; border-radius: 8px; display: flex; gap: 18px; align-items: center; font-size: 13px; }
    .verdict.allowed { background: rgba(0,168,112,.1); color: var(--hw-success); }
    .verdict.denied { background: rgba(245,63,63,.1); color: var(--hw-danger); }
    .verdict.err { background: rgba(245,63,63,.1); color: var(--hw-danger); margin-top: 16px; }
    @media (max-width: 1000px) { .grid, .stats, .editor { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 620px) { .grid, .stats, .editor { grid-template-columns: 1fr; } }
  `],
})
export class RateLimiting implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private sub?: Subscription;
  pollLabel = `${POLL_MS / 1000}s`;

  /** Only users with detection-rules:write may create/edit/delete policies (matches the backend guard). */
  canWrite = this.auth.hasPermission('detection-rules:write');

  stats = signal<ProtectionStats | null>(null);
  policies = signal<Policy[]>([]);

  // policy editor state
  editing = signal<Policy | null>(null);
  isNew = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);

  // decision tester state
  result = signal<CheckResult | null>(null);
  error = signal<string | null>(null);
  busy = signal(false);
  keyType = 'imsi';
  key = '';
  tokens = 1;

  ngOnInit() {
    this.sub = interval(POLL_MS).pipe(
      startWith(0),
      switchMap(() => this.http.get<ProtectionStats>(`${API}/stats`)),
    ).subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set(null),
    });
    this.loadPolicies();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private loadPolicies() {
    this.http.get<Policy[]>(`${API}/policies`).subscribe({
      next: (data) => this.policies.set(data),
      error: () => this.policies.set([]),
    });
  }

  // ---- policy CRUD (write; gated by canWrite in the template) ----

  newPolicy() {
    this.saveError.set(null);
    this.isNew.set(true);
    this.editing.set({ ...EMPTY_POLICY });
  }

  editPolicy(p: Policy) {
    this.saveError.set(null);
    this.isNew.set(false);
    this.editing.set({ ...p });
  }

  cancelEdit() {
    this.editing.set(null);
    this.saveError.set(null);
  }

  savePolicy() {
    const p = this.editing();
    if (!p || !p.keyType) return;
    this.saving.set(true);
    this.saveError.set(null);
    // Send the full, typed policy body the backend validates (all bucket params + action).
    const body: Policy = {
      keyType: p.keyType.trim(),
      capacity: Number(p.capacity),
      refillTokens: Number(p.refillTokens),
      refillIntervalMs: Number(p.refillIntervalMs),
      action: p.action,
      enabled: p.enabled,
      description: p.description ?? '',
    };
    this.http.put<Policy>(`${API}/policies/${encodeURIComponent(body.keyType)}`, body).subscribe({
      next: () => { this.saving.set(false); this.editing.set(null); this.loadPolicies(); },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(this.describeError(err, 'Save'));
      },
    });
  }

  /** Builds a readable message from the backend's detailed error payload (validation fields, parse cause, 403). */
  private describeError(err: HttpErrorResponse, verb: string): string {
    if (err.status === 403) return 'Forbidden — your token lacks detection-rules:write.';
    const body = err.error;
    if (body?.fields) {
      const parts = Object.entries(body.fields).map(([f, m]) => `${f}: ${m}`);
      return `${body.error ?? 'Validation failed'} — ${parts.join('; ')}`;
    }
    if (body?.details) return `${body.error ?? 'Bad request'} — ${body.details}`;
    if (body?.error) return body.error;
    return `${verb} failed (${err.status})`;
  }

  deletePolicy(p: Policy) {
    if (!confirm(`Delete policy "${p.keyType}"?`)) return;
    this.http.delete(`${API}/policies/${encodeURIComponent(p.keyType)}`).subscribe({
      next: () => this.loadPolicies(),
      error: (err: HttpErrorResponse) => this.saveError.set(this.describeError(err, 'Delete')),
    });
  }

  // ---- decision tester (read) ----

  runCheck() {
    if (!this.keyType || !this.key) return;
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    this.http.post<CheckResult>(`${API}/check`, {
      keyType: this.keyType, key: this.key, tokens: this.tokens || 1,
    }).subscribe({
      next: (r) => { this.result.set(r); this.busy.set(false); },
      error: (err: HttpErrorResponse) => {
        // A 429 (blocked) still carries a RateLimitResult body — surface it as a verdict.
        if (err.status === 429 && err.error) {
          this.result.set(err.error as CheckResult);
        } else {
          this.error.set(err.error?.error ?? `Request failed (${err.status})`);
        }
        this.busy.set(false);
      },
    });
  }
}
