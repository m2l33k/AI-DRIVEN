# 5G Core Telecom Management Platform

A **5G Core (5GC) telecom management platform**, built as Spring Boot / Spring Cloud
microservices with a role-based Angular console on top. It provides:

- Service discovery (Netflix Eureka)
- A single secured API gateway (Spring Cloud Gateway)
- OAuth2/OIDC authentication with Keycloak and a permission-based RBAC model
- Business microservices: **auth & user management**, **5G roaming analysis / risk scoring**,
  a standalone **rate-limiting** service, **direct messaging** (with live WebSocket
  notifications), and placeholders for **anomaly detection**, **distributed tracing**, and
  **fault injection**
- A role-aware **Angular 22** operator console
- Full observability (metrics, logs, traces)
- Docker Compose and Kubernetes/Tilt local deployment workflows

> Operators run the 5G Core, security analysts watch signalling/roaming threats, admins
> manage users & platform config, and auditors have read-only visibility including audit logs.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Diagrams](#architecture--diagrams)
- [Project Structure](#project-structure)
- [Services & Ports](#services--ports)
- [Databases](#databases)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Frontend Console](#frontend-console)
- [Run with Kubernetes + Tilt](#run-with-kubernetes--tilt)
- [Core Endpoints](#core-endpoints)
- [Security & Roles](#security--roles)
- [Observability](#observability)
- [Adding a New Service](#adding-a-new-service)
- [Troubleshooting](#troubleshooting)

---

## Overview

The platform consists of these components:

**Platform (Spring Cloud)**
- **Eureka Server** — service discovery / registry (Netflix Eureka), port `8761`
- **Gateway Service** — single entry point + request routing; OAuth2 resource server with
  RBAC, aggregates each service's Swagger, and hosts `GET /api/metrics/overview` (queries
  Prometheus for the admin System Health page), port `9000`

**Business microservices**
- **Auth Service** (`9001`) — Keycloak-backed authentication & user management: state-aware
  login, first-login password change, OTP self-service reset, emailed temp passwords, our own
  email-verification flow
- **Roaming Analysis Service** (`9002`) — 5G roaming events + partner-PLMN risk scoring and
  analytics (real-time monitoring, anomaly detection, forecasting, QoS, commercial), CSV upload
  and event simulation, persisted in MySQL
- **Anomaly Detection Service** (`9003`) — placeholder (health-check only) for real-time
  signalling/roaming anomaly detection
- **Rate-Limiting Service** (`9004`) — standalone, advisory Redis token-bucket rate limiter with
  policies in Postgres (`/api/protection/*`)
- **Distributed Tracing Service** (`9005`) — placeholder (health-check only), Jaeger facade
- **Fault-Injection Service** (`9006`) — placeholder (health-check only) for chaos/resilience
  testing
- **Messaging Service** (`9007`) — direct 1:1 user messaging with live push over a native
  WebSocket (`/ws/notifications`)

**Platform infrastructure**
- **Keycloak** — identity provider (authn) and source of roles/permissions (authz), port `8081`
- **Frontend** — Angular 22 role-based console (`Frontend/`)
- **Observability stack** — Prometheus, Grafana, Loki, Tempo, Fluent Bit, OpenTelemetry

---

## Architecture & Diagrams

Infrastructure design and the full service catalogue live in
[`Noted/diagram/`](Noted/diagram/) as PlantUML (with rendered images in
[`Noted/Assets/`](Noted/Assets/)):

- [`infrastructure.puml`](Noted/diagram/infrastructure.puml) — end-to-end deployment topology
  on the Docker `shared-network`.
- [`services.puml`](Noted/diagram/services.puml) — service catalogue grouped by tier.
- [`Noted/diagram/README.md`](Noted/diagram/README.md) — render instructions + full service table.

### Infrastructure — deployment topology

![Infrastructure](Noted/Assets/infra%205GC.png)

### Service catalogue

![Services](Noted/Assets/service%20infra.svg)

Deeper documentation (auth/RBAC flows, endpoints, report) is under [`Noted/`](Noted/), and a
detailed project memory vault is in [`memory/`](memory/) (open as an Obsidian vault). Start with
[`memory/Project-Overview.md`](memory/Project-Overview.md).

---

## Project Structure

```
.
├── pom.xml                            # parent (aggregator) pom (Maven multi-module)
├── util/                              # shared library module
├── spring-cloud/
│   ├── eureka-server/                 # service discovery server (port 8761)
│   └── gateway-service/               # API gateway + RBAC + metrics endpoint (port 9000)
├── microservices/
│   ├── auth-service/                  # Keycloak-backed auth & user management (9001)
│   ├── roaming-analysis-service/      # 5G roaming events + risk scoring (9002, MySQL)
│   ├── anomaly-detection-service/     # placeholder — health only (9003, Postgres+Redis)
│   ├── rate-limiting-service/         # Redis token-bucket limiter (9004, Postgres+Redis)
│   ├── distributed-tracing-service/   # placeholder — health only (9005, Postgres)
│   ├── fault-injection-service/       # placeholder — health only (9006, Postgres)
│   └── messaging-service/             # direct messaging + WebSocket (9007, Postgres)
├── Frontend/                          # Angular 22 role-based console
├── keycloak/
│   ├── platform-realm.json            # importable realm: roles, client, test users
│   ├── export-realm.{ps1,sh}          # export the running realm (config-as-code)
│   └── configure-smtp.{ps1,sh}        # set realm SMTP via the Admin API
├── api-specs/                         # OpenAPI contracts + Bruno API collection
├── docker/                            # docker-compose files (infra, observability, base)
├── grafana-dashboard/                 # Grafana dashboards
├── kubernetes/                        # infrastructure manifests
├── Noted/                             # documentation set (diagrams, report, deep-dive)
├── memory/                            # project memory vault (Obsidian)
├── Tiltfile                           # Tilt config for Minikube workflow
├── infra.sh                           # bring infra + observability up/down
├── build-images.sh                    # builds service images into Minikube's docker
├── run.sh                             # local / docker run helper
└── SECURITY.md                        # RBAC roles & permission model
```

---

## Services & Ports

Local = running on the host; Docker = the container name on `shared-network`.

| Component | Local port | Docker | Key paths |
|-----------|-----------|--------|-----------|
| Eureka server | `8761` | `eureka-server:8761` | dashboard `/` |
| Gateway service | `9000` | `gateway-service:9000` | all `/api/**`, `GET /api/metrics/overview` |
| Auth service | `9001` | `auth-service:9001` | `/api/auth/**`, `/api/users/**` |
| Roaming analysis service | `9002` | `roaming-analysis-service:9002` | `/api/roaming/**` |
| Anomaly detection service | `9003` | `anomaly-detection-service:9003` | `/api/anomaly/health` |
| Rate-limiting service | `9004` | `rate-limiting-service:9004` | `/api/protection/**` |
| Distributed tracing service | `9005` | `distributed-tracing-service:9005` | `/api/tracing/health` |
| Fault-injection service | `9006` | `fault-injection-service:9006` | `/api/fault/health` |
| Messaging service | `9007` | `messaging-service:9007` | `/api/messages/**`, `/ws/notifications` |
| Frontend (Angular dev) | `4200` | — | proxies `/api` → gateway `:9000` |

---

## Databases

Keycloak and each stateful service owns a **dedicated database container**
(database-per-service). Redis is added only where needed (rate-limit counters, anomaly windows).

| Component | Local port | Docker | Details |
|-----------|-----------|--------|---------|
| Keycloak Postgres | `5437` | `keycloak-postgres:5432` | `keycloak_db` (persists realm + users) |
| Roaming MySQL | `3307` | `roaming-mysql:3306` | `roaming_db`, user/pass `roaming` |
| Anomaly Postgres | `5433` | `anomaly-postgres:5432` | `anomaly_db` |
| Rate-limit Postgres | `5434` | `ratelimit-postgres:5432` | `ratelimit_db` |
| Tracing Postgres | `5435` | `tracing-postgres:5432` | `tracing_db` |
| Fault Postgres | `5436` | `fault-postgres:5432` | `fault_db` |
| Messaging Postgres | `5438` | `messaging-postgres:5432` | `messaging_db` |
| Rate-limit Redis | `6379` | `ratelimit-redis:6379` | token-bucket counters |
| Anomaly Redis | `6380` | `anomaly-redis:6379` | real-time windows |
| Postgres / MongoDB | `5432` / `27017` | `postgres` / `mongodb` | legacy / optional |

> The placeholder services (anomaly, tracing, fault) create no tables until real logic lands
> (`ddl-auto=update`, no entities yet), but Postgres **must be up at startup**. Redis is lazy
> (Lettuce) and won't block startup.

---

## Tech Stack

- **Java 17**, **Spring Boot 4.0.x**, **Spring Cloud 2025.1.x**
- **Netflix Eureka** (service discovery)
- **Spring Cloud Gateway** (routing, WebFlux)
- **Keycloak** (OAuth2/OIDC) backed by **Postgres**
- **MySQL 8.4** (roaming persistence), **Postgres** (per-service), **Redis** (rate limiting,
  anomaly windows), JPA/Hibernate
- **Native WebSocket** (messaging notifications)
- **Angular 22** (frontend console — standalone components, signals, lazy routes)
- **OpenTelemetry**, **Prometheus**, **Grafana**, **Loki**, **Tempo**, **Fluent Bit**
- **Docker Compose** and **Kubernetes (Minikube + Tilt)**

---

## Prerequisites

- Java 17+
- Maven 3.8+ (a `mvnw` wrapper is included)
- Node.js 20+ (for the Angular frontend)
- Docker + Docker Compose
- (Optional) Minikube + Tilt for Kubernetes mode
- curl or HTTPie for API validation

---

## Quick Start

The recommended local workflow is: **infrastructure in Docker, application services as local
JARs.** This mirrors how the platform is developed — Docker runs only the stateful/infra
containers (Keycloak, databases, observability), while the Spring Boot services run on the host
so you can iterate in an IDE.

### 1) Start the infrastructure

```bash
./infra.sh up
```

This brings up Keycloak (+ `keycloak-postgres`), the per-service Postgres/Redis, `roaming-mysql`,
and the full observability stack (Prometheus, Grafana, Loki, Tempo, Fluent Bit). Keycloak admin
console: `http://localhost:8081` (admin/admin). The realm (`auth-management`, client
`platform-client`, test users) is imported automatically on a fresh Keycloak.

> ⚠️ Never run `./infra.sh down -v` casually — it wipes the Keycloak Postgres volume (and your
> accounts). Use `./infra.sh down` to stop without deleting data.

> **Email:** auth-service reads `MAIL_USERNAME` / `MAIL_PASSWORD` (a Gmail App Password, no
> spaces) from a gitignored repo-root `.env` (see `.env.example`) for OTP + temp-password
> emails. `run.sh` loads it; Compose passes it through.

### 2) Build and run the application services

Build all modules once:

```bash
./mvnw clean package -DskipTests
```

Then run each service (Eureka first). `run.sh` starts **eureka + auth + gateway** for you:

```bash
./run.sh --no-build      # run the already-built JARs
# or ./run.sh            # build then run
```

Start the remaining services (roaming `9002`, rate-limiting `9004`, messaging `9007`, and the
placeholders `9003/9005/9006`) from your IDE or manually — `run.sh` only launches the original
three:

```bash
java -jar microservices/roaming-analysis-service/target/*.jar
java -jar microservices/rate-limiting-service/target/*.jar
java -jar microservices/messaging-service/target/*.jar
# …and the anomaly / tracing / fault placeholders as needed
```

Verify:

- Eureka dashboard: `http://localhost:8761`
- Gateway health: `http://localhost:9000/actuator/health`

### Alternative: everything in Docker

To run the application services in containers instead of local JARs:

```bash
./run.sh docker          # package, then docker compose up the base stack
```

---

## Frontend Console

The Angular 22 console lives in [`Frontend/`](Frontend/) and proxies `/api` (and `/ws`) to the
gateway/messaging service via `Frontend/proxy.conf.json` — no CORS setup needed.

```bash
cd Frontend
npm install
npm start          # ng serve with the proxy → http://localhost:4200
```

Log in with a Keycloak test user (see [Security & Roles](#security--roles)); the console routes
to the right dashboard per role. Highlights:

- **Admin** — users management (live CRUD), roles matrix, System Health, API Metrics dashboards
- **Security Analyst** — Roaming group (Overview, Events, Anomalies, Partners, QoS, Revenue,
  Tools — all live) and a live Rate Limiting page (policy CRUD + decision tester)
- **Messaging** — a shared direct-message page available to every role, with a topbar
  notification bell driven by a live WebSocket
- **Design** — a custom, dependency-free "Huawei console" look with hand-rolled SVG charts

Build a production bundle with `npm run build`.

---

## Run with Kubernetes + Tilt

> Note: the Tilt/Minikube path currently wires **eureka + gateway + auth** only; the newer
> services and per-service Postgres/Redis are not yet expressed as k8s manifests.

### 1) Start Minikube

```bash
minikube start \
  --profile=microservice-deployment \
  --memory=4g \
  --cpus=4 \
  --disk-size=30g \
  --kubernetes-version=v1.31.0 \
  --driver=docker
```

### 2) Enable ingress

```bash
minikube addons enable ingress --profile microservice-deployment
```

### 3) Use the Minikube Docker daemon

```bash
eval $(minikube -p microservice-deployment docker-env)
```

### 4) Build images

```bash
sh build-images.sh
```

### 5) Start the platform with Tilt

```bash
tilt up
```

---

## Core Endpoints

> All business routes go through the gateway at `:9000`.

- **Eureka dashboard**: `http://localhost:8761`
- **Gateway**: `http://localhost:9000`
- **Auth service** (`/api/auth`, `/api/users`) — login, first-login, OTP reset, email verify,
  user CRUD, plus a lightweight `/api/users/directory` (any authenticated user)
- **Roaming analysis** (`/api/roaming`) — `/events`, `/summary`, `/partners`, `/live`,
  `/anomalies`, `/forecast`, `/experience`, `/qos`, `/optimization`, `/revenue`, `POST /upload`
  (CSV), `POST /simulate`
- **Rate limiting** (`/api/protection`) — `/check`, `/policies` (GET/PUT/DELETE), `/stats`,
  `/health`
- **Messaging** (`/api/messages`) — send, `/conversations`, `/conversation/{peer}`,
  `/unread-count`; live push at **`/ws/notifications?token=<JWT>`**
- **Placeholders** — `/api/anomaly/health`, `/api/tracing/health`, `/api/fault/health`
- **Gateway metrics** — `GET /api/metrics/overview` (`PERM_platform-config:read`)

Swagger is aggregated per service under `/<service-id>/v3/api-docs`. Actuator/metrics on every
service: `GET /actuator/health`, `GET /actuator/prometheus`.

A ready-to-use **Bruno** API collection lives in [`api-specs/bruno/`](api-specs/bruno/)
(`AccessToken.bru` grabs a JWT you can paste into Swagger's Authorize dialog).

---

## Security & Roles

Keycloak is the identity provider; authorization uses a **permission-based RBAC** model
enforced at the gateway **and** inside services. Roles are Keycloak composite realm roles that
aggregate fine-grained permissions (client roles on `platform-client`). Realm role names map to
`ROLE_*` and client permissions to `PERM_*` authorities.

| Role | Can do | Cannot do |
|------|--------|-----------|
| `PLATFORM_ADMIN` | Manage users, roles, platform config | Operate the 5GC; manage rate-limit policies |
| `NETWORK_OPERATOR` | View NF status, restart NFs, apply config to the core | Manage users, delete audit logs |
| `SECURITY_ANALYST` | View security alerts, roaming events, tune detection & rate-limit rules | Change network config |
| `AUDITOR` | Read everything, including audit logs | Write anything, anywhere |

Notes:
- **Rate limiting is a `SECURITY_ANALYST` concern.** It reuses existing permissions
  (reads → `roaming-events:read`; writes → `detection-rules:write`) so the realm is untouched —
  `PLATFORM_ADMIN` cannot manage policies by design.
- **Messaging is open to any authenticated user** — the sender is taken from the JWT (never the
  request body), so senders can't be spoofed.
- **`/ws/**` is not RBAC-gated**: the WebSocket handshake self-authenticates via a `?token=<JWT>`
  query param and only delivers notifications addressed to that user.
- `audit:delete` is defined but granted to nobody by design (audit logs are immutable).

Full permission catalog, role→permission mapping, and enforcement details are in
[SECURITY.md](SECURITY.md).

### Get a token and call the gateway

The realm (`auth-management`, client `platform-client`, one test user per role with password
`password`) is imported automatically with Keycloak.

```bash
# 1) Get a bearer token
curl -X POST http://localhost:8081/realms/auth-management/protocol/openid-connect/token \
  -d grant_type=password \
  -d client_id=platform-client \
  -d client_secret=platform-client-secret \
  -d username=operator-user -d password=password \
  -d scope="openid profile email roles"

# 2) Call the gateway
curl http://localhost:9000/api/roaming/summary -H "Authorization: Bearer <token>"
```

> Change the client secret and default passwords before any non-local use.

---

## Observability

- **Prometheus** — scrapes `/actuator/prometheus`. When services run locally it reaches them via
  `host.docker.internal` (gateway, eureka, auth, roaming); check targets are **UP**.
- **Grafana** (admin/admin) — dashboards for metrics/logs/traces correlation
  (`grafana-dashboard/`).
- **Fluent Bit + Loki** — Fluent Bit forwards service logs to Loki.
- **Tempo + OpenTelemetry** — services export traces via the OTel agent to Tempo.

---

## Adding a New Service

1. Scaffold a module with `create-project.sh` (or copy an existing one) under
   `microservices/<name>` (package `io.javatab.microservices.<name>`) and register it in the
   parent `pom.xml` `<modules>`.
2. Add the standard deps (web, security, oauth2-resource-server, validation, eureka-client,
   springdoc, actuator, micrometer-prometheus) and a `SecurityConfig` (JWT resource server;
   realm roles → `ROLE_*`, perms → `PERM_*`; actuator + docs public, rest authenticated).
3. Point `eureka.client.service-url.defaultZone` at the Eureka server (default + `docker`
   profiles).
4. Add gateway routes (both profiles) + a Swagger aggregation entry, and whitelist any public
   paths at **both** the gateway and the service.
5. If it needs storage, add a dedicated DB container to `docker/docker-compose-infra.yml`
   (database-per-service) and wire the datasource in `application.yml` (default + `docker`).
6. Wire it into `docker/docker-compose-base.yml`, `build-images.sh`, the `Tiltfile`, add
   `kubernetes/deployment.yml` & `service.yml`, and add a Prometheus scrape target.
7. Protect endpoints with `@PreAuthorize("hasAuthority('PERM_...')")`.

---

## Troubleshooting

- **Service won't register with Eureka**: confirm Eureka is up at `:8761` and the client's
  `defaultZone` (or `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`) is correct.
- **Auth issues (401/403)**: check token expiry, that the realm was imported, and that the
  user's role carries the required `PERM_*` permission (see [SECURITY.md](SECURITY.md)). A public
  path must be permitted at **both** the gateway and the service; a stale Swagger bearer token
  also causes 401 on permitAll paths — log out first.
- **`Connection refused` on a DB port at service startup**: the infra DB isn't up yet. Run
  `./infra.sh up` before the services (there's no cross-file `depends_on` between infra and app
  compose). To bring up a single DB without touching the rest:
  `docker compose -f docker/docker-compose-infra.yml up -d --no-deps <db-service>`.
- **Emails not sending**: ensure `MAIL_USERNAME` / `MAIL_PASSWORD` (Gmail App Password, no
  spaces) are set in the repo-root `.env`.
- **Roaming service DB errors**: ensure `roaming-mysql` is up (host port `3307`) and reachable
  (`jdbc:mysql://localhost:3307/roaming_db`, user/pass `roaming`/`roaming`).
- **Lost Keycloak users after a restart**: you likely ran `./infra.sh down -v`, which wipes the
  `keycloak-postgres` volume. Use `./infra.sh down` instead, and keep the realm exported via
  `keycloak/export-realm.{ps1,sh}`.
- **No logs/traces/metrics**: ensure Fluent Bit, the OTel agent, Prometheus, Loki, and Tempo
  are running.
- **Kubernetes image pull issues**: confirm you built images in the Minikube Docker context
  (`eval $(minikube docker-env ...)`).

---

## Notes

- This README reflects the current platform: `util` + `eureka-server` + `gateway-service` +
  `auth-service` + `roaming-analysis-service` + `rate-limiting-service` + `messaging-service` +
  the `anomaly-detection`/`distributed-tracing`/`fault-injection` placeholders + the Angular
  `Frontend/`.
- `run.sh`, `build-images.sh`, and the `Tiltfile` currently launch **eureka + gateway + auth**
  only; start the other services manually or via `./run.sh docker`.
- `postgres` and `mongodb` in the infra compose are legacy/optional and unused by the current
  services — remove them if you don't need them.
```