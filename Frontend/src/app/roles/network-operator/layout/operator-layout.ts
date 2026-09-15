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
    { label: '5G Core', path: '5gc', icon: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L19 8v8l-7 3.89L5 16V8l7-3.82z' },
    { label: '5GC Topology', path: '5gc-topology', icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z' },
    { label: 'VM', path: 'vm', icon: 'M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z' },
  ];
}
