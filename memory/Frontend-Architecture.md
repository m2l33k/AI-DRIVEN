---
title: Frontend Architecture
tags: [frontend, angular, architecture]
updated: 2026-08-07
---

# Frontend Architecture

The Angular console lives in `Frontend/`. **UI only for now — no backend integration.**

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

## Integration TODO
Login currently has a **demo role picker** that just navigates. Real work: Keycloak auth,
per-role route guards, API calls through the gateway. See [[Next-Steps]].

## Related notes
- [[Frontend-Components]]
- [[Roles-and-Permissions]]
