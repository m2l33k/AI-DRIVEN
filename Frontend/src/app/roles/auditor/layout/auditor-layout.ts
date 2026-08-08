import { Component } from '@angular/core';
import { RoleShell, NavItem } from '../../../shared/layout/role-shell';

@Component({
  selector: 'app-auditor-layout',
  standalone: true,
  imports: [RoleShell],
  template: `
    <hw-role-shell brand="CloudOps Console" roleName="Auditor"
                   accent="#ff8f1f" [navItems]="nav" />
  `,
})
export class AuditorLayout {
  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { label: 'Audit Logs', path: 'audit-logs', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V8zm5 1V3.5L18.5 9H13z' },
  ];
}
