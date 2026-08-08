import { Component } from '@angular/core';
import { RoleShell, NavItem } from '../../../shared/layout/role-shell';

@Component({
  selector: 'app-operator-layout',
  standalone: true,
  imports: [RoleShell],
  template: `
    <hw-role-shell brand="CloudOps Console" roleName="Network Operator"
                   accent="#3491fa" [navItems]="nav" />
  `,
})
export class OperatorLayout {
  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { label: 'Network Functions', path: 'network-functions', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm13 0a3 3 0 100 6 3 3 0 000-6z' },
    { label: 'Core Config', path: 'core-config', icon: 'M20 8h-3V4H3v16h14v-4h3V8zM7 9h6v2H7V9zm0 4h6v2H7v-2z' },
  ];
}
