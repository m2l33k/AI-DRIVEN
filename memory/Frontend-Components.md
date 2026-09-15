---
title: Frontend Components
tags: [frontend, components, reference]
updated: 2026-09-15
---

# Frontend Components (file-by-file)

Detailed reference of every component built. Paths are under `Frontend/src/app/`.
See [[Frontend-Architecture]] for the big picture.

## Shared — charts (`shared/charts/`)
| File | Selector | Inputs | Notes |
|------|----------|--------|-------|
| `line-chart.ts` | `hw-line-chart` | `data:number[]`, `labels:string[]`, `color`, `ariaLabel`, `smooth` | SVG area+line, grid, points; gradient fill; `[smooth]` = Catmull-Rom curve |
| `bar-chart.ts` | `hw-bar-chart` | `data`, `labels`, `color`, `ariaLabel` | Vertical bars, rounded corners |
| `donut-chart.ts` | `hw-donut-chart` | `slices:DonutSlice[]`, `centerLabel`, `ariaLabel` | `DonutSlice = {label,value,color}`; legend + center total |
| `gauge-chart.ts` | `hw-gauge-chart` | `value`, `max`, `label`, `color`, `higherIsBetter`, `ariaLabel` | 270° radial 0-100 gauge; auto-grades red→amber→green |
| `multi-line-chart.ts` | `hw-multi-line-chart` | `series:{label,color,data}[]`, `labels:string[]`, `dividerIndex?:number` | Multiple series on one canvas; `dividerIndex` = dashed historical/predicted separator |

## Shared — UI (`shared/ui/`)
| File | Selector | Inputs |
|------|----------|--------|
| `stat-card.ts` | `hw-stat-card` | `label`, `value`, `unit`, `accent`, `delta:number\|null`, `deltaHint` |
| `page-header.ts` | `hw-page-header` | `title`, `subtitle` + `<ng-content>` for right-side actions |
| `async-state.ts` | `hw-async-state` | `loading`, `error`, `empty`, `loadingText`, `emptyText` + `(retry)` |

## Shared — layout (`shared/layout/`)
- `role-shell.ts` → `hw-role-shell`. Console chrome used by all four role layouts.
  - Inputs: `brand`, `roleName`, `accent`, `navItems:NavItem[]`
  - `NavItem = { label, path?, icon, children?: NavItem[] }` (icon = 24×24 SVG path data)
  - **Nested submenus:** items with `children` render expandable groups (chevron toggle, auto-opens on active child route). Used by Roaming group (security analyst).
  - Sidebar: collapsible (signal `collapsed`), mobile overlay (≤860px)
  - Topbar: role badge, notifications bell (WebSocket unread count + dropdown), user avatar, logout, language switcher (EN/中文)
  - **Messages FAB:** `position: fixed; bottom: 28px; right: 28px` floating action button inside `.main`. Shows `9+` badge from `messages.service.unread()`. Added after Messages was removed from the sidebar Account section.
  - `.content` has `position: relative` — required for VM desktop `position: absolute; inset: 0` containment.

## Shared — fivegc (`shared/fivegc/`)
- `fivegc.service.ts` → `FiveGcService` (`providedIn: 'root'`). Methods:
  - `nfStatus()` → `GET /api/5gc/nf-status` → `NfStatus[]`
  - `subscribers()` → `GET /api/5gc/subscribers` → `Subscriber[]`
  - `ueContexts()` → `GET /api/5gc/ue-contexts` → `UeContext[]`
  - `getNetworkConfig()` → `GET /api/5gc/network-config` → `NetworkConfig`
  - `applyNetworkConfig(config)` → `PUT /api/5gc/network-config` → `ApplyResult`
  - All wrap with `catchError(() => of([]))` — never throw, return empty on failure
  - Interfaces: `NfStatus`, `Subscriber`, `UeContext`, `NetworkSlice`, `QosProfile`, `PlmnConfig`, `NetworkConfig`, `ApplyResult`

## Shared — vm (`shared/vm/`)
- `vm.service.ts` → `VmService` (`providedIn: 'root'`). MongoDB console client:
  - `listDbs()` → `GET /api/vm/mongo/dbs`
  - `listCollections(db)` → `GET /api/vm/mongo/{db}/collections`
  - `browse(db, col, filter, limit, skip)` → `GET /api/vm/mongo/{db}/{col}/documents`
  - `insert(db, col, docJson)` → `POST /api/vm/mongo/{db}/{col}`
  - `delete(db, col, id)` → `DELETE /api/vm/mongo/{db}/{col}/{id}`
  - `stats()` → `GET /api/vm/mongo/stats`
- `vm-desktop.ts` → `app-vm-desktop`. Windows XP desktop simulation (see [[Frontend-Architecture]] VM Desktop section).

## Auth (`auth/`)
- `login/login.ts` — split-screen login; handles `SUCCESS`/`PASSWORD_CHANGE_REQUIRED`/`EMAIL_VERIFICATION_REQUIRED` statuses
- `first-login/first-login.ts` — force-change password flow
- `reset-password/reset-password.ts` — 3-step OTP (email → verify OTP → new password)

## Errors (`errors/`)
- `not-found/not-found.ts` → 404 page
- `server-error/server-error.ts` → 500 page

## Role: admin (PLATFORM_ADMIN) — `roles/admin/`
- `layout/admin-layout.ts` — nav: Dashboard, Users, Roles & Permissions, System Health, API Metrics. Accent `#c7000b`.
- `dashboard/admin-dashboard.ts` — live from `/api/users`: 4 stat cards, user-growth curve, users-by-status donut, recent-users table
- `users/users.ts` — live: searchable table + create modal + delete + admin-reset + pagination (10/page)
- `roles/roles.ts` — static Keycloak mirror: role profile cards + 16×4 permission matrix + detail popup
- `monitoring/monitoring.ts` — System Health: service health (direct actuator), live JVM metrics (gateway `/actuator/metrics/*`), link cards (Grafana/Prometheus/Eureka/Swagger/Keycloak)
- `metrics/metrics.ts` — API Metrics: polls `GET /api/metrics/overview` every 5s → KPI cards + bar/donut charts + endpoint table

## Role: network-operator (NETWORK_OPERATOR) — `roles/network-operator/`
- `layout/operator-layout.ts` — nav: Dashboard, Network Functions, Core Config, 5G Core, 5GC Topology, VM. Accent `#3491fa`.
- `dashboard/operator-dashboard.ts` — mock: NF health stats, throughput line, NF-status donut, sessions bar, NF table
- `network-functions/network-functions.ts` — **live** from `/api/5gc/*`: NF card grid (SVG icon per NF, UP/DOWN badge), 4 stat cards, subscriber table, UE context table
- `core-config/core-config.ts` — **live** from `/api/5gc/network-config`: shimmer skeleton on load, slices table (read-only), inline-editable QoS rows (5QI, AMBR up/down), inline-editable PLMN fields, Apply button → `PUT /api/5gc/network-config`, shows "X of Y subscribers updated"
- `fivegc/fivegc-dashboard.ts` — shared with security analyst (same component)
- `fivegc/fivegc-topology.ts` — network topology view
- `vm` → lazy-loads `shared/vm/vm-desktop.ts`

## Role: security-analyst (SECURITY_ANALYST) — `roles/security-analyst/`
- `layout/security-layout.ts` — nav: Dashboard, Security Alerts, Roaming (group), Detection Rules, Rate Limiting, 5G Core, 5GC Topology. Accent `#00a870`.
- `dashboard/security-dashboard.ts` — *(mock)* alert stats, alerts-over-time line, severity donut, attack-category bar
- `security-alerts/security-alerts.ts` — *(mock)* tabbed table
- `detection-rules/detection-rules.ts` — *(mock)* rules table with toggles
- `rate-limiting/rate-limiting.ts` — **live** → `/api/protection/*`: stats KPIs (5s poll), policies table + CRUD (gated on `hasPermission('detection-rules:write')`), decision tester (Send 1 / Burst ×20)
- `roaming/roaming.service.ts` — typed client for all 13 `/api/roaming/*` endpoints
- `roaming/roaming-overview.ts` — summary + live + forecast charts
- `roaming/roaming-events-page.ts` — filters + top-partners bar + events table + detail
- `roaming/roaming-anomalies.ts` — severity cards + anomaly score bar + severity donut + table
- `roaming/roaming-partners.ts` — avg-risk bar + peak-risk donut + table
- `roaming/roaming-qos.ts` — QoS gauge + KPI cards + experience-score bar + table
- `roaming/roaming-kpis.ts` — KPIs + SLA + IREG Synthetic Test panel (summary cards, transaction-type badges, pass/fail chips)
- `roaming/roaming-revenue.ts` — revenue KPIs + bar + donut + margin gauge + optimization table
- `roaming/roaming-tools.ts` — CSV upload (`/upload`) + Simulate (`/simulate`)
- `fivegc/fivegc-dashboard.ts` — **live** from `/api/5gc/*`: NF health pills, stat cards, UE context table, subscriber list
- `fivegc/fivegc-topology.ts` — network topology view
- `vm` → lazy-loads `shared/vm/vm-desktop.ts`

## Role: auditor (AUDITOR) — `roles/auditor/`
- `layout/auditor-layout.ts` — nav: Dashboard, Audit Logs. Accent `#ff8f1f`.
- `dashboard/auditor-dashboard.ts` — *(mock)* audit stats, events bar, outcome donut, actors table
- `audit-logs/audit-logs.ts` — *(mock)* searchable/filterable immutable log table

## Messaging (all roles)
- `messaging/messages.ts` — **live** → `/api/messages/*`: conversation list + chat thread + compose + live user-search dropdown (from `/api/users/directory`). 8s polling.
- `core/messages.service.ts` — client + `unread` signal (polls `/unread-count`)
- `core/notifications.service.ts` — WebSocket client to `/ws/notifications?token=`, `items` + `unread` signals; role-shell bell + dropdown

## Root
- `app.ts` — `<router-outlet />` only
- `app.routes.ts` — all lazy routes
- `app.config.ts` — providers: global error listeners + `provideRouter(routes)`
- `core/i18n.service.ts` — `lang` signal `'en'|'zh'`, `toggle()`, `t(key)` dictionary, persists to localStorage

## Related notes
- [[Frontend-Architecture]]
- [[Roles-and-Permissions]]
- [[All-Endpoints]]
