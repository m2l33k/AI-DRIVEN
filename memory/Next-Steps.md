---
title: Next Steps
tags: [todo, backlog]
updated: 2026-08-10
---

# Next Steps

Open threads and backlog. Check items off / move them to [[Session-Log]] when done.

## Immediate (user's hands)
- [x] Commit the staged `Frontend/` on `main` (user commits themselves — see [[Git-Workflow-and-History]]).
- [x] Remove `.github/workflows/` on `main` (`git rm -r .github/workflows`), then commit.

## Frontend — integration
- [x] Real login via `/api/auth/login` (3-status flow) + first-login + OTP reset (2026-08-08).
- [x] Per-role route guards (`authGuard` + `roleGuard`) on `/admin /operator /security /audit`.
- [x] Admin **Users** page wired to `/api/users` (list/create/delete/reset + pagination); logout clears session.
- [x] **Admin dashboard** live from `/api/users` (stat cards + user-growth curve + status donut).
- [x] **Glassmorphism sidebar** redesign (crimson theme, sections, profile, 3 responsive states).
- [x] **Roles & Permissions** page mirrors Keycloak (profile cards + matrix + detail popup).
- [x] **System Health** (health + live JVM) + **API Metrics** (Prometheus request analytics: cards +
      bar/donut charts) pages; gateway `GET /api/metrics/overview`. Removed `admin/platform-config`.
- [x] **Prometheus scraping for local runs:** `docker/prometheus/prometheus.yml` already targets
      `host.docker.internal` for gateway/eureka/auth; added roaming (9002).
- [ ] Wire the remaining **data pages** to gateway APIs (NFs, security alerts, roaming events —
      `/api/roaming/*`, audit logs, core config).
- [ ] Global HTTP error handling → route to `/error/500`; 404 already handled by `**`.
- [ ] Optional: token refresh using the stored `refresh_token`.

## Frontend — polish (optional)
- [ ] Responsive pass on tables for small screens.
- [ ] Loading / empty / error states once data is real.
- [ ] i18n (login already hints at en/fr/ar).

## Auth Service (see [[Auth-Service]])
- [x] Wire **Keycloak realm SMTP** to the same Gmail (realm JSON `smtpServer` + compose `KC_SMTP_*`
      + `keycloak/configure-smtp.ps1` for live instances). ← still: run it + test delivery.
- [ ] Move in-memory OTP / reset-token / first-login-token stores to **Redis** if multi-instance.
- [ ] Wire the Angular **login / reset-password / first-login** screens to the new endpoints
      (handle the 3 `LoginResponse.status` cases).
- [ ] Decide whether created users verify email via Keycloak's link or a custom flow.

## Roaming Analysis Service (see [[Roaming-Analysis-Service]])
- [x] Replace in-memory repo with JPA + **MySQL** (`roaming-mysql` :3307), seeded on first start.
- [ ] Wire the frontend Roaming Events page to `/api/roaming/*` (esp. `/live`, `/anomalies`, `/forecast`).
- [ ] Swap heuristics for real ML (forecast, anomaly detection).
- [ ] Add integration tests once the project reintroduces a test strategy.

## New placeholder services (see [[Platform-Services]])
Currently health-check only, but each now has its **own Postgres** (anomaly/ratelimit/tracing/
fault, 5433–5436) and Redis where needed (anomaly 6380, ratelimit 6379) — ADR-09. Give each real
logic + a `SecurityConfig` (copy roaming's) and move its route off the public whitelist when
protected endpoints land.
- [ ] Wire the new Postgres/Redis into **Kubernetes** (StatefulSets + datasource env in the
      deployment manifests) — currently docker-compose only.
- [ ] **anomaly-detection-service** (9003) — real-time anomaly detection; likely centralises the
      roaming service's heuristic `/anomalies` and swaps in ML.
- [ ] **rate-limiting-service** (9004) — throttling / abuse protection (Redis token bucket; could
      back gateway rate-limit filters).
- [ ] **distributed-tracing-service** (9005) — decide: add a real **Jaeger** container to
      `docker-compose-observability.yml` (OTLP sink, augment/replace Tempo) or drop the placeholder.
      See ADR-01 in [[Architecture-Decisions]].
- [ ] **fault-injection-service** (9006) — chaos testing (latency/errors/NF outages).

## Docs / memory
- [ ] Regenerate `Noted/diagram/` PlantUML + images to include the 4 new services (9003–9006).
      See [[Diagrams]].

## Related notes
- [[Frontend-Architecture]]
- [[Session-Log]]
