import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // ---- Auth (shared) ----
  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },
  { path: 'first-login', loadComponent: () => import('./auth/first-login/first-login').then((m) => m.FirstLogin) },
  { path: 'reset-password', loadComponent: () => import('./auth/reset-password/reset-password').then((m) => m.ResetPassword) },

  // ---- PLATFORM_ADMIN ----
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('PLATFORM_ADMIN')],
    loadComponent: () => import('./roles/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard) },
      { path: 'users', loadComponent: () => import('./roles/admin/users/users').then((m) => m.AdminUsers) },
      { path: 'roles', loadComponent: () => import('./roles/admin/roles/roles').then((m) => m.AdminRoles) },
      { path: 'monitoring', loadComponent: () => import('./roles/admin/monitoring/monitoring').then((m) => m.AdminMonitoring) },
      { path: 'metrics', loadComponent: () => import('./roles/admin/metrics/metrics').then((m) => m.AdminMetrics) },
      { path: 'messages', loadComponent: () => import('./messaging/messages').then((m) => m.Messages) },
    ],
  },

  // ---- NETWORK_OPERATOR ----
  {
    path: 'operator',
    canActivate: [authGuard, roleGuard('NETWORK_OPERATOR')],
    loadComponent: () => import('./roles/network-operator/layout/operator-layout').then((m) => m.OperatorLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/network-operator/dashboard/operator-dashboard').then((m) => m.OperatorDashboard) },
      { path: 'network-functions', loadComponent: () => import('./roles/network-operator/network-functions/network-functions').then((m) => m.NetworkFunctions) },
      { path: 'core-config', loadComponent: () => import('./roles/network-operator/core-config/core-config').then((m) => m.CoreConfig) },
      { path: '5gc', loadComponent: () => import('./roles/security-analyst/fivegc/fivegc-dashboard').then((m) => m.FiveGcDashboard) },
      { path: 'messages', loadComponent: () => import('./messaging/messages').then((m) => m.Messages) },
    ],
  },

  // ---- SECURITY_ANALYST ----
  {
    path: 'security',
    canActivate: [authGuard, roleGuard('SECURITY_ANALYST')],
    loadComponent: () => import('./roles/security-analyst/layout/security-layout').then((m) => m.SecurityLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/security-analyst/dashboard/security-dashboard').then((m) => m.SecurityDashboard) },
      { path: 'security-alerts', loadComponent: () => import('./roles/security-analyst/security-alerts/security-alerts').then((m) => m.SecurityAlerts) },
      { path: 'roaming', pathMatch: 'full', redirectTo: 'roaming/overview' },
      { path: 'roaming/overview', loadComponent: () => import('./roles/security-analyst/roaming/roaming-overview').then((m) => m.RoamingOverview) },
      { path: 'roaming/events', loadComponent: () => import('./roles/security-analyst/roaming/roaming-events-page').then((m) => m.RoamingEventsPage) },
      { path: 'roaming/anomalies', loadComponent: () => import('./roles/security-analyst/roaming/roaming-anomalies').then((m) => m.RoamingAnomalies) },
      { path: 'roaming/partners', loadComponent: () => import('./roles/security-analyst/roaming/roaming-partners').then((m) => m.RoamingPartners) },
      { path: 'roaming/qos', loadComponent: () => import('./roles/security-analyst/roaming/roaming-qos').then((m) => m.RoamingQos) },
      { path: 'roaming/kpis', loadComponent: () => import('./roles/security-analyst/roaming/roaming-kpis').then((m) => m.RoamingKpis) },
      { path: 'roaming/revenue', loadComponent: () => import('./roles/security-analyst/roaming/roaming-revenue').then((m) => m.RoamingRevenue) },
      { path: 'roaming/tools', loadComponent: () => import('./roles/security-analyst/roaming/roaming-tools').then((m) => m.RoamingTools) },
      { path: 'detection-rules', loadComponent: () => import('./roles/security-analyst/detection-rules/detection-rules').then((m) => m.DetectionRules) },
      { path: 'rate-limiting', loadComponent: () => import('./roles/security-analyst/rate-limiting/rate-limiting').then((m) => m.RateLimiting) },
      { path: '5gc', loadComponent: () => import('./roles/security-analyst/fivegc/fivegc-dashboard').then((m) => m.FiveGcDashboard) },
      { path: 'messages', loadComponent: () => import('./messaging/messages').then((m) => m.Messages) },
    ],
  },

  // ---- AUDITOR ----
  {
    path: 'audit',
    canActivate: [authGuard, roleGuard('AUDITOR')],
    loadComponent: () => import('./roles/auditor/layout/auditor-layout').then((m) => m.AuditorLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./roles/auditor/dashboard/auditor-dashboard').then((m) => m.AuditorDashboard) },
      { path: 'audit-logs', loadComponent: () => import('./roles/auditor/audit-logs/audit-logs').then((m) => m.AuditLogs) },
      { path: 'messages', loadComponent: () => import('./messaging/messages').then((m) => m.Messages) },
    ],
  },

  // ---- Errors ----
  { path: 'error/500', loadComponent: () => import('./errors/server-error/server-error').then((m) => m.ServerError) },
  { path: '**', loadComponent: () => import('./errors/not-found/not-found').then((m) => m.NotFound) },
];
