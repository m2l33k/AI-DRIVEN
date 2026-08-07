import { Component, signal } from '@angular/core';
import { PageHeader } from '../../../shared/ui/page-header';

@Component({
  selector: 'app-platform-config',
  standalone: true,
  imports: [PageHeader],
  template: `
    <hw-page-header title="Platform Configuration"
      subtitle="Global settings for the 5G Core management platform">
      <button class="hw-btn">Discard</button>
      <button class="hw-btn hw-btn--primary">Save changes</button>
    </hw-page-header>

    <div class="layout">
      <aside class="hw-card side">
        @for (s of sections; track s.key) {
          <button class="side-item" [class.active]="active()===s.key" (click)="active.set(s.key)">
            {{ s.label }}
          </button>
        }
      </aside>

      <div class="hw-card body">
        @if (active()==='general') {
          <h3>General</h3>
          <div class="field"><label>Platform name</label>
            <input class="hw-input" value="CloudOps 5GC Console" /></div>
          <div class="field"><label>Environment</label>
            <select class="hw-input"><option>Production</option><option>Staging</option><option>Dev</option></select></div>
          <div class="field"><label>Default locale</label>
            <select class="hw-input"><option>English (en)</option><option>Français (fr)</option><option>العربية (ar)</option></select></div>
        } @else if (active()==='security') {
          <h3>Security</h3>
          @for (t of toggles; track t.key) {
            <div class="toggle-row">
              <div><strong>{{ t.label }}</strong><span>{{ t.hint }}</span></div>
              <button class="switch" [class.on]="t.on" (click)="t.on = !t.on"><i></i></button>
            </div>
          }
          <div class="field"><label>Session timeout (minutes)</label>
            <input class="hw-input" type="number" value="30" /></div>
        } @else {
          <h3>Integrations</h3>
          @for (i of integrations; track i.name) {
            <div class="int-row">
              <div class="int-name"><span class="dot" [class.up]="i.connected"></span>{{ i.name }}</div>
              <span class="int-st">{{ i.connected ? 'Connected' : 'Not configured' }}</span>
              <button class="mini">{{ i.connected ? 'Manage' : 'Connect' }}</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }
    .side { padding: 10px; height: max-content; }
    .side-item { display: block; width: 100%; text-align: left; border: 0; background: transparent;
      padding: 10px 14px; border-radius: 6px; font-size: 14px; color: var(--hw-text-2); }
    .side-item:hover { background: var(--hw-bg); }
    .side-item.active { background: var(--hw-red-soft); color: var(--hw-red); font-weight: 600; }
    .body { padding: 24px 28px; }
    .body h3 { margin: 0 0 20px; font-size: 16px; }
    .field { margin-bottom: 18px; max-width: 420px; }
    .field label { display: block; font-size: 13px; margin-bottom: 6px; color: var(--hw-text-2); }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--hw-border); }
    .toggle-row strong { display: block; font-size: 14px; }
    .toggle-row span { font-size: 12px; color: var(--hw-text-3); }
    .switch { width: 44px; height: 24px; border-radius: 20px; border: 0; background: var(--hw-border-strong); position: relative; transition: background .15s; }
    .switch i { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
    .switch.on { background: var(--hw-red); }
    .switch.on i { left: 22px; }
    .int-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--hw-border); }
    .int-name { display: flex; align-items: center; gap: 10px; font-weight: 500; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--hw-border-strong); }
    .dot.up { background: var(--hw-success); }
    .int-st { font-size: 12px; color: var(--hw-text-3); }
    .mini { border: 1px solid var(--hw-border-strong); background: #fff; border-radius: 6px; padding: 6px 14px; font-size: 12px; }
    .mini:hover { border-color: var(--hw-red); color: var(--hw-red); }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
  `],
})
export class PlatformConfig {
  active = signal<'general' | 'security' | 'integrations'>('general');
  sections = [
    { key: 'general', label: 'General' },
    { key: 'security', label: 'Security' },
    { key: 'integrations', label: 'Integrations' },
  ] as const;

  toggles = [
    { key: 'mfa', label: 'Enforce MFA', hint: 'Require multi-factor auth for all users', on: true },
    { key: 'sso', label: 'Keycloak SSO', hint: 'Single sign-on via the platform realm', on: true },
    { key: ' iprestrict', label: 'IP allow-list', hint: 'Restrict console access by IP range', on: false },
  ];

  integrations = [
    { name: 'Keycloak (platform-realm)', connected: true },
    { name: 'Prometheus', connected: true },
    { name: 'Grafana', connected: true },
    { name: 'PagerDuty', connected: false },
  ];
}
