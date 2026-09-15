---
title: Frontend Architecture
tags: [frontend, angular, architecture]
updated: 2026-09-15
---

# Frontend Architecture

The Angular console lives in `Frontend/`. All major role pages are now wired to real backend APIs.

## Stack
- **Angular 22** (standalone components, no NgModules)
- **Signals** for state (`signal`, `computed`, `input()`)
- **Lazy-loaded routes** (`loadComponent`)
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
No external chart library. Five reusable SVG components in `shared/charts/`.
See [[Frontend-Components]].

## Folder structure
```
Frontend/src/app/
├── shared/
│   ├── charts/   line-chart · bar-chart · donut-chart · gauge-chart · multi-line-chart
│   ├── ui/       stat-card · page-header · async-state
│   ├── layout/   role-shell.ts (config-driven sidebar + topbar; nested submenus; i18n; FAB)
│   ├── fivegc/   fivegc.service.ts (FiveGcService — NF status, subscribers, UE contexts,
│   │             network-config read/write, network topology)
│   └── vm/       vm.service.ts (VmService — MongoDB console API)
│                 vm-desktop.ts (Windows XP desktop simulation — login→boot→desktop phases)
├── auth/         login/ · reset-password/ · first-login/
├── messaging/    messages.ts (direct-message page, shared by all roles)
├── errors/       not-found/ · server-error/
└── roles/
    ├── admin/               dashboard · users · roles · monitoring · metrics
    ├── network-operator/    dashboard · network-functions · core-config · 5gc · 5gc-topology · vm
    ├── security-analyst/    dashboard · security-alerts · detection-rules · rate-limiting ·
    │                        roaming/ (overview · events · anomalies · partners · qos · kpis · revenue · tools)
    │                        fivegc/ (fivegc-dashboard · fivegc-topology)
    └── auditor/             dashboard · audit-logs
```

## Routing (`src/app/app.routes.ts`, all lazy)
| Path | Console |
|------|---------|
| `/login`, `/reset-password`, `/first-login` | Auth |
| `/admin/**` | PLATFORM_ADMIN |
| `/operator/**` | NETWORK_OPERATOR |
| `/security/**` | SECURITY_ANALYST |
| `/audit/**` | AUDITOR |
| `/error/500` | 500 page |
| `**` | 404 |

**Role child routes:**

| Role prefix | Child routes |
|-------------|-------------|
| `/admin/` | `dashboard`, `users`, `roles`, `monitoring`, `metrics`, `messages` |
| `/operator/` | `dashboard`, `network-functions`, `core-config`, `5gc`, `5gc-topology`, `messages`, `vm` |
| `/security/` | `dashboard`, `security-alerts`, `detection-rules`, `rate-limiting`, `5gc`, `5gc-topology`, `roaming/overview`, `roaming/events`, `roaming/anomalies`, `roaming/partners`, `roaming/qos`, `roaming/kpis`, `roaming/revenue`, `roaming/tools`, `messages`, `vm` |
| `/audit/` | `dashboard`, `audit-logs`, `messages` |

## Messages FAB
Messages was converted from a sidebar nav item to a **floating action button (FAB)** fixed at `bottom: 28px; right: 28px` of the `.main` container. Shows unread badge (capped at `9+`). Backed by `messages.service.ts` `unread` signal. Defined in `role-shell.ts`.

## VM Desktop (`shared/vm/vm-desktop.ts`)
Full Windows XP simulation rendered inside the content panel (not full-screen). Three phases:
1. **Login** — dark blue XP login screen, 4-color flag SVG, user cards (Operator/Admin)
2. **Boot** — black screen, XP progress bar (random increments via `setInterval`), auto-advances
3. **Desktop** — Bliss wallpaper, taskbar, Start menu, draggable **Huawei HLS** window

**HLS window** = MongoDB explorer: DB tree (left), document browser (right) with filter, insert, paginate, delete. Calls `VmService` → `/api/vm/mongo/**` → fivegc-service → MongoDB `localhost:27017`.

`:host` uses `position: absolute; inset: 0` — fills the `.content` panel (which has `position: relative`) without bleeding into the sidebar.

## Commands
```powershell
cd Frontend
npm start        # ng serve → http://localhost:4200
npm run build    # production build
```

## Backend proxy (`proxy.conf.json`)
| Path | Target |
|------|--------|
| `/api/**` | `http://localhost:9000` (gateway) |
| `/actuator/**` | `http://localhost:9000` |
| `/ws/**` | `ws://localhost:9007` (messaging WebSocket) |
| `/infra-health/*` | per-service actuator health (direct, not through gateway) |

## Auth integration (`src/app/core/`)
- `auth.service.ts` — login, first-login, forgot/OTP/reset, change-password; JWT in `localStorage`; decodes realm roles → `homeRoute()`; decodes `resource_access.platform-client.roles` → `permissions` signal + `hasPermission(p)`
- `auth.interceptor.ts` — attaches `Bearer` to `/api/*` (except public paths + `/actuator`/`/infra-health`); on 401 → logout + `/login`
- `guards.ts` — `authGuard` + `roleGuard(role)`

## Related notes
- [[Frontend-Components]]
- [[Roles-and-Permissions]]
- [[All-Endpoints]]
