---
title: Frontend Components
tags: [frontend, components, reference]
updated: 2026-08-15
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
| `gauge-chart.ts` | `hw-gauge-chart` | `value`, `max`, `label`, `color`, `higherIsBetter`, `ariaLabel` | **2026-08-15** — 270° radial 0-100 gauge; auto-grades red→amber→green (invert with `higherIsBetter=false` for latency-style metrics) |

## Shared — UI (`shared/ui/`)
| File | Selector | Inputs |
|------|----------|--------|
| `stat-card.ts` | `hw-stat-card` | `label`, `value`, `unit`, `accent`, `delta:number\|null`, `deltaHint` — KPI card with trend arrow |
| `page-header.ts` | `hw-page-header` | `title`, `subtitle` + `<ng-content>` for right-side actions |
| `async-state.ts` | `hw-async-state` | **2026-08-15** — `loading`, `error`, `empty`, `loadingText`, `emptyText` + `(retry)` output. Shared loading-spinner / error-with-Retry / empty block; render above data content. Wired into all 6 roaming data pages. |

**Global CSS utilities (`src/styles.css`, 2026-08-15):** responsive tables (`@media (max-width:720px) .tbl { display:block; overflow-x:auto }` — every `.tbl` scrolls on small screens, no markup change) · `.hw-spinner` + `@keyframes hw-spin` · `.hw-state` / `.hw-state--error` for the async-state block.

## Shared — layout (`shared/layout/`)
- `role-shell.ts` → `hw-role-shell`. The reusable console chrome.
  - Inputs: `brand`, `roleName`, `accent`, `navItems:NavItem[]`, `userName`.
  - `NavItem = { label, path?, icon, children?: NavItem[] }` (icon = 24×24 SVG path data).
  - **Nested submenus (2026-08-15):** an item with `children` renders an **expandable group** —
    chevron toggle, auto-opens when a child route is active (`router.url` match), active sub-item
    highlight. Used by the security-analyst **Roaming** group. Collapsing the sidebar hides submenus.
  - Features: collapsible sidebar (signal `collapsed`), top bar with role badge,
    notifications, user avatar/initials, logout (routes to `/login`), `<router-outlet/>`.
  - **Language switcher (2026-08-15):** a flag-toggle button in the **topbar next to the notification
    bell** (EN England-flag / 中文 China-flag SVGs, shows active flag + code). Backed by
    `core/i18n.service.ts` — `lang` signal `'en'|'zh'`, `toggle()`, persists to localStorage, sets
    `<html lang>`, and **`t(key)`** with an EN→中文 dictionary. The shell **chrome IS translated**
    (all nav labels across roles, section headers, account items, role badge, Collapse/Sign out).
    ⚠️ Page-body strings (feature pages, page headers) are still English — extend by wrapping them in
    `i18n.t('…')` + adding phrases to the dict (no library needed).

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
- `layout/security-layout.ts` — nav: Dashboard, Security Alerts, **Roaming** (group), Detection
  Rules, **Rate Limiting**. Accent `#00a870`.
- `dashboard/security-dashboard.ts` — alert stats, alerts-over-time line, severity donut,
  attack-category bar, latest-critical-alerts table. *(still mock)*
- `security-alerts/security-alerts.ts` — tabbed table (All/Open/Ack/Resolved). *(still mock)*
- `detection-rules/detection-rules.ts` — rules table with enable/disable **toggle switches**. *(mock)*
- **`rate-limiting/rate-limiting.ts`** (2026-08-15, **live** → `/api/protection/*`) — `/stats` KPI
  cards (5s poll) + policies table + top-offenders + **full CRUD** (create/edit/delete) gated on
  `auth.hasPermission('detection-rules:write')` + a decision tester (**Send 1 / Burst ×20**, OK/429
  chips, immediate stats refresh). Detailed backend errors via `describeError`.
- **`roaming/` — the Roaming group (2026-08-15, live → `/api/roaming/*`)**, shared
  **`roaming.service.ts`** (typed client for all 13 endpoints + interfaces). Sub-pages (each a lazy
  route `security/roaming/<x>`, own charts):
  - `roaming-overview.ts` — summary + live + forecast: 4 stat cards, volume line, risk donut,
    direction donut, **avg-risk gauge**, forecast line, live mini-stats.
  - `roaming-events-page.ts` — filters (direction/risk/PLMN) + top-partners **bar** + events table +
    click-row **detail** (`/events/{id}`).
  - `roaming-anomalies.ts` — severity stat cards + top-anomaly-score **bar** + severity **donut** +
    table (anomalyScore, σ dev, reasons).
  - `roaming-partners.ts` — avg-risk **bar** + peak-risk **donut** + table.
  - `roaming-qos.ts` — **QoS gauge** + KPI cards + experience-score **bar** + experience table.
  - `roaming-revenue.ts` — revenue KPIs + revenue **bar** + inbound/outbound **donut** + **margin
    gauge** + optimization table.
  - `roaming-tools.ts` — **CSV upload** (`/upload` → summary + forecast line) + **Simulate**
    (`/simulate` → live snapshot).
  - (Replaced the old single mock `roaming-events/roaming-events.ts`, now deleted.)

## Role: auditor (AUDITOR) — `roles/auditor/`
- `layout/auditor-layout.ts` — nav: Dashboard, Audit Logs. Accent `#ff8f1f`.
- `dashboard/auditor-dashboard.ts` — audit stats, events-by-day bar, outcome donut,
  most-active-actors table.
- `audit-logs/audit-logs.ts` — searchable/filterable immutable log table (timestamp, actor,
  action, resource, outcome, IP).

## Messaging (all roles) — `messaging/`
- `messaging/messages.ts` → `app-messages` (2026-08-15, **live** → `/api/messages/*`). Two-pane DM
  page: conversation list (peer, last-message preview, unread badge) + chat thread (bubbles mine/
  theirs) + compose + a **live user-search dropdown** (from `/api/users/directory`). 8s polling.
  Reachable via the shell's "Messages" item (a `routerLink`, live unread badge polling
  `/unread-count`); a `messages` route is registered under **every** role tree.
- `core/messages.service.ts` — client (`conversations`, `thread`, `send`, `markRead`, `directory`) +
  `unread` signal. `core/i18n.service.ts` — language state + `t()` (see role-shell language switcher).

## Root & routing
- `app.ts` — `<router-outlet />` only.
- `app.routes.ts` — lazy routes (see [[Frontend-Architecture]] routing table).
- `app.config.ts` — providers: global error listeners + `provideRouter(routes)`.

## Related notes
- [[Frontend-Architecture]]
- [[Roles-and-Permissions]]
