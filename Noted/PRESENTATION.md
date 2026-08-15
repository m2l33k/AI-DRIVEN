<!--
  Academic / internship presentation for the 5G Core (5GC) Telecom Management Platform.
  Fully detailed edition — grounded in the real codebase (see the memory/ vault for source-of-truth notes).
  Placeholders in «angle brackets» are for you to personalise (names, dates, measured figures).
-->

# 5G Core Network Management Platform — Presentation (Full Detail)

> **Academic / internship defense document.** A cloud-native microservices platform to **operate,
> secure, and observe a 5G Core (5GC)** network, built during an internship at **Huawei** in the
> context of the **Tunisie Telecom (TT)** 5G Core project.

| | |
|---|---|
| **Author** | «Your Name» |
| **Institution** | «ESPRIT — School of Engineering» |
| **Degree / Track** | «Software / Telecom Engineering» |
| **Host company** | Huawei Technologies — Core Network / 5G Solutions |
| **Client project** | Tunisie Telecom (TT) — 5G Core |
| **Academic supervisor** | «Name» |
| **Company supervisor** | «Name» |
| **Period** | «start date» – «end date» |
| **Repository** | `spring-boot-based-microservices` (Spring Boot 4 / Spring Cloud 2025.1.1, Java 17, Angular 22) |

**How to read this deck.** Each numbered part is a slide group; the prose under each bullet is
speaker-note depth. Technical claims trace back to the `memory/` vault (Architecture-Decisions =
ADRs, Roles-and-Permissions, Auth-Service, Roaming-Analysis-Service, Ports-and-URLs,
Scripts-and-Tooling). Diagrams live in `Noted/diagram/` and render to `Noted/Assets/`.

---

## Table of Contents
1. [Introduction & Context](#introduction--context)
2. [Project Overview](#1-project-overview)
3. [Existing System Study & Analysis](#2-existing-system-study--analysis)
4. [Design & Architecture](#3-design--architecture)
5. [Implementation & Development](#4-implementation--development)
6. [Results & Evaluation](#5-results--evaluation)
7. [Contributions & Achievements](#6-contributions--achievements)
8. [Future Perspectives](#7-future-perspectives)
9. [Conclusion](#8-conclusion)
10. [Appendices](#appendices) — glossary, ports, endpoints, ADRs

---

## Introduction & Context

### Company Overview — Huawei
Huawei Technologies is one of the world's largest ICT infrastructure and smart-device providers.
In the **carrier / telecom-operator** business it supplies the full mobile-network stack: radio
access (RAN), transport, and the **5G Core (5GC)** — plus the operations and management systems
operators use to run those networks. Huawei is a leading contributor to cloud-native 5G Core
solutions built on a 3GPP **Service-Based Architecture (SBA)**, which is precisely the domain this
internship project addresses: not the radio side, but the **software platform that manages and
secures a 5G Core**.

### Department and Working Environment
The internship was carried out within the **Core Network / 5G Solutions** department, collaborating
with network and software engineers responsible for 5GC deployment and management tooling. Ways of
working:
- **Agile**, iterative delivery with Git-based collaboration (feature branches, conventional commits).
- **Cloud-native** delivery: everything containerised (Docker), deployable to **Kubernetes**, with a
  **Tilt** live-update loop for local development.
- **Observability-first** engineering culture — no service ships without metrics, logs, and traces.
- A strong **security posture** — identity, RBAC, and audit are first-class, not afterthoughts.

### Project Context
Operators moving to **5G Standalone (SA)** replace closed, monolithic core equipment with a
**Service-Based Architecture** of independently deployable, cloud-native **Network Functions (NFs)**
that expose service-based interfaces and are discovered dynamically. Running such a core is no longer
about a single management console bolted onto proprietary hardware; it demands an **API-first, role-
separated, observable management layer**. This project delivers that layer for the **Tunisie
Telecom** 5G Core programme: a platform through which operators, security analysts, administrators,
and auditors interact with the core — each constrained to exactly what their role permits.

### Problem Statement
> **How can a telecom operator securely operate, monitor, and evolve a 5G Core network through a
> single, cloud-native management platform?**

Concretely, the platform must:
1. **Separate duties by role** — network operators, security analysts, platform admins, and auditors
   must each see and do only what their responsibilities require, enforced consistently everywhere.
2. **Provide real-time visibility** — into network-function health, signalling/roaming security
   risk, platform performance (KPIs), logs, and traces.
3. **Not reinvent solved problems** — reuse a proven identity provider (Keycloak) and the standard
   cloud-native observability stack rather than hand-rolling IAM or monitoring.
4. **Stay extensible and portable** — start from a clean microservices skeleton that can grow from
   health-check placeholders into full NF-management logic, and run identically on a laptop, Docker
   Compose, or Kubernetes.

The remainder of this document explains how the platform meets each of these requirements.

---

## 1. Project Overview

### 5G Core Network Context
The 3GPP 5G Core follows a **Service-Based Architecture**: each capability is a **Network Function**
that exposes a **Service-Based Interface (SBI)** over HTTP/2 + JSON, and functions locate one another
through the **NRF (Network Repository Function)**. Key NFs:

| NF | Role in the 5G Core |
|----|---------------------|
| **AMF** | Access & Mobility Management — registration, connection, mobility |
| **SMF** | Session Management — PDU sessions, IP allocation, controls the UPF |
| **UPF** | User Plane Function — packet forwarding / data plane |
| **AUSF** | Authentication Server — subscriber authentication |
| **UDM** | Unified Data Management — subscriber data & credentials |
| **PCF** | Policy Control — QoS and charging policies |
| **NRF** | NF registry & discovery (the SBA "service registry") |
| **NSSF** | Network Slice Selection |

This platform **mirrors SBA principles in software**: a **service registry** (Eureka ≈ NRF), a single
**API gateway** as the secured entry point (≈ the SBA edge / SEPP-style boundary), and a set of
independently deployable services — the microservices idiom applied to 5GC management. The management
console exposes NF-oriented views (status, restart, core config, slices/QoS) that map onto these
concepts. Full term list in the [Glossary appendix](#a-glossary).

### Project Objectives
1. Deliver a **role-based operations console** for the 5GC, one tailored view per operator persona.
2. Enforce **centralised, permission-based authentication** (OAuth2/OIDC) at the edge **and** inside
   every service (defence in depth).
3. Provide **roaming / signalling risk analysis** with explainable scoring and commercial + QoS analytics.
4. Stand up a **cloud-native, fully observable** foundation (Prometheus, Grafana, Loki, Tempo, OpenTelemetry).
5. Ship **extensible placeholder services** (anomaly detection, rate limiting, tracing, fault injection)
   with clean skeletons and isolated datastores, ready for real logic.
6. Make the whole platform **reproducibly deployable** locally, via Docker Compose, and on Kubernetes/Tilt.

### Project Scope
**In scope**
- Platform architecture (discovery, gateway, service template, conventions).
- Identity & Access Management (Keycloak) and the auth-service that wraps it.
- Authentication lifecycle: login state machine, first-login password change, OTP self-service reset,
  custom email verification, user CRUD via the Keycloak Admin API.
- Roaming-analysis service: persistence, risk scoring, and analytics endpoints.
- Four platform placeholder services with database-per-service isolation.
- Observability stack + a gateway metrics-aggregation endpoint.
- Angular 22 operator console (four role consoles + shared auth/error screens).
- Containerisation and Kubernetes manifests + helper automation scripts.

**Out of scope**
- Implementing actual 3GPP NF **signalling stacks / data plane** — the NF-facing services are
  **management and analytics abstractions**, not real AMF/SMF/UPF implementations.
- Production hardening (HA Keycloak cluster, secrets manager, external TLS termination) — noted as
  future work.

### Overall Architecture
A **Spring Boot 4 / Spring Cloud** microservices platform behind a single secured gateway, with
Keycloak for identity and a full observability stack, consumed through an Angular console and
orchestrated by Docker Compose / Kubernetes / Tilt.

```
                         ┌───────────────────────────────┐
   Angular console  ───▶ │      API Gateway  :9000        │  JWT validation, routing,
   (:4200, /api proxy)   │  (Spring Cloud Gateway, WebFlux)│  Swagger aggregation, /api/metrics/overview
                         └───────┬───────────────┬────────┘
                                 │ lb://          │
             ┌───────────────────┼───────────────┼─────────────────────────┐
             ▼                   ▼               ▼                          ▼
     auth-service :9001   roaming-analysis :9002   platform placeholders :9003–9006
     (Keycloak-backed)    (MySQL, risk+analytics)  (anomaly / rate-limit / tracing / fault)
             │                   │                      │
             ▼                   ▼                      ▼
   ┌──────────────┐    ┌──────────────┐    per-service Postgres (5433–5436) + Redis (6379/6380)
   │  Keycloak    │    │ roaming-mysql│
   │  IAM  :8081  │    │   :3307      │       Discovery: Eureka :8761  (≈ NRF)
   │ +keycloak-pg │    └──────────────┘
   └──────────────┘
   Observability (Docker network): Prometheus :9090 · Grafana :3000 · Loki :3100 · Tempo :3200/4317/4318 · Fluent Bit · OpenTelemetry
```

Every request path is **client → gateway → service**; the gateway authenticates and the service
re-authorises. Services self-register with Eureka and are reached via `lb://<service-id>`.

---

## 2. Existing System Study & Analysis

### Current Architecture (baseline)
Traditional core-network operations rely on **vendor-specific EMS/NMS** tooling with siloed,
often manual access control, and monitoring that is bolted on per element rather than unified.
There is typically no single **API-first, role-separated** management layer with modern,
cloud-native observability spanning metrics, logs, and traces. The **gap** this project fills is
exactly that unified, secure, observable management plane.

### Technologies Used (evaluated / adopted)
| Concern | Studied baseline | Adopted in the platform | Why |
|---------|------------------|-------------------------|-----|
| Core-network model | 3GPP 5G SBA (NFs, NRF, SBI) | Mirrored in microservices (Eureka ≈ NRF, gateway edge) | Aligns software with the domain |
| Runtime substrate | Docker / Kubernetes | Docker Compose + K8s manifests + Tilt | Cloud-native, portable |
| Identity | Custom vs. off-the-shelf | **Keycloak** (OAuth2/OIDC) | Don't reinvent IAM (ADR-06) |
| Service framework | — | **Spring Boot 4 / Spring Cloud 2025.1.1** | Mature microservices ecosystem, Java 17 |
| Edge / discovery | — | **Spring Cloud Gateway (WebFlux)** + **Eureka** | Single secured entry + dynamic discovery |
| Observability | Per-element tooling | **Prometheus + Grafana + Loki + Tempo + OTel** | De-facto cloud-native stack |
| Console | — | **Angular 22** (standalone, signals) | Modern, lazy-loaded SPA |
| Persistence | Shared DB | **Database-per-service** (Postgres/MySQL/Redis) | Isolation, independent scaling (ADR-09) |

### Requirements Analysis
**Functional requirements**
- **FR1** — Authenticate users and manage their full lifecycle: create (with emailed temporary
  password), verify email, force first-login password change, self-service OTP reset, admin reset,
  delete.
- **FR2** — Enforce **four roles** with fine-grained `PERM_*` permissions (matrix below).
- **FR3** — Per-role console views: platform admin (users/roles/config/health/metrics), network
  operator (NF status/restart, core config/slices/QoS), security analyst (alerts, roaming events,
  detection rules), auditor (read-everything + immutable audit logs).
- **FR4** — Analyse roaming events, score partner-PLMN risk (0–100), and expose analytics: live
  monitoring, anomaly detection, traffic forecast, QoS, customer experience, agreement optimisation,
  and revenue.
- **FR5** — Expose platform-wide **health and request/JVM KPIs** for the admin System-Health and
  API-Metrics pages.

**Non-functional requirements**
- **NFR1 Security** — OAuth2/OIDC, JWT validation, **defence in depth** (edge + service), immutable
  audit logs (`audit:delete` granted to nobody by design).
- **NFR2 Observability** — metrics, logs, traces for every service; dashboards + alerting-ready.
- **NFR3 Scalability & isolation** — independently deployable services; database-per-service.
- **NFR4 Portability** — identical behaviour local / Compose / Kubernetes.
- **NFR5 Maintainability** — a consistent **service template**, ADR-documented decisions, and a
  detailed memory/documentation vault.

**Role / permission matrix** (source of truth: `keycloak/platform-realm.json`)

| Permission (`PERM_*`) | PLATFORM_ADMIN | NETWORK_OPERATOR | SECURITY_ANALYST | AUDITOR |
|-----------------------|:---:|:---:|:---:|:---:|
| `users:read` / `users:write` | ✅ / ✅ | – | – | ✅ / – |
| `roles:read` / `roles:write` | ✅ / ✅ | – | – | ✅ / – |
| `platform-config:read` / `:write` | ✅ / ✅ | – | – | ✅ / – |
| `nf:read` / `nf:restart` | – | ✅ / ✅ | – | ✅ / – |
| `core-config:read` / `:write` | – | ✅ / ✅ | – | ✅ / – |
| `security-alerts:read` | – | – | ✅ | ✅ |
| `roaming-events:read` | – | – | ✅ | ✅ |
| `detection-rules:read` / `:write` | – | – | ✅ / ✅ | ✅ / – |
| `audit:read` | – | – | – | ✅ |
| `audit:delete` | *granted to nobody — logs are immutable* | | | |

### Identified Constraints and Challenges
- **C1** — Don't reimplement IAM; Keycloak must stay the source of truth for passwords, sessions,
  tokens, and required actions (ADR-06).
- **C2** — Keycloak `start-dev` defaults to an **embedded H2 inside the container** with no volume →
  users and realm changes are lost on `down` (solved in ADR-10).
- **C3** — A public path must be whitelisted at **both** the gateway and the service, or the gateway
  401s first; a stale Swagger bearer token also 401s `permitAll` paths (ADR-07 gotcha).
- **C4** — Keycloak returns `invalid_grant "Account is not fully set up"` **after** accepting a valid
  password, so login must interpret account state rather than surface the raw error (ADR-05).
- **C5** — Placeholder services must be **lean** (no premature security/JPA) yet trivially
  extensible (ADR-08, later partly superseded by ADR-09).
- **C6** — **Resource pressure**: database-per-service means many containers on a dev laptop
  (~256 MB each) — accepted trade-off with a documented fallback (ADR-09).

---

## 3. Design & Architecture

### Proposed Architecture
A **Service-Based, permission-driven** platform composed of:

- **API Gateway** (`spring-cloud/gateway-service`, WebFlux) — the single entry point. Validates JWTs,
  maps authorities, routes `/api/**` to services via `lb://`, aggregates every service's Swagger under
  `/<service-id>/v3/api-docs`, whitelists public health/docs paths, and hosts a local
  **`GET /api/metrics/overview`** endpoint that queries Prometheus for request/JVM KPIs.
- **Service Discovery** (`spring-cloud/eureka-server`, :8761) — the SBA registry analogue (≈ NRF).
- **Business services** — `auth-service` (:9001), `roaming-analysis-service` (:9002).
- **Platform services** — `anomaly-detection` (:9003), `rate-limiting` (:9004),
  `distributed-tracing` (:9005), `fault-injection` (:9006) — health-check skeletons, each with its own
  datastore.
- **Identity** — Keycloak (realm `auth-management`, client `platform-client`), persisted to a
  dedicated Postgres.
- **Observability** — Prometheus, Grafana, Loki, Tempo, Fluent Bit, OpenTelemetry.
- **Console** — Angular 22 SPA with four role consoles.

### 5G Core Components (mapping to the platform)
| 5G Core / 3GPP concept | Platform realisation |
|------------------------|----------------------|
| NF discovery (**NRF**) | **Eureka** service registry (`lb://<service-id>`) |
| Service-Based Interfaces (SBI) | REST APIs behind **Spring Cloud Gateway** |
| Edge / roaming boundary (**SEPP**-style) | The **gateway** as the single secured ingress |
| Subscriber auth trust (**AUSF/UDM**) | **Keycloak** OAuth2/OIDC + JWT, Admin API |
| Roaming / signalling security | **roaming-analysis-service** (risk scoring + analytics) |
| NF lifecycle management | role-based **operator console** (NF status/restart, core config) |
| Network slicing / QoS (**NSSF/PCF**) | operator **core-config** views (S-NSSAI, 5QI profiles) |
| Abuse protection at the edge | **rate-limiting-service** (placeholder; Redis token bucket) |
| Resilience / chaos testing | **fault-injection-service** (placeholder) |
| Anomaly / fraud detection | **anomaly-detection-service** (placeholder; consolidates roaming heuristics) |

### Interactions Between Network Functions (request lifecycle)
1. The console obtains a **JWT** from `auth-service` (which performs a Keycloak password grant, scope
   `openid profile email roles`).
2. Each API call carries `Authorization: Bearer <JWT>` (attached by the Angular `auth.interceptor`,
   skipped for public auth paths to avoid the stale-token 401).
3. The **gateway** validates the token against Keycloak's JWKS, maps **realm roles → `ROLE_*`** and
   **client permissions → `PERM_*`**, and enforces route-level access; unmatched public paths must be
   whitelisted here.
4. The request is routed via **Eureka** (`lb://roaming-analysis-service`, etc.) to the target service.
5. The **service** re-validates the JWT and re-checks authority with
   `@PreAuthorize("hasAuthority('PERM_…')")` — **defence in depth** (ADR-07).
6. **Traces** propagate via OpenTelemetry (OTLP) to **Tempo**; **metrics** are scraped by Prometheus
   from each service's `/actuator/prometheus`; **logs** ship via Fluent Bit to Loki.

**Auth state machine (the key design, ADR-05).** `POST /api/auth/login` returns a *status* rather
than a raw Keycloak error:
```
             ┌────────────► SUCCESS  {accessToken, refreshToken, expiresIn}
credentials ─┤
             ├────────────► EMAIL_VERIFICATION_REQUIRED  {message}
             └────────────► PASSWORD_CHANGE_REQUIRED    {message, firstLoginToken}
```
Keycloak accepts the password then reports "Account is not fully set up"; `auth-service` inspects the
account via the Admin API (`emailVerified`, `requiredActions`) and drives the UI accordingly.

### Technology Choices (and the reasoning — see ADRs)
- **Spring Boot 4 / Spring Cloud 2025.1.1, Java 17** — mature, well-supported microservices stack.
- **Keycloak** for IAM (**ADR-06**) — standards-based OIDC; auth-service stays a thin wrapper.
- **Permission-based RBAC on `PERM_*`** (**ADR-07**) — roles can be re-sliced in Keycloak without code
  changes; enforced at edge + service.
- **State-aware login** (**ADR-05**) and **our own email-verification flow** (**ADR-04**) — own the UX
  instead of exposing Keycloak's themed pages / raw errors.
- **In-memory token/OTP stores for now** (**ADR-03**) — simplest thing that works; swap for Redis to scale.
- **Roaming risk = explainable heuristic, not ML** (**ADR-02**) — ships now, explainable; ML later.
- **Tempo as the trace backend; Jaeger a placeholder** (**ADR-01**).
- **Database-per-service** (**ADR-09**) — isolation and independent ownership.
- **Placeholder services carry no security/JPA initially** (**ADR-08**) — no protected data yet.
- **Angular 22** (standalone components, signals, lazy routes) — modern SPA, ~236 kB initial bundle,
  dependency-free SVG charts.

### Architecture Diagrams
Current source-of-truth diagrams (PlantUML) live in **`Noted/diagram/`**:
- `infrastructure.puml` — end-to-end deployment topology on the Docker `shared-network`.
- `services.puml` — the service catalogue grouped by tier, with ports + source paths.
- Rendered to `Noted/Assets/infra 5GC.png` and `service infra.svg` (embedded in the READMEs).

Login/RBAC **sequence** and **component** diagrams are in `Noted/uml/` (with a GitHub-renderable
Mermaid mirror). ⚠️ These pre-date the four placeholder services — regenerate before the defense (see
[Future Perspectives](#7-future-perspectives)).

---

## 4. Implementation & Development

### Environment Deployment
Three deployment modes, all reproducible (see `memory/Scripts-and-Tooling.md`):

| Mode | Commands | What runs |
|------|----------|-----------|
| **Local (JAR)** | `./infra.sh up` then `./run.sh` | Infra + observability in Docker; eureka + gateway + auth as local JARs |
| **Docker** | `./infra.sh up` then `./run.sh docker` | App services via `docker/docker-compose-base.yml` |
| **Kubernetes** | per-service `kubernetes/*.yml`; `tilt up` | K8s deployments/services with Tilt live-update |

`run.sh` sources the repo-root **`.env`** (gitignored) so `MAIL_*` / `KC_SMTP_*` reach both local JARs
and Compose. ⚠️ Known gap: the local-JAR path, `build-images.sh`, and the `Tiltfile` currently launch
only eureka + gateway + auth (documented follow-up).

### Component Configuration
- **Keycloak** — realm-as-code `keycloak/platform-realm.json` (4 realm roles, `platform-client` with
  the full `PERM_*` set, demo users). Now **persisted to `keycloak-postgres`** with a named volume
  (**ADR-10**); `keycloak/export-realm.{ps1,sh}` dumps the running realm (incl. users) back to JSON,
  `keycloak/configure-smtp.{ps1,sh}` sets realm SMTP live. *Caveat: restore `${KC_SMTP_*}` placeholders
  before committing an export.*
- **Gateway** — explicit routes per service (both `default` and `docker` profiles), Swagger
  aggregation, public-path whitelist (health/docs), and `prometheus.base-url` for the metrics endpoint.
- **Per-service `application.yml`** — `default` (localhost) and `docker` (container hostnames) profiles;
  actuator exposes `health, info, metrics, prometheus`.
- **Prometheus** — scrapes host-run apps via `host.docker.internal` (gateway/eureka/auth/roaming), so
  metrics flow even when services run locally; **Grafana** datasources + dashboards provisioned from
  `grafana-dashboard/`.

### Equipment Installation & Integration (the container estate)
| Tier | Containers |
|------|-----------|
| Identity | `keycloak` (:8081→8080) + `keycloak-postgres` (:5437) |
| Roaming data | `roaming-mysql` (:3307, mysql:8.4) |
| Per-service data | `anomaly-postgres` (:5433), `ratelimit-postgres` (:5434), `tracing-postgres` (:5435), `fault-postgres` (:5436); `anomaly-redis` (:6380), `ratelimit-redis` (:6379) |
| Observability | `prometheus` (:9090), `grafana` (:3000), `loki` (:3100), `tempo` (:3200/4317/4318), `fluent-bit` (:24224) |
| App | `eureka-server` (:8761), `gateway-service` (:9000), `auth-service` (:9001), `roaming-analysis-service` (:9002), + 4 placeholders (:9003–9006) |

All on a shared Docker network; integration validated with `docker compose … config` and end-to-end
health checks through the gateway.

### Development and Automation
**auth-service** (`io.javatab.microservices.auth`) — a thin layer over Keycloak (token endpoint +
Admin API). Highlights:
- State-aware login (SUCCESS / EMAIL_VERIFICATION_REQUIRED / PASSWORD_CHANGE_REQUIRED).
- First-login password change (redeem `firstLoginToken`, clears `UPDATE_PASSWORD`).
- Self-service **OTP reset**: `/forgot-password` → 6-digit OTP (email) → `/verify-otp` → single-use
  `resetToken` → `/reset-password`.
- **Custom email-verification** (ADR-04): 24h single-use token → `GET /api/auth/verify-email` marks
  `emailVerified=true` via the Admin API and renders our own page.
- User CRUD (`/api/users`) guarded by `PERM_users:*`; created users get a temporary password + required
  actions and two emails (temp password + verification link) via our own `MailService` (Gmail SMTP).

**roaming-analysis-service** (`io.javatab.microservices.roaming`) — JPA/**MySQL** persistence
(`roaming_events`), seeded on first start; **11 endpoints** under `/api/roaming`, all requiring
`PERM_roaming-events:read`:

| Endpoint | Purpose |
|----------|---------|
| `GET /events`, `/events/{id}` | list (filterable) / single event |
| `GET /summary` | dashboard aggregates (totals, direction split, risk breakdown, hourly volume) |
| `GET /partners` | per-partner-PLMN roll-up by avg risk |
| `GET /live?windowMinutes=` | real-time monitor (active events/subs/rate/risk/revenue) |
| `GET /anomalies` | flagged events + reasons + severity |
| `GET /forecast?hoursAhead=` | linear-regression traffic forecast |
| `GET /experience` | per-partner QoS experience score |
| `GET /qos` | latency/throughput/drop overview + worst partners |
| `GET /optimization` | per-partner margin + agreement recommendation |
| `GET /revenue` | revenue/cost/margin/ARPU + top partners |

**Risk scoring (`RiskAnalyzer`, ADR-02)** — additive, explainable, clamped to [0,100]:
```
baseline 5
 + impossible travel .......... +40
 + signalling errors .......... ×3  (capped at 21)
 + new-device ratio ........... ×25
 + known-bad PLMN ............. +20  (310-260, 404-45, 621-30)
 + tiny subscriber count (<20)  +8
→ RiskLevel: <30 LOW · <60 MEDIUM · else HIGH
```

**Gateway** — `GET /api/metrics/overview` runs PromQL over `http_server_requests_seconds_*`, `jvm_*`,
`process_*` and returns totalRequests, RPS, exceptions, %2xx/%5xx, requests-by-URI, avg-duration, and
JVM stats (secured `PERM_platform-config:read`).

**Angular console** (`Frontend/`) — four role consoles, a shared glassmorphism `role-shell`, and
dependency-free SVG charts (`line`/`bar`/`donut`). Live pages: admin **Dashboard** (from `/api/users`),
**Users** (CRUD + pagination), **Roles & Permissions** (16×4 matrix), **System Health** (service health
+ live JVM), **API Metrics** (from `/api/metrics/overview`). Operator/security/auditor data pages
currently render representative mock data (integration is tracked as future work).

**Automation** — `run.sh`, `infra.sh`, `build-images.sh`, `create-project.sh`, the `Tiltfile`, and the
Keycloak export/SMTP scripts (see `memory/Scripts-and-Tooling.md`).

### Testing & Validation
- **Build:** `mvnw clean package` / `compile` across all modules → **success**; `npm run build` → clean.
- **Compose:** `docker compose -f docker/<file> config` → valid.
- **Functional (manual, via Swagger/curl):** full auth lifecycle (login, first-login, OTP reset, email
  verify), RBAC enforcement per role, gateway-routed API calls, roaming analytics consistency.
- **Persistence:** Keycloak users + roaming data survive `infra.sh down` (only `down -v` wipes them).
- *Automated unit/integration tests were intentionally deferred* — a documented follow-up in
  `memory/Next-Steps.md`.

---

## 5. Results & Evaluation

### Test Scenarios
1. **Authentication lifecycle** — create user → temp-password email → email verify → first-login
   password change → normal login; each step returns the correct `LoginResponse.status`.
2. **RBAC enforcement** — each role reaches only its permitted endpoints; unauthorised calls return
   403; whitelisted public paths reach the service without a token.
3. **Roaming analytics** — seeded events are scored; `/live`, `/anomalies`, `/forecast` return
   consistent, explainable output; risk thresholds behave as specified.
4. **Observability** — metrics scraped, Grafana dashboards populated, all health endpoints green.
5. **Persistence** — data survives container restarts (`down`) and is only wiped by `down -v`.

### KPIs & Performance Metrics (definitions)
Exposed via the gateway `GET /api/metrics/overview` and Prometheus/Grafana:
- **Total requests**, **RPS (requests/second)** — throughput.
- **% 2xx / % 5xx**, **exception count** — reliability / error rate.
- **Requests-by-URI**, **average duration**, **slowest endpoints** — latency hot-spots.
- **JVM**: CPU, heap usage, process metrics (per service).
- **Roaming domain**: partner-PLMN risk distribution, anomaly counts, forecast trend, QoS score, ARPU.
- **Frontend**: ~236 kB initial bundle (dependency-free charts).

> Fill measured figures at demo time — «e.g. RPS under load, p95 latency, dashboard screenshots».

### Obtained Results
- A working, **end-to-end secured** platform: console → gateway → services → Keycloak/DBs, fully
  observable.
- **Six microservices** + discovery + gateway, each containerised with Kubernetes manifests.
- **Four role consoles** with live admin data (users, roles matrix, system health, API metrics).
- **Roaming risk scoring + 11 analytics endpoints** persisted in MySQL.
- **Persistent, realm-as-code identity** with a complete authentication lifecycle.

### Before/After Comparison
| Aspect | Before (baseline) | After (this project) |
|--------|-------------------|----------------------|
| Access control | Siloed / manual, per element | Centralised OAuth2/OIDC, `PERM_*` RBAC, edge **and** service |
| Identity persistence | Ephemeral (H2 in-container) | Postgres-backed + volume; realm-as-code export/import |
| Observability | Ad-hoc, per element | Prometheus + Grafana + Loki + Tempo + OTel, per service |
| Roaming security | None / manual | Explainable risk scoring + 11 analytics endpoints |
| Deployment | Manual, environment-specific | One command: local / Docker Compose / Kubernetes / Tilt |
| Data architecture | Shared / none | Database-per-service isolation |
| Extensibility | Monolithic | Service template + 4 ready-to-fill placeholders |

### Challenges Encountered & Solutions
| # | Challenge | Solution | Ref |
|---|-----------|----------|-----|
| 1 | Keycloak lost users/realm on restart | Dedicated Postgres + volume + realm export/import | ADR-10 |
| 2 | 401 on public paths through the gateway | Whitelist at gateway **and** service; log out stale Swagger token | ADR-07 |
| 3 | Valid creds returned "Account is not fully set up" | State-aware login inspects account via Admin API | ADR-05 |
| 4 | Email login → "user not found" | Resolve user by username **or** email | Auth-Service |
| 5 | Themed Keycloak verify pages hurt UX | Own 24h-token email-verification flow | ADR-04 |
| 6 | Many DB containers strain a dev laptop | Database-per-service with a documented collapse-to-one fallback | ADR-09 |

---

## 6. Contributions & Achievements

### Technical Contributions
- **Designed and built** a cloud-native 5GC management platform: gateway, discovery, six services,
  IAM, and a full observability stack — with a reusable **service template** and ADR-documented decisions.
- Implemented **permission-based RBAC** enforced end-to-end and a **complete authentication lifecycle**
  (state-aware login, first-login, OTP reset, custom email verification, user CRUD) over Keycloak.
- Built the **roaming risk-scoring + analytics** service (MySQL-persisted, 11 endpoints, explainable heuristics).
- Introduced **database-per-service** persistence and **Keycloak-as-code** with export/import scripts.
- Delivered a **role-based Angular console** with live operational dashboards and a gateway
  **metrics-aggregation** endpoint.
- Authored a **detailed documentation vault** (`memory/` + `Noted/`) so the system never has to be
  re-read from scratch.

### Contributions to the Tunisie Telecom (TT) Project
- A **reusable, secure operations layer** for TT's 5G Core, aligned with 3GPP SBA principles.
- **Roaming / signalling security tooling** relevant to TT's international-roaming risk and revenue posture.
- A **deployable, observable foundation** (Compose/K8s/Tilt) that TT engineering teams can extend with
  real NF-management logic — the four placeholders are deliberately shaped for that.

### Skills Acquired
- **Telecom domain:** 5G Core / 3GPP SBA fundamentals, NFs, PLMN/roaming, signalling security, QoS, ARPU.
- **Backend:** Spring Boot 4 / Spring Cloud microservices, Spring Cloud Gateway (WebFlux), Eureka, JPA.
- **Security / IAM:** OAuth2/OIDC, JWT, Keycloak realms/clients/Admin API, RBAC design.
- **Cloud-native / DevOps:** Docker, Docker Compose, Kubernetes, Tilt; observability with
  Prometheus/Grafana/Loki/Tempo/OpenTelemetry.
- **Frontend:** Angular 22 (standalone components, signals, lazy routing), dependency-free SVG dataviz.
- **Engineering practice:** architectural decision records (ADRs), documentation-as-a-first-class-artefact,
  Git-based collaboration.

### Challenges Overcome
Identity persistence, end-to-end auth consistency, gateway/service security alignment, translating
Keycloak's account-state quirks into a clean UX, and orchestrating a multi-service, multi-datastore
stack reproducibly on constrained hardware.

---

## 7. Future Perspectives

### Potential Improvements
- Give the four placeholder services **real logic** + a `SecurityConfig` (copy the roaming service's)
  and move their routes off the public whitelist once protected endpoints land.
- Wire the remaining frontend data pages to **live APIs** (network functions, security alerts, roaming
  `/api/roaming/*`, audit logs, core config).
- Add a `GET /api/roles` / per-role user counts so the roles UI and "users by role" chart are live.

### Automation
- Extend `run.sh`, `build-images.sh`, and the `Tiltfile` to launch **all** services (currently only
  eureka + gateway + auth).
- Add a **CI/CD** pipeline (build, security scan, deploy) and **infrastructure-as-code** for the DB
  layer on Kubernetes (Postgres/Redis StatefulSets + datasource env).
- Move in-memory OTP/token stores to **Redis** for multi-instance operation (ADR-03).

### Monitoring & Observability
- Decide **Jaeger vs. Tempo** for distributed tracing (ADR-01) and wire the tracing service accordingly.
- Add **SLO-based alerting** rules and richer Grafana dashboards; propagate trace context across all services.

### Future 5G Core Network Enhancements
- Replace roaming **heuristics with ML** (anomaly detection, forecasting) — likely centralised in
  `anomaly-detection-service`.
- Integrate with **real NF telemetry** (AMF/SMF/UPF) and enforce **rate limiting / fault injection** at
  the 5GC edge.
- **Multi-tenant / multi-operator** support and horizontal scaling on Kubernetes; production hardening
  (HA Keycloak, secrets manager, external TLS).

### Automated Testing (cross-cutting)
- Introduce unit + integration tests (services, gateway routing, auth flows) and contract tests against
  the OpenAPI specs in `api-specs/`.

---

## 8. Conclusion

### Work Summary
This internship delivered a **secure, observable, cloud-native management platform for a 5G Core
network**: a permission-based RBAC gateway fronting six microservices, Keycloak-backed identity with a
full authentication lifecycle, a MySQL-persisted roaming risk-and-analytics service, a role-based
operator console, and a complete observability stack — all reproducibly deployable via Docker Compose,
Kubernetes, and Tilt, and documented end-to-end.

### Key Results
- End-to-end **secured** platform with four role consoles and live operational dashboards.
- **Complete authentication lifecycle** and **persistent, realm-as-code** identity.
- **Roaming risk scoring + 11 analytics endpoints** persisted and exposed via API.
- A **containerised, observable, extensible** foundation aligned with 3GPP SBA principles, with four
  placeholder services shaped for real NF logic.

### Internship Experience Overview
Working within Huawei's core-network context on the Tunisie Telecom 5G project bridged **telecom domain
knowledge** with **cloud-native software engineering** — from 3GPP SBA concepts to hands-on
microservices, IAM, and observability. Beyond the deliverable, the experience built durable engineering
habits: documenting decisions as ADRs, treating observability and security as first-class, and keeping a
living knowledge base so the platform can be handed over and grown. The result is both a concrete,
demonstrable system and a foundation the team can evolve toward full 5G Core management.

---

## Appendices

### A. Glossary
**5GC** 5G Core · **NF** Network Function (AMF/SMF/UPF/AUSF/UDM/PCF/NRF/NSSF) · **SBA** Service-Based
Architecture · **SBI** Service-Based Interface · **NRF** NF Repository Function (discovery) · **SEPP**
Security Edge Protection Proxy (roaming edge) · **PLMN** Public Land Mobile Network (MCC-MNC, e.g.
`310-260`) · **Roaming** subscriber on a partner PLMN · **QoS** Quality of Service · **5QI** 5G QoS
Identifier · **S-NSSAI** slice identifier · **ARPU** Average Revenue Per User · **Signalling**
control-plane messaging. **Keycloak** OIDC identity provider (realm `auth-management`, client
`platform-client`) · **Realm role** → `ROLE_*` · **Client permission** → `PERM_*` · **Required action**
Keycloak flag (`VERIFY_EMAIL`, `UPDATE_PASSWORD`) · **Eureka** service registry · **OTLP** OpenTelemetry
protocol · **Actuator** Spring Boot ops endpoints. (Full list: `memory/Glossary.md`.)

### B. Ports & URLs (quick reference)
| Component | Local | Docker |
|-----------|-------|--------|
| Eureka | 8761 | eureka-server:8761 |
| Gateway | 9000 | gateway-service:9000 |
| auth-service | 9001 | auth-service:9001 |
| roaming-analysis-service | 9002 | roaming-analysis-service:9002 |
| anomaly / rate-limit / tracing / fault | 9003 / 9004 / 9005 / 9006 | same names |
| Frontend (Angular dev) | 4200 | — |
| Keycloak | 8081 | keycloak:8080 |
| keycloak-postgres | 5437 | keycloak-postgres:5432 |
| roaming MySQL | 3307 | roaming-mysql:3306 |
| per-service Postgres | 5433–5436 | *-postgres:5432 |
| Redis (anomaly / ratelimit) | 6380 / 6379 | *-redis:6379 |
| Prometheus / Grafana / Loki / Tempo | 9090 / 3000 / 3100 / 3200 | same names |

(Full detail incl. endpoints + Keycloak token/JWKS URLs: `memory/Ports-and-URLs.md`.)

### C. Architecture Decision Records (index)
ADR-01 Tempo is the trace backend; Jaeger is a placeholder · ADR-02 Roaming risk is an explainable
heuristic · ADR-03 In-memory token/OTP stores (swap for Redis) · ADR-04 Own email-verification flow ·
ADR-05 State-aware login · ADR-06 auth-service is a thin layer over Keycloak · ADR-07 Permission-based
RBAC at edge + service · ADR-08 Placeholder services carry no security/JPA · ADR-09 Database-per-service
· ADR-10 Keycloak persisted to Postgres. (Full rationale + trade-offs: `memory/Architecture-Decisions.md`.)

### D. References & Further Reading
- Project deep-dive: `Noted/README.md` · Diagrams: `Noted/diagram/` (+ rendered `Noted/Assets/`)
- Memory vault (source of truth): `memory/` — start at `memory/README.md`
- Roles & permissions: `memory/Roles-and-Permissions.md` · Auth: `memory/Auth-Service.md`
- Roaming: `memory/Roaming-Analysis-Service.md` · Scripts: `memory/Scripts-and-Tooling.md`

> _Placeholders in «angle brackets» (names, dates, measured KPI figures, screenshots) are yours to fill
> before submission. Regenerate `Noted/diagram/` to include services 9003–9006 for the final deck._
