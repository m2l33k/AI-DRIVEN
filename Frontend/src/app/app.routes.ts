import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // ---- Auth (shared) ----
  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },
  { path: 'reset-password', loadComponent: () => import('./auth/reset-password/reset-password').then((m) => m.ResetPassword) },

  // ---- PLATFORM_ADMIN ----
  {
    path: 'admin',
    loadComponent: () => import('./roles/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard) },
      { path: 'users', loadComponent: () => import('./roles/admin/users/users').then((m) => m.AdminUsers) },
      { path: 'roles', loadComponent: () => import('./roles/admin/roles/roles').then((m) => m.AdminRoles) },
      { path: 'platform-config', loadComponent: () => import('./roles/admin/platform-config/platform-config').then((m) => m.PlatformConfig) },
    ],
  },

  // ---- NETWORK_OPERATOR ----
  {
    path: 'operator',
    loadComponent: () => import('./roles/network-operator/layout/operator-layout').then((m) => m.OperatorLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/network-operator/dashboard/operator-dashboard').then((m) => m.OperatorDashboard) },
      { path: 'network-functions', loadComponent: () => import('./roles/network-operator/network-functions/network-functions').then((m) => m.NetworkFunctions) },
      { path: 'core-config', loadComponent: () => import('./roles/network-operator/core-config/core-config').then((m) => m.CoreConfig) },
    ],
  },

  // ---- SECURITY_ANALYST ----
  {
    path: 'security',
    loadComponent: () => import('./roles/security-analyst/layout/security-layout').then((m) => m.SecurityLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/security-analyst/dashboard/security-dashboard').then((m) => m.SecurityDashboard) },
      { path: 'security-alerts', loadComponent: () => import('./roles/security-analyst/security-alerts/security-alerts').then((m) => m.SecurityAlerts) },
      { path: 'roaming-events', loadComponent: () => import('./roles/security-analyst/roaming-events/roaming-events').then((m) => m.RoamingEvents) },
      { path: 'detection-rules', loadComponent: () => import('./roles/security-analyst/detection-rules/detection-rules').then((m) => m.DetectionRules) },
    ],
  },

  // ---- AUDITOR ----
  {
    path: 'audit',
    loadComponent: () => import('./roles/auditor/layout/auditor-layout').then((m) => m.AuditorLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/auditor/dashboard/auditor-dashboard').then((m) => m.AuditorDashboard) },
      { path: 'audit-logs', loadComponent: () => import('./roles/auditor/audit-logs/audit-logs').then((m) => m.AuditLogs) },
    ],
  },

  // ---- Errors ----
  { path: 'error/500', loadComponent: () => import('./errors/server-error/server-error').then((m) => m.ServerError) },
  { path: '**', loadComponent: () => import('./errors/not-found/not-found').then((m) => m.NotFound) },
];
