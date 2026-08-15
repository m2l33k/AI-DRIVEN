---
title: Frontend Architecture
tags: [frontend, angular, architecture]
updated: 2026-08-15
---

# Frontend Architecture

The Angular console lives in `Frontend/`. **Auth + user management + the Security-Analyst Roaming
and Rate Limiting pages are wired to the backend** via the gateway (see below); the remaining role
data pages are still mock.

## Stack
- **Angular 22** (standalone components, no NgModules)
- **Signals** for state (`signal`, `computed`, `input()`)
- **Lazy-loaded routes** (`loadComponent`)
- **Vitest** test runner (currently no tests — removed)
- Build system: `@angular/build:application`

## Design system — "Huawei console" look
Defined in `src/styles.css` as CSS custom properties + primitives.
- **Brand:** Huawei red `#c7000b` (hover `#e60012`)
- **Canvas:** light gray `#f2f3f5`; **cards:** white; **borders:** `#e5e6eb`
- **Chart palette:** `--hw-chart-1..5` (red, blue, green, orange, purple)
- **Primitives:** `.hw-btn` / `.hw-btn--primary`, `.hw-input`, `.hw-card`
- **Layout tokens:** `--hw-sidebar-w: 232px`, `--hw-header-h: 56px`
- **Font:** HarmonyOS Sans → Segoe UI → system fallback

## Charts — custom, dependency-free
No external chart library. Three reusable SVG components in `shared/charts/`
(scale to container via fixed viewBox). Keeps the bundle small (~236 kB initial).
See [[Frontend-Components]].

## Folder structure
```
Frontend/src/app/
├── shared/
│   ├── charts/   line-chart.ts · bar-chart.ts · donut-chart.ts · gauge-chart.ts
│   ├── ui/       stat-card.ts · page-header.ts
│   └── layout/   role-shell.ts   (config-driven sidebar + topbar; nested submenus)
├── auth/         login/ · reset-password/ · first-login/
├── messaging/    messages.ts   (direct-message page, shared by all roles)
├── errors/       not-found/ (404) · server-error/ (500)
└── roles/        one folder per role → layout/ + dashboard/ + feature pages
    ├── admin/               dashboard · users · roles · monitoring (System Health) · metrics (API Metrics)
    ├── network-operator/    dashboard · network-functions · core-config
    ├── security-analyst/    dashboard · security-alerts · detection-rules · rate-limiting ·
    │                        roaming/ (overview · events · anomalies · partners · qos · revenue · tools)
    └── auditor/             dashboard · audit-logs
```

### Why this structure
- **One folder per Keycloak role** (see [[Roles-and-Permissions]]); each owns its layout,
  dashboard, and permission-matched feature pages.
- **`auth/` and `errors/` are shared, not duplicated per role** — one login routes users to
  the right console. Duplicating login 4× would be an anti-pattern.

## Routing (`src/app/app.routes.ts`, all lazy)
| Path | Console |
|------|---------|
| `/login`, `/reset-password` | Auth |
| `/admin/**` | PLATFORM_ADMIN |
| `/operator/**` | NETWORK_OPERATOR |
| `/security/**` | SECURITY_ANALYST (incl. `rate-limiting`, `roaming/{overview,events,anomalies,partners,qos,revenue,tools}`) |
| `/audit/**` | AUDITOR |
| `/error/500` | 500 page |
| `**` | 404 |

`/` → redirects to `/login`. Each role root redirects to its `dashboard`. A **`messages`** child
route exists under all four role trees (`/{role}/messages`) — the shared DM page; the shell's
"Messages" item links to it relatively.

## Conventions
- Components use **inline `template` + `styles`** (kept file count manageable).
- Root `app.ts` is just `<router-outlet />`.
- Each role's `*-layout.ts` is a thin wrapper over `shared/layout/role-shell`, passing
  `brand`, `roleName`, `accent`, `userName`, `navItems`.

## Commands
```powershell
cd Frontend
npm start        # ng serve → http://localhost:4200
npm run build    # production build (verified clean)
```

## Backend integration (2026-08-08)
- **Dev proxy:** `Frontend/proxy.conf.json` maps `/api` → `http://localhost:9000` (gateway),
  wired via `angular.json` serve `proxyConfig` — avoids CORS from `:4200`. All calls use `/api/...`.
- **`src/app/core/`:**
  - `auth.service.ts` — login (3 statuses), first-login change, forgot/verify-otp/reset,
    change-password; stores JWT in `localStorage`; decodes `realm_access.roles` → `homeRoute()`.
  - `auth.interceptor.ts` — attaches `Bearer` to `/api/*` except public auth paths (avoids the
    stale-token 401 gotcha); on 401 → logout + `/login`.
  - `guards.ts` — `authGuard` + `roleGuard(role)`; applied to `/admin /operator /security /audit`.
  - `users.service.ts` — list/create/delete/admin-reset against `/api/users`.
  - `models.ts` — `LoginResponse`, `UserSummary`, `CreateUserRequest`, `CurrentUser`
    (`CurrentUser.permissions` added 2026-08-15).
  - **Permission-aware (2026-08-15):** `auth.service` also decodes
    `resource_access.platform-client.roles` → `permissions` signal + `hasPermission(p)` (mirrors the
    backend `PERM_*`). Used to gate write UI (e.g. rate-limit policy CRUD needs `detection-rules:write`).
- **Screens wired:** `login` (real auth, routes by role; PASSWORD_CHANGE → `/first-login`;
  EMAIL_VERIFICATION → message), new `auth/first-login/`, `reset-password` (3-step OTP:
  email → otp → new password), `roles/admin/users/` (live table + create modal + reset + delete
  + client-side pagination 10/page), `role-shell` logout now clears the session.
- Full auth API contract in [[Auth-Service]]. `npm run build` → clean.

## UI redesign (2026-08-08)
- **Glassmorphism sidebar** (`shared/layout/role-shell`): floating translucent glass panel over a
  soft red canvas, **crimson theme** (`#c11536 → #8a0f2a`, via local `--crimson` vars — overrides the
  per-role accent for the sidebar chrome; role identity still shows in the topbar badge). Sections
  **Main** (route nav) + **Account** (Notifications/Messages badges, Change password), bottom **user
  profile** (avatar/name/email/three-dot → change pw / sign out). Brand = **5GC**; Feather search
  icon. Three states: expanded / collapsed (76px) / mobile overlay (≤860px, floating + scrim). The
  self-service **change-password modal** (`PUT /api/auth/password`) lives here for all roles.
- **`shared/ui/page-header`**: clickable **Home › <page>** breadcrumb (Home → `auth.homeRoute()`).
- **`roles/admin/roles`**: static Keycloak mirror — role **profile cards** (image banner + avatar),
  16×4 **permission matrix** (computed from role data), per-role **detail popup**.
- **`roles/admin/monitoring`** ("System Health"): three data sources —
  (1) **service health** via `proxy.conf.json` `/infra-health/*` → each service's `:port/actuator/health`;
  (2) **live gateway JVM metrics** polled every 3s from `/actuator/metrics/*` (proxy `/actuator` →
  `:9000`) → KPI cards + CPU/heap/request-rate curves;
  (3) **request metrics** from the new gateway endpoint **`GET /api/metrics/overview`** (Prometheus-
  backed) → Total requests, RPS, exceptions, %2xx/%5xx, requests-by-URI + avg-duration tables.
  Plus link cards to Grafana (3000)/Prometheus (9090)/Eureka (8761)/Tempo/Loki/Swagger/Keycloak/Actuator.
  New admin nav item **System Health**. (An embedded-Grafana iframe was tried then removed — the app
  runs locally, Grafana is Docker.) `auth.interceptor` skips bearer for `/actuator` + `/infra-health`.
- **`roles/admin/metrics`** ("API Metrics", nav item): polls `GET /api/metrics/overview` every 5s →
  KPI cards (total req, req/s, 2xx%, 5xx%, exceptions) + **bar chart** top endpoints by requests +
  **donut** status mix (2xx/5xx/other) + **bar chart** slowest endpoints + endpoints table. The
  request-metrics were moved here from System Health to keep that page = health + live JVM.
  Prometheus scrapes host apps via `host.docker.internal` (`docker/prometheus/prometheus.yml`,
  gateway/eureka/auth/roaming) — so this works while services run locally.
- **Removed** the `admin/platform-config` page + route + nav item (unused placeholder).
- **`roles/admin/dashboard`**: live from `GET /api/users` — stat cards (Total / New this month /
  Active / Active rate), **user-growth curve** (cumulative by month from `createdTimestamp`),
  Users-by-status donut, recent-users table. `shared/charts/line-chart` gained a `[smooth]`
  (Catmull-Rom) curve option. `anyComponentStyle` budget raised in `angular.json`.

## Security-Analyst: Rate Limiting + Roaming wired (2026-08-15)
- **Nested sidebar menus:** `NavItem` gained optional `children`; `RoleShell` renders expandable
  groups (see [[Frontend-Components]]). Security nav is now Dashboard · Security Alerts · **Roaming**
  (group) · Detection Rules · Rate Limiting.
- **New chart:** `hw-gauge-chart` (270° radial 0-100, auto-graded) — 4th chart type.
- **Rate Limiting** page (`security-analyst/rate-limiting/`) → live `/api/protection/*`: stats KPIs,
  policy table + **CRUD gated on `hasPermission('detection-rules:write')`**, decision tester
  (Send 1 / Burst ×20). Route `security/rate-limiting`.
- **Roaming** group (`security-analyst/roaming/`) → live `/api/roaming/*` via a typed
  `roaming.service.ts` (all 13 endpoints). 7 lazy sub-pages under `security/roaming/*`
  (`roaming` → `overview`): Overview, Events, Anomalies, Partners, QoS & Experience, Revenue, Tools
  — each rich with line/bar/donut/gauge charts. Replaces the old single mock `roaming-events` page.
- `ng build` (dev) → clean; all roaming + rate-limiting chunks emitted.

## Integration TODO (remaining)
- Remaining **mock** pages: security dashboard, security-alerts, detection-rules; operator NFs +
  core-config; auditor logs; admin misc. (Roaming + Rate Limiting are now **live**.)
- Global HTTP error handling → route to `/error/500` (404 already handled by `**`).
- Main nav icons are still filled glyphs (chrome icons are line-style); optional: convert them.
- Optional: real "Users by role" needs backend role data (see [[Auth-Service]] TODO).

## Related notes
- [[Frontend-Components]]
- [[Roles-and-Permissions]]
