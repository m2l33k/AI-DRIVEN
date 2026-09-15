import { Component } from '@angular/core';
import { RoleShell, NavItem } from '../../../shared/layout/role-shell';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RoleShell],
  template: `
    <hw-role-shell brand="CloudOps Console" roleName="Platform Admin"
                   accent="#c7000b" [navItems]="nav" />
  `,
})
export class AdminLayout {
  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { label: 'Users', path: 'users', icon: 'M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a4 4 0 10-4-4 4 4 0 004 4zm0 2c-2.7 0-8 1.3-8 4v3h8v-3c0-1 .4-1.9 1.1-2.7C8.3 13.1 8 13 8 13zm8 0c-.3 0-.7 0-1.1.1.7.8 1.1 1.7 1.1 2.9v3h8v-3c0-2.7-5.3-4-8-4z' },
    { label: 'Roles & Permissions', path: 'roles', icon: 'M12 1L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm-2 15l-4-4 1.4-1.4L10 13.2l6.6-6.6L18 8l-8 8z' },
    { label: 'System Health', path: 'monitoring', icon: 'M12 21s-7-4.35-9.5-8.5C.5 9 2 5 5.5 5c2 0 3.5 1.4 4.5 2.9C11 6.4 12.5 5 14.5 5 18 5 19.5 9 17.5 12.5 15 16.65 12 21 12 21z' },
    { label: 'API Metrics', path: 'metrics', icon: 'M4 13h3v7H4zm5-6h3v13H9zm5 3h3v10h-3zm5-8h3v18h-3z' },
    { label: 'VM', path: 'vm', icon: 'M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z' },
  ];
}
