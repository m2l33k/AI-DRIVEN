---
title: Next Steps
tags: [todo, backlog]
updated: 2026-09-10
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
- [x] **Messages page** — wired to `/api/messages/*` (conversation list + thread + compose + live
      user-search dropdown + live unread badge). Added `GET /api/users/directory` (any authenticated
      user) for the recipient search. Done 2026-08-15. See [[Messaging-Service]].
- [ ] Global HTTP error handling → route to `/error/500`; 404 already handled by `**`.
- [ ] Optional: token refresh using the stored `refresh_token`.

## Frontend — polish (optional)
- [x] Responsive pass on tables for small screens.
- [x] Loading / empty / error states once data is real.
- [x] i18n (login already hints at en/fr/ch).

## Auth Service (see [[Auth-Service]])
- [x] Wire **Keycloak realm SMTP** to the same Gmail (realm JSON `smtpServer` + compose `KC_SMTP_*`
      + `keycloak/configure-smtp.ps1` for live instances). ← still: run it + test delivery.
- [ ] Move in-memory OTP / reset-token / first-login-token stores to **Redis** if multi-instance.
- [x] Wire the Angular **login / reset-password / first-login** screens to the new endpoints
      (handle the 3 `LoginResponse.status` cases). **Done (2026-08-08)** — `login.ts` switches on
      `res.status` (SUCCESS→homeRoute, PASSWORD_CHANGE_REQUIRED→`/first-login`,
      EMAIL_VERIFICATION_REQUIRED→banner); `first-login.ts` → `firstLoginChangePassword`;
      `reset-password.ts` → 3-step OTP (`forgotPassword`→`verifyOtp`→`resetPassword`). Duplicate of
      the checked item in *Frontend — integration*.
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

## 5GC Core — free5GC integration (see [[5GC-Core]] for the full plan · ADR-13) — PHASE 0-1 DONE 2026-09-10

**Phase 0 — Host & baseline:**
- [x] `free5gc-compose` cloned to `E:/My-project/free5gc-compose` (v4.2.3)
- [x] `docker/docker-compose-5gc.yml` wired; Windows mode (no UPF) working
- [x] `infra.sh` updated: `./infra.sh up --5gc`, `./infra.sh 5gc up/down/status`
- [ ] Provision a subscriber in WebConsole (IMSI, key/OPc) — still TODO
- [ ] UERANSIM full test (needs Linux + UPF) — still TODO

**Phase 1 — Observe (NF facade + dashboards):**
- [x] free5GC metric endpoints in Prometheus (19001–19008, `free5gc="true"` labels)
- [x] NF config patched for `enable: true` + `bindingIPv4: 0.0.0.0`
- [x] Grafana dashboard `free5gc-5g-core.json` (NF health, SBI traffic, latency, errors, Loki logs)
- [x] Backend proxy: `Free5gcService` + `Free5gcController` + `NfStatusDto` in roaming-analysis-service
- [x] Angular: Security Analyst `/security/5gc` + Network Operator `/operator/network-functions`
- [x] NF logs → Loki via fluentd driver (`free5gc.*` tags)
- [ ] cAdvisor + node-exporter for container CPU/mem/net (TODO)
- [ ] Real NRF facade (`nnrf-nfm/v1/nf-instances`) — current impl uses WebConsole reachability proxy only

**Phase 2 — Zero-Trust (Layer 01 / SEC-01/02):**
- [ ] Enable free5GC **SBI TLS + NRF OAuth2** (scoped tokens) → demo SEC-01 (no cert) / SEC-02 (403).
- [ ] mTLS + NetworkPolicy between NF containers via **service mesh (Istio/Linkerd) or Cilium/eBPF**;
      PKI via cert-manager/CFSSL or Vault. Build **Grafana D5** (handshake/token/cert/mesh).

**Phase 3 — Anomaly (Layer 02 / D4 / SEC-03):**
- [ ] **anomaly-detection-service (9003)** consumes free5GC signalling (metrics+Loki): P1 rule-based
      → P2 z-score/IQR (reuse roaming `AnomalyDetector`) → alerts to **Grafana D4** + frontend.
- [ ] UERANSIM attack scripts: registration flood (DoS-on-AMF), IMSI enumeration (SEC-03), fake-gNB.

**Phase 4 — Conformance & fault (Layer 03):**
- [ ] Scenario runner → UERANSIM TC-01→PERF-02 (registration, 5G-AKA, PDU, dereg, handover; PERF
      ≥50 concurrent / p95 ≤500 ms) with pcap evidence.
- [ ] **fault-injection-service (9006)** cases: kill SMF mid-session, UDM 503, cert expiry, UPF↔SMF
      partition. Optional CI/CD gate.

**Phase 5 — Package & docs (D5/D7):** one-command bring-up (compose), K8s+Helm (stretch), final docs + demo.

## Observability / Grafana dashboards (D6) — see [[Grafana-Dashboards]]
- [ ] Add rate-limiting (9004) + anomaly (9003) scrape targets to `docker/prometheus/prometheus.yml`.
- [ ] Stand up **cAdvisor + node-exporter** for free5GC container CPU/mem/net.
- [ ] **Fluent Bit/promtail → Loki** for free5GC NF logs; LogQL counters for the signalling board (D3).
- [ ] Build the 7 dashboards: D1 Platform (extend), D2 NF Health, D3 Signalling, D4 Security/Anomaly,
      D5 Zero-Trust/Certs, D6 Rate-Limit, D7 Roaming, D8 Logs/Traces. Export JSON → `grafana-dashboard/`.
- [ ] Alert rules (proposal §4.3 P1): registration-burst, 5xx spike, cert-expiry <7d, NF heartbeat miss.

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
