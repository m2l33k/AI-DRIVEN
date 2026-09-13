import { Component } from '@angular/core';
import { RoleShell, NavItem } from '../../../shared/layout/role-shell';

@Component({
  selector: 'app-security-layout',
  standalone: true,
  imports: [RoleShell],
  template: `
    <hw-role-shell brand="CloudOps Console" roleName="Security Analyst"
                   accent="#00a870" [navItems]="nav" />
  `,
})
export class SecurityLayout {
  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { label: 'Security Alerts', path: 'security-alerts', icon: 'M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4zm-1 6h2v6h-2V8zm0 8h2v2h-2v-2z' },
    {
      label: 'Roaming',
      icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-2.9a15.7 15.7 0 00-1.4-3.6A8 8 0 0118.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a7.8 7.8 0 010-4h3.3a17 17 0 000 4H4.3zm.8 2h2.9c.4 1.3.9 2.5 1.4 3.6A8 8 0 015.1 16zM8 8H5.1a8 8 0 014.3-3.6C8.9 5.5 8.4 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a15 15 0 010-4h4.6a15 15 0 010 4zm.3 5.6c.5-1.1 1-2.3 1.4-3.6h2.9a8 8 0 01-4.3 3.6zM16.4 14a17 17 0 000-4h3.3a7.8 7.8 0 010 4h-3.3z',
      children: [
        { label: 'Overview', path: 'roaming/overview', icon: '' },
        { label: 'Events', path: 'roaming/events', icon: '' },
        { label: 'Anomalies', path: 'roaming/anomalies', icon: '' },
        { label: 'Partners', path: 'roaming/partners', icon: '' },
        { label: 'QoS & Experience', path: 'roaming/qos', icon: '' },
        { label: 'KPIs & SLA', path: 'roaming/kpis', icon: '' },
        { label: 'Revenue', path: 'roaming/revenue', icon: '' },
        { label: 'Tools', path: 'roaming/tools', icon: '' },
      ],
    },
    { label: '5G Core', path: '5gc', icon: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L19 8v8l-7 3.89L5 16V8l7-3.82z' },
    { label: 'Detection Rules', path: 'detection-rules', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
    { label: 'Rate Limiting', path: 'rate-limiting', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5 3 1-1.6-4-2.4V7z' },
  ];
}
