---
title: Next Steps
tags: [todo, backlog]
updated: 2026-08-15
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
- [x] **Roaming** wired to `/api/roaming/*` — sidebar group, 7 sub-pages, all 13 endpoints incl.
      `/upload` + `/simulate`; new `hw-gauge-chart` + nested-menu `NavItem` (2026-08-15).
- [x] **Rate Limiting** page wired to `/api/protection/*` — stats + policy CRUD (gated on
      `detection-rules:write` via `hasPermission`) + decision tester (2026-08-15).
- [ ] Wire the remaining **mock data pages** to gateway APIs (NFs, security alerts, detection rules,
      audit logs, core config, security dashboard).
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
- [x] **REDESIGN Phase 1 (2026-08-14):** real `Data/Data/` dataset model — 6 JPA entities +
      repos + `CsvDataLoader` (OpenCSV). Additive; build green.
- [ ] **REDESIGN Phase 2:** rewrite `RiskAnalyzer` + re-point every endpoint to real aggregates
      (fraud_flag, auth-failure bursts, impossible travel, QoS, margin/settlement).
- [ ] **REDESIGN Phase 3:** add `/fraud`, `/handovers`, `/settlement`, `/attach`; delete the
      synthetic `RoamingEvent` + seeder.
- [x] Wire the frontend to `/api/roaming/*` — **Roaming** sidebar group + 7 sub-pages (2026-08-15).
- [x] **CSV analysis (`/upload`), simulation (`/simulate`), stronger anomaly detection**
      (`AnomalyDetector` z-scores) — 2026-08-15. See [[Roaming-Analysis-Service]].
- [ ] Swap heuristics for real ML (forecast, anomaly detection) — `AnomalyDetector` is the seam.
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
- [x] **rate-limiting-service** (9004) — **Role A done + image built (2026-08-14):** Redis
      token-bucket limiter (`/api/protection/check|policies|stats`), atomic Lua, JWT-guarded.
      Reuses `roaming-events:read` / `detection-rules:write` → **no Keycloak change**. Image
      `docker-rate-limiting-service:latest`. See [[Platform-Services]].
      - [x] Fixed the Swagger Authorize scheme + the `PUT /policies` 400 (entity→DTO); frontend page live.
      - [~] **Gateway enforcement tried & REVERTED (2026-08-15):** `RateLimitGlobalFilter` slowed the
            hot path (per-request call to a maybe-down service). Removed (ADR-11 retired). If
            revisited: opt-in + timeout + fail-open, or run the bucket in-gateway against Redis.
      - [ ] Role B: attach-flood detection over roaming `attach_events` + persist `BlockEvent`s.
      - [ ] Runtime smoke test: `./infra.sh up` then `up -d rate-limiting-service`; token as
            `analyst-user`, hit `/api/protection/*` + hammer a downstream route to see 429s + stats.
- [ ] **distributed-tracing-service** (9005) — decide: add a real **Jaeger** container to
      `docker-compose-observability.yml` (OTLP sink, augment/replace Tempo) or drop the placeholder.
      See ADR-01 in [[Architecture-Decisions]].
- [ ] **fault-injection-service** (9006) — chaos testing (latency/errors/NF outages).

## 5GC Core — free5GC integration (see [[5GC-Core]], ADR-13) — NEW 2026-08-15
Decision made: adopt **free5GC** + **UERANSIM**; this repo stays the harness. Not started.
- [ ] Provision **Ubuntu VM / WSL2** with the **`gtp5g` kernel module** (build vs kernel headers;
      verify `lsmod | grep gtp5g`). ⚠️ free5GC UPF won't run without it — no bare Windows/mac Docker.
- [ ] Bring up `free5gc/free5gc-compose` (NFs + MongoDB + WebConsole); register a UERANSIM gNB/UE;
      confirm baseline **Initial Registration + PDU session** before adding anything.
- [ ] Point Prometheus at free5GC NF metrics; add Grafana NF-KPI panels.
- [ ] Wire the operator **Network Functions** page to real NF status (NRF `nf-instances` or a small
      `/api/nf/*` Java facade).
- [ ] Layer 01: enable free5GC SBI TLS + NRF OAuth2 (SEC-01/02) + mesh/Cilium mTLS between NFs.
- [ ] Layer 02: stream free5GC signalling into anomaly-detection-service (9003) + reuse roaming
      `AnomalyDetector`; UERANSIM attack scripts (SEC-03).
- [ ] Layer 03: scenario runner (TC-01→PERF-02) + fault-injection-service cases.

## Scripts / tooling (see [[Scripts-and-Tooling]])
- [ ] Update `run.sh` (local-JAR path), `build-images.sh`, and the `Tiltfile` to also launch
      **roaming (9002)** + the four placeholders (9003–9006) — currently eureka+gateway+auth only.
- [ ] Refresh `infra.sh`'s header comment + `urls` output for the new DBs (keycloak/roaming/
      per-service Postgres + Redis) — the compose files are current, the printout isn't.

## Docs / memory
- [ ] Regenerate `Noted/diagram/` PlantUML + images to include the 4 new services (9003–9006).
      See [[Diagrams]].
- [ ] `.gitignore` or remove the personal CV files in `Noted/Assets/` (untracked, not project
      artefacts). See [[Git-Workflow-and-History]].

## Related notes
- [[Frontend-Architecture]]
- [[Scripts-and-Tooling]]
- [[Session-Log]]
