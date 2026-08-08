---
title: Frontend Architecture
tags: [frontend, angular, architecture]
updated: 2026-08-07
---

# Frontend Architecture

The Angular console lives in `Frontend/`. **Auth + user management now wired to the backend**
via the gateway (see "Backend integration" below); the role dashboards' data pages are still mock.

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
│   ├── charts/   line-chart.ts · bar-chart.ts · donut-chart.ts
│   ├── ui/       stat-card.ts · page-header.ts
│   └── layout/   role-shell.ts   (config-driven sidebar + topbar)
├── auth/         login/ · reset-password/
├── errors/       not-found/ (404) · server-error/ (500)
└── roles/        one folder per role → layout/ + dashboard/ + feature pages
    ├── admin/               dashboard · users · roles · platform-config
    ├── network-operator/    dashboard · network-functions · core-config
    ├── security-analyst/    dashboard · security-alerts · roaming-events · detection-rules
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
| `/security/**` | SECURITY_ANALYST |
| `/audit/**` | AUDITOR |
| `/error/500` | 500 page |
| `**` | 404 |

`/` → redirects to `/login`. Each role root redirects to its `dashboard`.

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
  - `models.ts` — `LoginResponse`, `UserSummary`, `CreateUserRequest`, `CurrentUser`.
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
- **`roles/admin/dashboard`**: live from `GET /api/users` — stat cards (Total / New this month /
  Active / Active rate), **user-growth curve** (cumulative by month from `createdTimestamp`),
  Users-by-status donut, recent-users table. `shared/charts/line-chart` gained a `[smooth]`
  (Catmull-Rom) curve option. `anyComponentStyle` budget raised in `angular.json`.

## Integration TODO (remaining)
- Other role dashboards + **data pages** (network functions, security alerts, roaming events
  `/api/roaming/*`, audit logs, platform/core config) still render mock data.
- Main nav icons are still filled glyphs (chrome icons are line-style); optional: convert them.
- Optional: real "Users by role" needs backend role data (see [[Auth-Service]] TODO).

## Related notes
- [[Frontend-Components]]
- [[Roles-and-Permissions]]
