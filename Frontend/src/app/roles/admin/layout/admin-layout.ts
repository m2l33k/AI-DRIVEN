import { Component } from '@angular/core';
import { RoleShell, NavItem } from '../../../shared/layout/role-shell';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RoleShell],
  template: `
    <hw-role-shell brand="CloudOps Console" roleName="Platform Admin"
                   userName="Admin User" accent="#c7000b" [navItems]="nav" />
  `,
})
export class AdminLayout {
  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { label: 'Users', path: 'users', icon: 'M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a4 4 0 10-4-4 4 4 0 004 4zm0 2c-2.7 0-8 1.3-8 4v3h8v-3c0-1 .4-1.9 1.1-2.7C8.3 13.1 8 13 8 13zm8 0c-.3 0-.7 0-1.1.1.7.8 1.1 1.7 1.1 2.9v3h8v-3c0-2.7-5.3-4-8-4z' },
    { label: 'Roles & Permissions', path: 'roles', icon: 'M12 1L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm-2 15l-4-4 1.4-1.4L10 13.2l6.6-6.6L18 8l-8 8z' },
    { label: 'Platform Config', path: 'platform-config', icon: 'M19.4 13a7.8 7.8 0 000-2l2.1-1.6-2-3.5-2.5 1a7.7 7.7 0 00-1.7-1l-.4-2.6h-4l-.4 2.6a7.7 7.7 0 00-1.7 1l-2.5-1-2 3.5L4.6 11a7.8 7.8 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.7 7.7 0 001.7 1l.4 2.6h4l.4-2.6a7.7 7.7 0 001.7-1l2.5 1 2-3.5-2.1-1.6zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7z' },
  ];
}
