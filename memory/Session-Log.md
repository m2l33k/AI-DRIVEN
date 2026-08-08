---
title: Session Log
tags: [log, journal]
updated: 2026-08-08
---

# Session Log

Chronological record of what we did. Newest first. Add an entry whenever you finish
something meaningful.

## 2026-08-08

### Admin monitoring + gateway metrics endpoint (detail: [[Frontend-Architecture]] · [[Backend-and-Infra]])
- New admin **System Health** page (`roles/admin/monitoring`): service health (`/infra-health/*`
  dev-proxy → `:port/actuator/health`), **live gateway JVM metrics** (poll `/actuator/metrics/*`,
  proxy `/actuator` → :9000; KPI cards + CPU/heap/request-rate curves via new `line-chart [smooth]`),
  and **request metrics** from a new gateway endpoint. Tool link cards to Grafana/Prometheus/Eureka/
  Tempo/Loki/Swagger/Keycloak/Actuator.
- **Gateway endpoint `GET /api/metrics/overview`** (`gateway-service/web/MetricsController`): reactive
  `WebClient.create` → Prometheus `/api/v1/query` (PromQL on `http_server_requests_seconds_*`, `jvm_*`,
  `process_*`); returns totalRequests, RPS, exceptions, %2xx/%5xx, requests-by-URI, avg-duration, JVM.
  Config `prometheus.base-url` (local `:9090` / docker `prometheus:9090`). Secured `PERM_platform-config:read`
  at the gateway. Gotcha: use `WebClient.create(...)` — no `WebClient.Builder` bean in this gateway.
- Tried embedding Grafana (iframe + `GF_SECURITY_ALLOW_EMBEDDING`) then **removed** it (app runs local,
  Grafana is Docker). **Removed** `admin/platform-config` page/route/nav.
- Added new **API Metrics** page (`roles/admin/metrics`, nav item): polls `/api/metrics/overview` (5s)
  → KPI cards + bar chart (top endpoints) + donut (2xx/5xx/other) + bar chart (slowest) + table.
  Moved the request-metrics out of System Health (now health + live JVM only).
- `docker/prometheus/prometheus.yml` already scrapes host via `host.docker.internal` (gateway/eureka/
  auth); added **roaming (9002)**. So metrics flow while services run locally.

### Frontend — glass sidebar, roles page, real admin dashboard (detail: [[Frontend-Architecture]])
- **Glassmorphism sidebar** (`shared/layout/role-shell`): floating translucent panel, backdrop blur,
  crimson theme (`#c11536→#8a0f2a`), Main + Account sections, notification badges, bottom user
  profile (avatar/name/email/three-dot menu), 3 states (expanded / collapsed 76px / mobile overlay).
  Brand is just **5GC**; search uses a proper magnifier icon. (Personal/Business toggle was added
  then removed per request.) Change-password modal lives here (all roles). Style budget bumped in
  `angular.json` (anyComponentStyle 12kB warn).
- **PageHeader** now shows a clickable **Home › <page>** breadcrumb (Home → `auth.homeRoute()`).
- **Admin Users** page: client-side **pagination (10/page)** + search.
- **Roles & Permissions** (`admin/roles`): static page mirroring Keycloak — **profile cards** with
  per-role images (banner + avatar), **permission matrix** (16 perms × 4 roles, computed from role
  data), and a **click-to-open detail popup** per role. Read-only (roles managed in Keycloak).
- **Admin dashboard** now **live** from `GET /api/users`: stat cards (Total, New this month, Active,
  Active rate) + **user-growth curve** (cumulative by month, from `createdTimestamp`) + Users-by-status
  donut + recent-users table. Added `[smooth]` (Catmull-Rom) option to `shared/charts/line-chart`.
- Backend: `UserSummary` gained `createdTimestamp` (mapped from Keycloak); login scope now
  `openid profile email roles` so the JWT carries `name`/`email` (shown in the shell). `npm run build`
  + `mvnw compile` → clean.

### Auth Service — own email-verification flow + realm SMTP + email-login fix (detail: [[Auth-Service]])
- **Replaced Keycloak's verify-email UI** with our own: `EmailVerificationService` issues a 24h
  single-use token (`EmailVerificationTokenService`), emails `${app.verify-email-url}?token=…`;
  `GET /api/auth/verify-email` calls `KeycloakService.markEmailVerified` (Admin API sets
  `emailVerified=true` + drops `VERIFY_EMAIL`) and renders our own confirmation page. `createUser`
  no longer calls Keycloak `send-verify-email`.
- **Keycloak realm SMTP** wired to the same Gmail (for any future Keycloak-native emails, now
  optional): `smtpServer` block in `platform-realm.json` (`${KC_SMTP_*}` placeholders),
  `docker-compose-infra.yml` passes `KC_SMTP_*` from `MAIL_*` + `--import-realm`, and live scripts
  `keycloak/configure-smtp.ps1` / `.sh` (Admin API, read `.env`). Ran the ps1 successfully.
- **Email-login fix:** `KeycloakService.userId()` now resolves by username **or** email (login
  accepts either), fixing "User not found" on first-login when signing in with an email.

### Frontend — wired auth + user management to the backend (detail: [[Frontend-Architecture]])
- Added `Frontend/proxy.conf.json` (`/api` → gateway :9000) + `angular.json` serve `proxyConfig`.
- New `src/app/core/`: `auth.service` (login 3-status, first-login, OTP reset, change-pw, JWT decode
  → roles/home route), `auth.interceptor` (bearer except public paths; 401 → logout), `guards`
  (`authGuard` + `roleGuard`), `users.service`, `models`.
- Rewrote `login` (real auth, routes by role), added `auth/first-login/`, rewrote `reset-password`
  (email → OTP → new password), rewrote admin `users` (live CRUD + reset). `role-shell` logout
  clears session. Guards on all four role route trees. `npm run build` → clean.
- Remaining: role dashboard data pages still mock (see [[Next-Steps]]).

### Auth Service — password flows + state-aware login (full detail: [[Auth-Service]])
- **Self-service reset (OTP):** `/forgot-password` (email → 6-digit OTP via Gmail SMTP),
  `/verify-otp` (→ single-use reset token), `/reset-password` (token + new permanent password).
  In-memory `OtpService` + `ResetTokenService`. Added `spring-boot-starter-mail` + `MailService`;
  `spring.mail.*` reads `MAIL_USERNAME`/`MAIL_PASSWORD` (Gmail App Password) from a gitignored
  repo-root `.env` loaded by `run.sh`; compose passes them through. `.env.example` added.
- **Create user:** no longer takes a password — generates a temporary one, sets required actions
  `[VERIFY_EMAIL, UPDATE_PASSWORD]`, calls Keycloak `send-verify-email` (non-fatal), emails the
  temp password. Admin direct reset moved to `POST /api/users/{username}/reset-password`.
- **State-aware login:** `/login` now returns `LoginResponse.status` = `SUCCESS` (with tokens) /
  `EMAIL_VERIFICATION_REQUIRED` / `PASSWORD_CHANGE_REQUIRED` (+ `firstLoginToken`). New
  `AuthService` interprets Keycloak's "Account is not fully set up" via `UserState` (Admin API).
  New `/first-login/change-password` (token + newPassword) sets a permanent password and clears
  `UPDATE_PASSWORD`. New `FirstLoginTokenService`.
- **Security wiring:** whitelisted the new public paths in **both** the gateway
  (`gateway-service` WebFlux `SecurityConfig`) and auth-service `SecurityConfig`. Learned the
  gateway 401 gotcha (public path must be permitted at the gateway too; stale Swagger token also
  causes 401 on permitAll paths).
- Verified: `mvnw -pl microservices/auth-service,spring-cloud/gateway-service compile` → success.

## 2026-08-07

### Roaming Analysis Service (backend)
- Built `microservices/roaming-analysis-service` (port 9002) mirroring `auth-service`
  conventions: resource server, `PERM_roaming-events:read`, actuator/prometheus, eureka,
  springdoc, Dockerfile + k8s manifests.
- Domain/repo/analysis/service/web layers; in-memory seeded events + `RiskAnalyzer` scoring.
- API: `/api/roaming/events`, `/events/{id}`, `/summary`, `/partners`.
- Registered module in root `pom.xml`; added gateway routes (default + docker) + Swagger entry.
- Verified: `mvnw -pl microservices/roaming-analysis-service compile` → success.
- Full detail: [[Roaming-Analysis-Service]].

### Memory vault created
- Created this `memory/` folder as an **Obsidian vault** with detailed notes:
  [[README]], [[Project-Overview]], [[Roles-and-Permissions]], [[Frontend-Architecture]],
  [[Frontend-Components]], [[Backend-and-Infra]], [[Git-Workflow-and-History]],
  [[Session-Log]], [[Next-Steps]].
- (A short root pointer `PROJECT_MEMORY.md` also exists at the repo root.)

### Frontend build — role-based 5GC console
- Discovered the 4 Keycloak roles from `keycloak/platform-realm.json` (see [[Roles-and-Permissions]]).
- Built a Huawei-console-styled Angular 22 app in `Frontend/`:
  design system in `styles.css`; dependency-free SVG charts; reusable `role-shell`;
  shared `auth/` (login + reset-password) and `errors/` (404 + 500); one folder per role
  with layout + dashboard + feature pages. Full detail in [[Frontend-Components]].
- Wired lazy routes in `app.routes.ts`; simplified root `app.ts` to `<router-outlet/>`.
- `npm run build` → clean, ~236 kB initial bundle.

### Git housekeeping
- Removed unit tests + `.github/workflows/` (GitHub Actions). Kept `dependabot.yml`.
- Frontend was committed on `fix/ci-trivy-tag-and-code-scanning`; then staged onto `main`
  via `git checkout fix/... -- Frontend/` (not committed — user commits themselves).
- Added `Frontend/.gitignore` (Angular defaults: node_modules, dist, .angular/cache, …).
- See [[Git-Workflow-and-History]] for the full sequence.

## Related notes
- [[Next-Steps]]
