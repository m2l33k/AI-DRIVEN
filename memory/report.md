---
title: PFE Report — Full Draft Material
tags: [report, pfe, draft, documentation]
updated: 2026-09-10
---

# PFE Report — Structured Content for Drafting

This file contains all the information needed to write the technical PFE report.
It is structured chapter by chapter with ready-to-use content blocks.

---

## Title page

**Title (French):** Plateforme Cloud-Native de Sécurité et d'Observabilité pour un Cœur de Réseau 5G

**Title (English):** Cloud-Native Security and Observability Platform for a 5G Core Network

**Author:** Malik Hassayoun (malekaziz.hassayoun@esprit.tn)

**Institution:** ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies

**Academic year:** 2025–2026

**Supervisor / Encadrant:** *(fill in)*

**Enterprise / Host:** *(fill in)*

---

## Abstract (résumé)

### English
This project presents the design and implementation of a cloud-native management and security platform built around an open-source 5G Core network (free5GC). The platform integrates microservices developed with Spring Boot and Spring Cloud, a role-based Angular console, a machine learning forecasting service (LSTM, Prophet, ARIMA), a full observability stack (Prometheus, Grafana, Loki, Tempo), and a real-time anomaly detection pipeline based on roaming traffic analysis. Key contributions include: (1) a Keycloak-backed permission model that gates a multi-role operator console; (2) a roaming analytics engine processing 39 000 real CDR/QoS/attach records with risk scoring, z-score anomaly detection, and multi-model traffic forecasting; (3) integration of the free5GC 5G Core control-plane, with Prometheus metric scraping, log forwarding to Loki, and a purpose-built Grafana dashboard; and (4) a rate-limiting service implementing an atomic Redis token-bucket algorithm. The system is deployable with a single command via Docker Compose and validated on a Windows 11 development host.

### Français
Ce projet présente la conception et la mise en œuvre d'une plateforme cloud-native de gestion et de sécurité construite autour d'un cœur de réseau 5G open-source (free5GC). La plateforme intègre des microservices développés avec Spring Boot et Spring Cloud, une console Angular orientée rôles, un service de prévision par apprentissage automatique (LSTM, Prophet, ARIMA), une pile d'observabilité complète (Prometheus, Grafana, Loki, Tempo) et un pipeline de détection d'anomalies en temps réel basé sur l'analyse du trafic d'itinérance. Les contributions principales comprennent : (1) un modèle de permissions Keycloak contrôlant une console multi-rôles ; (2) un moteur d'analyse d'itinérance traitant 39 000 enregistrements réels (CDR/QoS/attach) avec scoring de risque, détection d'anomalies par z-score et prévision multi-modèles ; (3) l'intégration du plan de contrôle free5GC avec scraping Prometheus, forwarding de logs vers Loki et tableau de bord Grafana dédié ; et (4) un service de limitation de débit implémentant un algorithme de seau à jetons Redis atomique. Le système est déployable en une seule commande via Docker Compose et validé sur un hôte Windows 11.

---

## Chapter 1 — Introduction & Context

### 1.1 Background
The transition from 4G LTE to 5G introduces a fundamentally different core network architecture. The 5G Core (5GC) replaces the monolithic EPC with a Service-Based Architecture (SBA) where Network Functions (NFs) expose REST APIs over HTTP/2 (SBI — Service-Based Interface). This opens unprecedented opportunities for software-based management, security automation, and intelligent analytics.

Key challenges addressed by this project:
- **Security:** the SBA is inherently more exposed than 4G interfaces; signalling anomalies (DoS on AMF, IMSI enumeration, rogue gNB) are harder to detect at scale
- **Observability:** distributed NFs produce metrics and logs that must be correlated in real time
- **Roaming analytics:** telecom operators need actionable intelligence from CDR/QoS data to detect fraud, assess partner risk, and forecast traffic

### 1.2 Project objectives
1. Build a production-grade cloud-native platform (microservices, Docker, Kubernetes) as a security and observability harness around a real 5G Core
2. Implement a real-time roaming analytics pipeline with ML-powered forecasting
3. Integrate free5GC as the 5G Core substrate and observe its NFs via Prometheus and Grafana
4. Provide a role-aware Angular management console for operators, security analysts, and auditors
5. Demonstrate the platform's value through live data: 39 000 real roaming records, 3 ML models, 8 NF metrics endpoints

### 1.3 Scope
This project covers:
- All seven Spring Boot microservices (auth, roaming, rate-limiting, anomaly, tracing, fault, messaging)
- Spring Cloud infrastructure (Eureka, Gateway)
- Angular 22 frontend (four roles: PLATFORM_ADMIN, NETWORK_OPERATOR, SECURITY_ANALYST, AUDITOR)
- free5GC 5G Core integration (8 control-plane NFs)
- ML service (LSTM + Prophet + ARIMA)
- Full observability stack (Prometheus, Grafana, Loki, Tempo, Fluent Bit)

Out of scope: UPF (requires Linux kernel module), UERANSIM integration (full test on Linux VM), production Kubernetes deployment.

---

## Chapter 2 — State of the Art

### 2.1 5G Core architecture (3GPP standards)
- **TS 23.501** — System architecture for 5G (NF definitions, SBA, reference points)
- **TS 33.501** — Security architecture: SBI TLS, NRF-based OAuth2, NF authorization
- **TS 23.502** — Procedures: registration, 5G-AKA, PDU session establishment, handover
- Key NFs: NRF (registry + OAuth2 AS), AMF (mobility), SMF (session), UPF (user-plane), AUSF/UDM/UDR (auth + data), PCF (policy), NSSF (slicing)

### 2.2 Open-source 5G implementations compared
| Implementation | Language | SBI TLS/OAuth2 | Notes |
|---|---|---|---|
| **free5GC** | Go | ✅ (TS 33.501 §13) | Chosen for this project — has NRF OAuth2 |
| open5GS | C | partial | Wider community |
| OAI (OpenAirInterface) | C/C++ | partial | Stronger RAN focus |
| Magma | C++/Python | no | Facebook-originated |

**Why free5GC:** NRF-as-OAuth2 and SBI TLS support, enabling Layer 01 (zero-trust SBI) work. Go is also the language recommended in the proposal.

### 2.3 Microservices patterns used
- **Database-per-service** (ADR-09): each microservice owns a dedicated Postgres/MySQL, ensuring independent evolution and failure isolation
- **API Gateway pattern** (Spring Cloud Gateway): single entry point, JWT validation, load-balanced routing to Eureka-registered services
- **Token-bucket rate limiting** (ADR-11 rationale): atomic Lua script on Redis; advisory (not on gateway hot path — learned from ADR-11 revert)
- **Permission-based RBAC** (ADR-07): fine-grained `PERM_*` authorities on Keycloak `platform-client`; role composites aggregate them

### 2.4 ML forecasting methods used
| Method | Type | Key property |
|--------|------|-------------|
| **LSTM** | Deep learning (RNN) | Learns temporal dependencies of arbitrary depth |
| **Prophet** | Additive decomposition | Robust to missing data, outliers, and trend changes |
| **ARIMA(2,1,2)** | Statistical | Interpretable baseline; AIC used for model selection |
| **Ensemble** | Averaging | Reduces variance of individual models |

### 2.5 Observability standards
- **OpenTelemetry** — vendor-neutral traces (OTLP → Tempo)
- **Prometheus** — metrics scraping (pull model, `/actuator/prometheus`)
- **Loki** — log aggregation (Fluent Bit → Loki push + Loki4j in JARs)
- **Grafana** — unified visualization (metrics + logs + traces correlation)

---

## Chapter 3 — System Architecture

### 3.1 High-level architecture diagram
*(Reference: `Noted/Assets/infra 5GC.png`, `Noted/Assets/architecturephysique.jpg`)*

The platform has three tiers:
1. **Angular 22 console** (port 4200, dev; CDN in prod) — role-based UI
2. **Spring Cloud platform** (ports 8761 / 9000 / 9001–9007) — gateway, auth, business microservices
3. **Infrastructure** (Docker Compose) — Keycloak, databases, observability, free5GC

All communication between tiers goes through the **Spring Cloud Gateway** (port 9000), which enforces OAuth2/OIDC JWT validation and routes requests to Eureka-registered services.

### 3.2 Spring Cloud microservices

| Service | Port | Tech | Role |
|---------|------|------|------|
| `eureka-server` | 8761 | Netflix Eureka | Service registry |
| `gateway-service` | 9000 | Spring Cloud Gateway (WebFlux) | API gateway, JWT validation, routing |
| `auth-service` | 9001 | Spring Boot + Keycloak Admin API | Authentication, user management |
| `roaming-analysis-service` | 9002 | Spring Boot + JPA + MySQL | Roaming analytics, risk scoring, ML proxy, 5GC proxy |
| `anomaly-detection-service` | 9003 | Spring Boot (placeholder) | Future: real-time signalling anomaly detection |
| `rate-limiting-service` | 9004 | Spring Boot + Redis (Lua) | Token-bucket rate limiter |
| `distributed-tracing-service` | 9005 | Spring Boot (placeholder) | Future: Jaeger facade |
| `fault-injection-service` | 9006 | Spring Boot (placeholder) | Future: chaos / resilience testing |
| `messaging-service` | 9007 | Spring Boot + PostgreSQL + WebSocket | Direct messaging, real-time push |
| `ml-service` | 8000 | Django + TensorFlow + Prophet | LSTM / Prophet / ARIMA forecasting |

### 3.3 Data stores

| Store | Container | Host port | Used by |
|-------|-----------|-----------|---------|
| MySQL 8.4 | `roaming-mysql` | 3307 | roaming-analysis-service (6 tables: device, network_cell, roaming_cdr, attach_event, session_qos, handover_event) |
| Keycloak Postgres | `keycloak-postgres` | 5437 | Keycloak (realm, users, sessions) |
| Anomaly Postgres | `anomaly-postgres` | 5433 | anomaly-detection-service |
| Rate-limit Postgres | `ratelimit-postgres` | 5434 | rate-limiting-service (policies) |
| Tracing Postgres | `tracing-postgres` | 5435 | distributed-tracing-service |
| Fault Postgres | `fault-postgres` | 5436 | fault-injection-service |
| Messaging Postgres | `messaging-postgres` | 5438 | messaging-service (messages table) |
| Rate-limit Redis | `ratelimit-redis` | 6379 | rate-limiting-service (token buckets) |
| Anomaly Redis | `anomaly-redis` | 6380 | anomaly-detection-service (future: real-time windows) |
| MongoDB | `free5gc-db` | 27017 | free5GC (subscriber profiles, NF context) |

### 3.4 Security model

**Two separate token planes (important for the report):**
1. **Platform JWT** (Keycloak `auth-management` realm) — used by the Angular console and all Spring Boot services. Realm roles → `ROLE_*`, client permissions → `PERM_*`. Enforced at gateway (`SecurityConfig` WebFlux) and inside each service (`@PreAuthorize`).
2. **free5GC WebConsole JWT** — separate, internal. `Free5gcService` authenticates with stored credentials, caches the token (55-min TTL), uses `Token: <jwt>` header. Platform users never see these credentials.

**Four Keycloak roles:**
| Role | Key permissions | Frontend accent |
|------|----------------|----------------|
| PLATFORM_ADMIN | `users:*`, `roles:*`, `platform-config:*` | Red `#c7000b` |
| NETWORK_OPERATOR | `nf:read/restart`, `core-config:*` | Blue `#3491fa` |
| SECURITY_ANALYST | `security-alerts:read`, `roaming-events:read`, `detection-rules:*` | Green `#00a870` |
| AUDITOR | all `:read` perms + `audit:read` | Orange `#ff8f1f` |

### 3.5 free5GC integration

```
free5GC control-plane (Docker, Windows mode — no UPF)
├── NRF  :8000 → metrics :19001
├── AMF  :8001 → metrics :19002
├── SMF         → metrics :19003
├── AUSF        → metrics :19004
├── UDM         → metrics :19005
├── UDR         → metrics :19006
├── PCF         → metrics :19007
├── NSSF        → metrics :19008
└── WebConsole  :5000

Spring platform bridge:
  GET /api/5gc/nf-status       ← Free5gcService → WebConsole reachability
  GET /api/5gc/subscribers     ← Free5gcService → WebConsole /api/subscriber
  GET /api/5gc/ue-contexts     ← Free5gcService → WebConsole /api/registered-ue-context
  All gated by PERM_roaming-events:read
```

---

## Chapter 4 — Roaming Analysis Service (Detailed)

### 4.1 Data model

Six JPA entities loaded from `Data/Data/` CSV files (39 000+ records total):

| Entity | Table | Rows | Key fields |
|--------|-------|------|-----------|
| `Device` | `device` | 328 | device_id, manufacturer, model, 5g_supported |
| `NetworkCell` | `network_cell` | 253 | cell_id, operator_id, latitude, longitude, city |
| `RoamingCdr` | `roaming_cdr` | 10 000 | subscriber_imsi, home/visited_operator, call_type, charged_amount, fraud_flag |
| `AttachEvent` | `attach_event` | 13 455 | subscriber_imsi, attach_status, auth_failure_flag, registration_delay_ms |
| `SessionQos` | `session_qos` | 5 035 | cdr_id, latency_ms, avg_throughput_mbps, packet_loss_pct, drop_reason |
| `HandoverEvent` | `handover_event` | 10 591 | source/target_cell_id, handover_status, failure_cause |

Data ingestion: `CsvDataLoader` (CommandLineRunner, OpenCSV) — idempotent (loads only when table is empty). Configurable path: `roaming.data-dir`.

### 4.2 Projection layer

`RoamingEventProjection` builds **one `RoamingEvent` per `visitedOperator × hour`** bucket, cached lazily in memory. Each aggregate carries:
- `subscribers` = distinct IMSIs in that bucket
- `signalingErrors` = auth failures + attach rejects
- `newDeviceRatio` = `fraud_flag=true` CDRs ÷ total
- `impossibleTravel` = Haversine speed check between consecutive cell towers > 1000 km/h
- `avgLatencyMs`, `throughputMbps`, `droppedSessionRatio` from `session_qos`
- `revenueEur`, `costEur` = Σ from CDRs

### 4.3 Risk scoring algorithm (`RiskAnalyzer`)

Additive heuristic, 0–100 scale:

| Signal | Points | Rationale |
|--------|--------|-----------|
| Baseline | +5 | Every event has a baseline risk |
| Impossible travel | +40 | Strongest fraud signal |
| Signalling errors | +3 each, cap 21 | Auth failures / attach rejects |
| New-device ratio | × 25 | Fraud ratio from `fraud_flag` |
| Known-bad PLMN | +20 | `310-260` (US), `404-45` (India), `621-30` (Nigeria) |
| Very few subscribers | +8 | < 20 subscribers = targeted probing |

Score ≥ 60 → HIGH risk. Computed on every read, not stored.

### 4.4 Anomaly detection (`AnomalyDetector`)

Three combined layers → composite score 0–100:
1. **Fixed thresholds**: latency > 120 ms, drop > 15%, new-device > 40%, errors ≥ 6, impossible travel
2. **Risk score**: from `RiskAnalyzer` (≥ 60 flagged)
3. **Z-score**: per-metric mean+stddev across all events; flags if ≥ 2.5σ above population

`compositeScore = 0.5 × riskScore + min(50, deviationPoints) + 25 if impossibleTravel`

Events with composite < 35 are silently filtered. ≥ 75 or impossible travel → CRITICAL.

### 4.5 KPI computation (`KpiCalculator`)

Works on raw attach/CDR/session rows for a specific partner + time window:
- **Registration Success Rate** = successful attaches ÷ total attaches
- **ASR (Answer-Seizure Ratio)** = voice CDRs with duration > 0 ÷ total voice
- **NER (Network Effectiveness Ratio)** = CDRs with any network response ÷ total voice
- **ACD (Average Call Duration)** = total answered duration ÷ answered count
- **Latency P50/P95/P99**, **drop rate**, **throughput** from `session_qos`

### 4.6 ML forecasting integration

The `roaming-analysis-service` acts as proxy to the `ml-service` (Django, port 8000):
- `POST /api/roaming/forecast/train` → `POST http://ml-service:8000/api/train/`
- `GET /api/roaming/forecast/train/status` → `GET http://ml-service:8000/api/train/`
- `GET /api/roaming/forecast/ml?hoursAhead=6` → `POST http://ml-service:8000/api/forecast/`

Three models: LSTM (Keras, 100 epochs), Prophet (Facebook), ARIMA(2,1,2). Ensemble = average.

**Metrics (for PFE defense):**
- MAE: mean absolute error — lower is better
- RMSE: penalises large errors more — lower is better
- AIC (ARIMA): penalises complexity — lower is better
- final_loss (LSTM): MSE on training set — should decrease across epochs
- lookback (LSTM): `min(24, n//3)` time steps used as input

### 4.7 IREG Synthetic Test calls

Panel on the KPIs page (`/security/roaming/kpis`):
- Calls `POST /api/roaming/test-calls/run`
- Tests: REGISTRATION, SMS, DATA, MO CALL, MT CALL
- Results flagged `Synthetic_Test` — excluded from live KPI denominators (they only measure the signalling path, not real traffic)
- Frontend: summary cards (total/pass/fail/pass-rate/avg-latency), transaction-type badges, PASS/FAIL chips

### 4.8 API surface

All endpoints under `/api/roaming/` (17 total):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | GET | Filtered event list (direction, partnerPlmn, riskLevel) |
| `/events/{id}` | GET | Single event |
| `/summary` | GET | Dashboard aggregates |
| `/partners` | GET | Per-partner-PLMN roll-up |
| `/live` | GET | Real-time monitor |
| `/anomalies` | GET | Anomaly detection results |
| `/forecast` | GET | Linear regression forecast |
| `/experience` | GET | Customer experience score |
| `/qos` | GET | QoS overview |
| `/optimization` | GET | Agreement optimization recommendations |
| `/revenue` | GET | Revenue/cost/margin analysis |
| `/upload` | POST | CSV analysis (not persisted) |
| `/simulate` | POST | Synthetic event generation (persisted) |
| `/forecast/train` | POST | Trigger ML training |
| `/forecast/train/status` | GET | ML training status |
| `/forecast/ml` | GET | Multi-model ML forecast |
| `/test-calls/run` | POST | IREG synthetic test execution |

---

## Chapter 5 — Rate Limiting Service

### 5.1 Design

Implements an **atomic token-bucket rate limiter** using a Lua script on Redis. All bucket operations (refill + consume) happen in a single Redis round-trip, eliminating race conditions across service instances.

```
Lua script: token_bucket.lua
Input: key, capacity, refillTokens, refillIntervalMs, requestedTokens, now
Logic:
  1. Read current bucket state (tokens, lastRefillTime)
  2. Calculate elapsed time → refill tokens proportionally
  3. Cap at capacity
  4. If tokens >= requested: consume + save → ALLOW
  5. Else: save → DENY (return remaining tokens + retry-after)
  6. PEXPIRE the key to avoid stale Redis memory
```

**Fail-open design:** missing policy, disabled policy, or Redis error → request allowed. The limiter can never take the platform down.

### 5.2 Policy model

Seeded policies (`PolicySeeder` on empty table):
| keyType | capacity | refillTokens | refillIntervalMs | action |
|---------|----------|-------------|-----------------|--------|
| `default` | 100 | 100 | 60000 | THROTTLE |
| `imsi` | 20 | 20 | 60000 | BLOCK |
| `operator` | 2000 | 2000 | 60000 | THROTTLE |
| `ip` | 300 | 300 | 60000 | THROTTLE |

### 5.3 API

All at `/api/protection/`, JWT-gated (reuses `PERM_roaming-events:read` and `PERM_detection-rules:write`):
- `POST /check` — evaluate + consume tokens; returns 200 OK or 429 with `Retry-After`/`X-RateLimit-Remaining`
- `GET /policies` — list all policies
- `PUT /policies/{keyType}` — create/replace a policy (`detection-rules:write`)
- `DELETE /policies/{keyType}` — delete a policy (`detection-rules:write`)
- `GET /stats?topN=` — allowed/blocked counts, block-rate %, top offenders ZSET
- `GET /health` — public liveness probe

### 5.4 Key decision: stay advisory (ADR-11 lesson)
A gateway-level `RateLimitGlobalFilter` was tried and reverted: it added a synchronous hop to a potentially-down service on every request. Lesson: never add a blocking call to a maybe-down dependency on the gateway hot path.

---

## Chapter 6 — Messaging Service

Direct 1:1 messaging between platform users. Real-time push via native WebSocket (no STOMP/SockJS).

### 6.1 Backend design
- `Message` entity: sender/recipient = usernames, `is_read` flag, timestamp, text content
- Sender identity taken from JWT `preferred_username` — never from request body (anti-spoofing)
- User only sees threads they are a party to

### 6.2 Real-time notifications (ADR-14)
- Native WebSocket at `/ws/notifications` in `messaging-service`
- Handshake authenticates via `?token=<JWT>` query param (browsers can't set `Authorization` header on WS)
- `NotificationSocketHandler`: `Map<username, Set<WebSocketSession>>` — multi-tab support
- On `MessageService.send()` — pushes `NotificationDto { type, from, preview, at }` to recipient's open sessions
- Gateway proxies via `lb:ws://messaging-service`
- Angular: `core/notifications.service.ts` — native `WebSocket`, auto-reconnect 5s, `items` + `unread` signals; topbar bell shows live count + dropdown

---

## Chapter 7 — Observability Stack

### 7.1 Architecture

```
Spring Boot JARs (host) ─── Loki4j appender ──────────────────────► Loki :3100
Spring Boot JARs (host) ─── OTel agent (OTLP) ────────────────────► Tempo :4317
Spring Boot JARs (host) ─── /actuator/prometheus ─────────────────► Prometheus :9090 (via host.docker.internal)
free5GC NFs (Docker)   ─── /metrics :19001-19008 ─────────────────► Prometheus :9090
free5GC NFs (Docker)   ─── fluentd driver → Fluent Bit :24224 ────► Loki :3100
Docker containers      ─── Fluent Bit :24224 ──────────────────────► Loki :3100
All data               ──────────────────────────────────────────────► Grafana :3000
```

**Key implementation note:** Spring Boot JARs run on the host, not in Docker. They cannot use Fluent Bit (container-only). Solution: **Loki4j** (`com.github.loki4j:loki-logback-appender:1.5.2`) embedded in each service, pushing JSON logs directly to Loki.

### 7.2 Grafana dashboards

Three dashboards provisioned from `grafana-dashboard/`:
1. **Business Services** — cross-service board: fleet overview, per-service health table, traffic, latency, JVM, errors, data layer, business endpoints. `$service` template variable (multi+All).
2. **Redis and Storage** — Redis (both instances), PostgreSQL (keycloak + ratelimit), MySQL (roaming), HikariCP pools.
3. **free5GC — 5G Core Network Functions** — NF health stats (8 panels, green=UP/red=DOWN), SBI traffic, P95/P50 latency, error rate, Loki log stream.

### 7.3 Prometheus scrape targets
- 9 Spring Boot services: gateway, eureka, auth, roaming, anomaly, rate-limiting, tracing, fault, messaging (via `host.docker.internal`)
- 8 free5GC NFs: NRF(19001) through NSSF(19008) (via `host.docker.internal`)
- Exporters: `redis-exporter` (multi-target), `postgres-exporter` (keycloak + ratelimit), `mysqld-exporter` (roaming)

### 7.4 Datasource UIDs (for Grafana JSON)
- `prometheus` → Prometheus at `http://prometheus:9090`
- `loki` → Loki at `http://loki:3100`
- `tempo` → Tempo at `http://tempo:3200`

---

## Chapter 8 — Angular Console

### 8.1 Architecture
- **Angular 22** — standalone components, no NgModules
- **Signals** for reactive state (`signal()`, `computed()`, `input()`)
- **Lazy-loaded routes** (`loadComponent`) — one chunk per page
- No external chart library — hand-rolled SVG charts (bundle: ~236 kB initial)
- Design system: "Huawei console" look — CSS custom properties, `#c7000b` brand red, `HarmonyOS Sans`

### 8.2 Role-based routing
| URL prefix | Role | Pages |
|-----------|------|-------|
| `/admin/**` | PLATFORM_ADMIN | Dashboard, Users, Roles & Permissions, System Health, API Metrics |
| `/operator/**` | NETWORK_OPERATOR | Dashboard, Network Functions (live 5GC), Core Config |
| `/security/**` | SECURITY_ANALYST | Dashboard, Security Alerts, Roaming (8 sub-pages), Rate Limiting, 5G Core, Detection Rules |
| `/audit/**` | AUDITOR | Dashboard, Audit Logs |

### 8.3 Live pages (all wired to real backend)
- **Admin:** Users CRUD, Dashboard (user growth chart), System Health, API Metrics
- **Security Analyst:** all 8 Roaming pages, Rate Limiting, 5G Core
- **Network Operator:** Network Functions (live NF status + subscribers + UE sessions)
- **All roles:** Messages (direct messaging), real-time notification bell (WebSocket)

### 8.4 Custom chart components (`shared/charts/`)
| Component | Use |
|-----------|-----|
| `hw-line-chart` | Time series, area fill, optional Catmull-Rom smooth |
| `hw-bar-chart` | Categorical comparisons, vertical bars |
| `hw-donut-chart` | Part-of-whole, center label, legend |
| `hw-gauge-chart` | 270° radial 0-100, auto red→amber→green gradient |
| `hw-multi-line-chart` | Multiple series (ML forecast: LSTM/Prophet/ARIMA/Ensemble) + divider line |

### 8.5 Auth flow
1. `POST /api/auth/login` → `{ status, accessToken? }`:
   - `SUCCESS` → store JWT, route to role dashboard
   - `PASSWORD_CHANGE_REQUIRED` → redirect to `/first-login` with `firstLoginToken`
   - `EMAIL_VERIFICATION_REQUIRED` → show banner
2. JWT stored in `localStorage`; `auth.interceptor.ts` attaches `Bearer` to all `/api/*` calls
3. `authGuard` + `roleGuard(role)` on every role route; decoded permissions (`platform-client` roles) → `hasPermission()` for fine-grained UI gating

---

## Chapter 9 — Deployment & Infrastructure

### 9.1 Local development (recommended)
```bash
# 1. Start infrastructure (stateful + observability + optional 5GC)
./infra.sh up              # Keycloak + DBs + observability
./infra.sh up --5gc        # + free5GC control-plane

# 2. Start ML service (Python, Docker only)
docker compose -f docker/docker-compose-infra.yml up ml-service -d

# 3. Run Spring Boot services as local JARs
./run.sh --no-build        # eureka + gateway + auth
java -jar microservices/roaming-analysis-service/target/*.jar
java -jar microservices/rate-limiting-service/target/*.jar
java -jar microservices/messaging-service/target/*.jar

# 4. Start Angular frontend
cd Frontend && npm start
```

### 9.2 Docker Compose files
| File | Purpose |
|------|---------|
| `docker/docker-compose-infra.yml` | Keycloak, all DBs, Redis, ml-service |
| `docker/docker-compose-observability.yml` | Prometheus, Grafana, Loki, Tempo, Fluent Bit, exporters |
| `docker/docker-compose-base.yml` | All Spring Boot app services (for full-Docker mode) |
| `docker/docker-compose-5gc.yml` | free5GC NFs + WebConsole + MongoDB |

### 9.3 Kubernetes (partial)
Each service has `kubernetes/deployment.yml` + `service.yml`. `Tiltfile` for local k8s dev loop (Minikube). Currently covers only eureka + gateway + auth — DBs and newer services not yet in k8s.

### 9.4 Network topology
All Docker containers share a single bridge network `docker_shared-network` (created by infra compose, joined by observability and app composes as `external`). free5GC additionally uses a private `privnet` (10.100.200.0/24) for NF-to-NF SBI communication, with DNS aliases (`nrf.free5gc.org`, `amf.free5gc.org`, etc.).

---

## Chapter 10 — Results & Validation

### 10.1 Roaming analytics
- **39 000+ real records** processed from 6 CSV files
- Risk scorer correctly identifies impossible-travel events and known-bad PLMNs
- Anomaly detector produces composite scores + per-metric z-score reasons
- KPI calculator produces Registration Success Rate, ASR, NER, ACD per partner
- All analytics endpoints live in the Security Analyst console

### 10.2 ML forecasting results
- Training: 80/20 train/test split
- Three models trained: LSTM, Prophet, ARIMA
- Ensemble prediction averages all three models
- Metrics displayed in the UI: MAE, RMSE, AIC, final_loss, lookback
- Angular shows a multi-line chart with history/prediction divider

### 10.3 free5GC integration
- 8 control-plane NFs running on Windows (no UPF) via Docker Compose
- Prometheus scraping all 8 metric endpoints (NRF=19001 … NSSF=19008)
- `up{free5gc="true"}` = 1 for all 8 NFs (confirmed via Prometheus)
- `free5gc_sbi_inbound_request_total` confirmed with real SBI traffic
- Grafana dashboard provisioned and showing live data
- NF status visible in Security Analyst and Network Operator consoles
- Subscriber list and UE sessions from WebConsole proxy

### 10.4 Rate limiting
- Atomic Lua token-bucket validated: ALLOW/DENY decisions consistent across concurrent requests
- Seeded policies cover default, per-IMSI, per-operator, per-IP
- Frontend policy CRUD + decision tester verified (200 OK vs 429)
- `PLATFORM_ADMIN` correctly denied (403) on policy writes — verified live

### 10.5 Observability
- Prometheus UP for all services + 8 free5GC NFs
- Grafana dashboards: Business Services, Redis & Storage, free5GC NF Status
- Loki receiving logs from Spring Boot JARs (Loki4j) + free5GC containers (fluentd)
- Tempo receiving traces via OpenTelemetry agent
- Redis, Postgres, MySQL metrics via dedicated exporters

---

## Chapter 11 — Architecture Decisions (ADRs)

| ADR | Decision | Why |
|-----|---------|-----|
| ADR-01 | Tracing backend = Tempo; Jaeger = placeholder | Tempo already wired to Grafana |
| ADR-02 | Risk scoring = heuristic (not ML) | Explainable baseline; ML can replace `AnomalyDetector` later |
| ADR-03 | In-memory OTP/token stores | Simplest for single instance; swap for Redis before scaling |
| ADR-04 | Own email-verification flow | Avoid Keycloak's themed pages |
| ADR-05 | State-aware login (3 statuses) | Keycloak returns `invalid_grant` after password accepted — need Admin API inspection |
| ADR-06 | auth-service is thin over Keycloak | Don't reimplement IAM |
| ADR-07 | Permission-based RBAC (`PERM_*`) at gateway + service | Roles can change in Keycloak without code change |
| ADR-08 | Empty placeholder services carry no security/JPA | No protected data yet |
| ADR-09 | Database-per-service | Microservices pattern; independent evolution |
| ADR-10 | Keycloak persisted to dedicated Postgres | Survive `infra.sh down`; only `down -v` wipes |
| ADR-11 | ~~Gateway GlobalFilter for rate limiting~~ REVERTED | Sync hop to a maybe-down service blocked everything |
| ADR-12 | API DTOs are records, not JPA entities | JPA entities have no setters → Jackson fails on read |
| ADR-13 | Use free5GC as 5G Core; this repo = harness | Proposal contribution is the 3 added layers, not building NFs |
| ADR-14 | WebSocket auth via `?token=` query param | Browsers can't set `Authorization` header on WS |

---

## Conclusion & Future Work

### What was achieved
- A complete cloud-native 5G management platform with 9 microservices, an Angular console, a Django ML service, and free5GC integration
- Real roaming analytics pipeline on 39 000 records with risk scoring, anomaly detection, KPIs, and ML forecasting
- Full observability: Prometheus scraping 17 targets (9 services + 8 NFs), 3 Grafana dashboards, Loki logs, Tempo traces
- Permission-based RBAC with 4 roles and a multi-page Angular console per role
- Atomic Redis rate limiter with Lua script and full CRUD from the console
- Direct messaging with real-time WebSocket push notifications
- free5GC 5G Core integration: 8 NF metrics, log shipping, Grafana dashboard, Angular pages

### Future work (prioritized)
1. **Linux deployment + UPF:** enable full user-plane traffic with UERANSIM gNB/UE simulation
2. **Layer 01 — Zero-Trust SBI:** enable free5GC SBI TLS + NRF OAuth2 (SEC-01/SEC-02)
3. **Layer 02 — Real anomaly detection:** `anomaly-detection-service` consuming free5GC signalling metrics/logs
4. **Layer 03 — Conformance testing:** scenario runner driving UERANSIM through TC-01→PERF-02
5. **Real NRF facade:** replace WebConsole-reachability proxy with `GET /api/nf/*` from NRF `nnrf-nfm/v1/nf-instances`
6. **Service mesh:** Istio/Linkerd or Cilium/eBPF for mTLS between NF containers
7. **Kubernetes full deployment:** StatefulSets for all databases + newer services

---

## Key technical terms (glossary for report)

| Term | Definition |
|------|-----------|
| **5GC** | 5G Core — the control-plane and user-plane of a 5G mobile network |
| **NF** | Network Function — an addressable service in the 5GC (AMF, SMF, etc.) |
| **SBI** | Service-Based Interface — HTTP/2 REST API between 5GC NFs |
| **NRF** | Network Repository Function — the NF registry and OAuth2 AS in 5GC |
| **AMF** | Access and Mobility Management Function — handles UE registration and mobility |
| **SMF** | Session Management Function — controls PDU sessions |
| **UPF** | User Plane Function — forwards user data; needs `gtp5g` Linux kernel module |
| **AUSF** | Authentication Server Function — runs 5G-AKA |
| **UDM/UDR** | Unified Data Management/Repository — subscriber profiles + auth vectors |
| **PCF** | Policy Control Function — QoS and charging policies |
| **NSSF** | Network Slice Selection Function — selects the slice for a UE |
| **PLMN** | Public Land Mobile Network — identified by MCC-MNC (e.g. 208-01) |
| **CDR** | Call Detail Record — a billing record for a subscriber event |
| **TAP/RAP** | Transfer Account Procedure / Returned Account Procedure — roaming billing exchange formats |
| **IMSI** | International Mobile Subscriber Identity — unique subscriber ID |
| **MSISDN** | Mobile Subscriber ISDN Number — the phone number |
| **AKA** | Authentication and Key Agreement — the 5G authentication protocol |
| **PDU session** | Packet Data Unit session — the data bearer between UE and the network |
| **gNB** | Next-generation NodeB — the 5G base station |
| **UERANSIM** | UE and RAN Simulator — open-source 5G UE + gNB simulator |
| **RBAC** | Role-Based Access Control |
| **OIDC** | OpenID Connect — identity layer on top of OAuth2 |
| **JWT** | JSON Web Token — the bearer token used across the platform |
| **LSTM** | Long Short-Term Memory — a type of recurrent neural network for time series |
| **ARIMA** | AutoRegressive Integrated Moving Average — classical statistical forecasting |
| **MAE** | Mean Absolute Error — average absolute prediction error |
| **RMSE** | Root Mean Squared Error — penalises large prediction errors |
| **AIC** | Akaike Information Criterion — penalises model complexity |
| **KPI** | Key Performance Indicator — e.g. Registration Success Rate, ASR, NER |
| **ASR** | Answer-Seizure Ratio — fraction of voice calls that were answered |
| **NER** | Network Effectiveness Ratio — fraction of calls with any network response |
| **ACD** | Average Call Duration |
| **z-score** | Number of standard deviations from the population mean — used for anomaly detection |

---

## References (to complete)

- 3GPP TS 23.501 — System architecture for 5G system
- 3GPP TS 33.501 — Security architecture and procedures for 5G system
- 3GPP TS 23.502 — Procedures for the 5G system
- free5GC project: https://free5gc.org / https://github.com/free5gc/free5gc
- Spring Cloud Gateway documentation
- Keycloak documentation
- TensorFlow / Keras LSTM documentation
- Facebook Prophet: Taylor & Letham (2018) "Forecasting at Scale"
- Box, Jenkins, Reinsel — "Time Series Analysis: Forecasting and Control" (ARIMA)
- Prometheus documentation
- Grafana Loki documentation
