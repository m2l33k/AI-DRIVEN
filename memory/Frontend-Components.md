---
title: Frontend Components
tags: [frontend, components, reference]
updated: 2026-08-07
---

# Frontend Components (file-by-file)

Detailed reference of every component built. Paths are under `Frontend/src/app/`.
See [[Frontend-Architecture]] for the big picture.

## Shared — charts (`shared/charts/`)
| File | Selector | Inputs | Notes |
|------|----------|--------|-------|
| `line-chart.ts` | `hw-line-chart` | `data:number[]`, `labels:string[]`, `color`, `ariaLabel` | SVG area+line, grid, points; gradient fill |
| `bar-chart.ts` | `hw-bar-chart` | `data`, `labels`, `color`, `ariaLabel` | Vertical bars, rounded corners |
| `donut-chart.ts` | `hw-donut-chart` | `slices:DonutSlice[]`, `centerLabel`, `ariaLabel` | `DonutSlice = {label,value,color}`; legend + center total |

## Shared — UI (`shared/ui/`)
| File | Selector | Inputs |
|------|----------|--------|
| `stat-card.ts` | `hw-stat-card` | `label`, `value`, `unit`, `accent`, `delta:number\|null`, `deltaHint` — KPI card with trend arrow |
| `page-header.ts` | `hw-page-header` | `title`, `subtitle` + `<ng-content>` for right-side actions |

## Shared — layout (`shared/layout/`)
- `role-shell.ts` → `hw-role-shell`. The reusable console chrome.
  - Inputs: `brand`, `roleName`, `accent`, `navItems:NavItem[]`, `userName`.
  - `NavItem = { label, path, icon }` (icon = 24×24 SVG path data).
  - Features: collapsible sidebar (signal `collapsed`), top bar with role badge,
    notifications, user avatar/initials, logout (routes to `/login`), `<router-outlet/>`.

## Auth (`auth/`)
- `login/login.ts` → `app-login`. Split-screen: red brand panel + form.
  Username/password, show/hide, remember-me, forgot-password link, and a **demo role
  picker** (4 chips) whose `submit()` routes to `/admin`|`/operator`|`/security`|`/audit`.
- `reset-password/reset-password.ts` → `app-reset-password`. 2 steps via `sent` signal:
  (1) request reset by email (regex-validated), (2) set new password with a strength meter
  (`computed`), confirm match, submit disabled until valid.

## Errors (`errors/`)
- `not-found/not-found.ts` → `app-not-found` (**404**). SVG illustration, "Go back"
  (uses `Location.back()`), return-to-login.
- `server-error/server-error.ts` → `app-server-error` (**500**). Warning illustration,
  "Try again" (`window.location.reload()`), return-to-login.

## Role: admin (PLATFORM_ADMIN) — `roles/admin/`
- `layout/admin-layout.ts` — nav: Dashboard, Users, Roles & Permissions, Platform Config. Accent `#c7000b`.
- `dashboard/admin-dashboard.ts` — 4 stat cards, sign-in line chart, users-by-role donut,
  config-changes bar chart, recent-activity table.
- `users/users.ts` — searchable/filterable user table (mock users incl. `admin-user`); role filter.
- `roles/roles.ts` — role cards with permission chips + a **permission matrix** table
  (mirrors [[Roles-and-Permissions]]).
- `platform-config/platform-config.ts` — settings with side-tabs: General / Security
  (toggles, session timeout) / Integrations (Keycloak, Prometheus, Grafana, PagerDuty).

## Role: network-operator (NETWORK_OPERATOR) — `roles/network-operator/`
- `layout/operator-layout.ts` — nav: Dashboard, Network Functions, Core Config. Accent `#3491fa`.
- `dashboard/operator-dashboard.ts` — NF health stats, throughput line chart, NF-status
  donut, sessions bar chart, NF table with CPU bars.
- `network-functions/network-functions.ts` — NF cards (AMF/SMF/UPF/AUSF/UDM) with CPU/MEM
  gauges + **Restart** (UI-only: flips a degraded NF back to running).
- `core-config/core-config.ts` — network slices (S-NSSAI), QoS profiles (5QI), PLMN/AMF
  params; "Apply to core" shows a success banner.

## Role: security-analyst (SECURITY_ANALYST) — `roles/security-analyst/`
- `layout/security-layout.ts` — nav: Dashboard, Security Alerts, Roaming Events, Detection Rules. Accent `#00a870`.
- `dashboard/security-dashboard.ts` — alert stats, alerts-over-time line, severity donut,
  attack-category bar, latest-critical-alerts table.
- `security-alerts/security-alerts.ts` — tabbed table (All/Open/Ack/Resolved) with severity badges.
- `roaming-events/roaming-events.ts` — roaming-volume line chart + events table (PLMN, risk).
- `detection-rules/detection-rules.ts` — rules table with enable/disable **toggle switches**.

## Role: auditor (AUDITOR) — `roles/auditor/`
- `layout/auditor-layout.ts` — nav: Dashboard, Audit Logs. Accent `#ff8f1f`.
- `dashboard/auditor-dashboard.ts` — audit stats, events-by-day bar, outcome donut,
  most-active-actors table.
- `audit-logs/audit-logs.ts` — searchable/filterable immutable log table (timestamp, actor,
  action, resource, outcome, IP).

## Root & routing
- `app.ts` — `<router-outlet />` only.
- `app.routes.ts` — lazy routes (see [[Frontend-Architecture]] routing table).
- `app.config.ts` — providers: global error listeners + `provideRouter(routes)`.

## Related notes
- [[Frontend-Architecture]]
- [[Roles-and-Permissions]]
