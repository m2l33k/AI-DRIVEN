# 5G Core Telecom Management Platform

A **5G Core (5GC) telecom management platform**, built as Spring Boot / Spring Cloud
microservices with a role-based Angular console on top. It provides:

- Service discovery (Netflix Eureka)
- A single secured API gateway (Spring Cloud Gateway)
- OAuth2/OIDC authentication with Keycloak and a permission-based RBAC model
- Business microservices: **auth & user management** and **5G roaming analysis / risk scoring**
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
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
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

- **Eureka Server** — service discovery / registry (Netflix Eureka), port `8761`
- **Gateway Service** — single entry point + request routing; OAuth2 resource server with
  RBAC, aggregates each service's Swagger, and hosts `GET /api/metrics/overview` (queries
  Prometheus for the admin System Health page), port `9000`
- **Auth Service** — Keycloak-backed authentication & user management (state-aware login,
  first-login password change, OTP self-service reset, emailed temp passwords), port `9001`
- **Roaming Analysis Service** — 5G roaming events + partner-PLMN risk scoring and analytics
  (real-time monitoring, anomaly detection, forecasting, QoS, commercial), persisted in MySQL,
  port `9002`
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
detailed project memory vault is in [`memory/`](memory/) (open as an Obsidian vault).

---

## Project Structure

```
.
├── pom.xml                       # parent (aggregator) pom
├── util/                         # shared library module
├── spring-cloud/
│   ├── eureka-server/            # service discovery server (port 8761)
│   └── gateway-service/          # API gateway + RBAC + metrics endpoint (port 9000)
├── microservices/
│   ├── auth-service/             # Keycloak-backed auth & user management (port 9001)
│   └── roaming-analysis-service/ # 5G roaming events + risk scoring (port 9002, MySQL)
├── Frontend/                     # Angular 22 role-based console
├── keycloak/
│   └── platform-realm.json       # importable realm: roles, client, test users
├── api-specs/                    # OpenAPI contracts
├── docker/                       # docker-compose files (infra, observability, base)
├── grafana-dashboard/            # Grafana dashboards
├── kubernetes/                   # infrastructure manifests
├── Noted/                        # documentation set (diagrams, report, deep-dive)
├── memory/                       # project memory vault (Obsidian)
├── Tiltfile                      # Tilt config for Minikube workflow
├── build-images.sh               # builds service images into Minikube's docker
├── run.sh                        # local / docker run helper
└── SECURITY.md                   # RBAC roles & permission model
```

---

## Services & Ports

| Component | Port | Notes |
|-----------|------|-------|
| Eureka server | `8761` | Service discovery |
| Gateway service | `9000` | API gateway, RBAC, `/api/metrics/overview` |
| Auth service | `9001` | Keycloak-backed auth & user management |
| Roaming analysis service | `9002` | Roaming events + risk scoring (MySQL) |
| Keycloak | `8081` → `8080` | Realm `auth-management`, client `platform-client` |
| roaming-mysql | `3307` → `3306` | DB `roaming_db` (active) |
| postgres / mongodb | `5432` / `27017` | Legacy / optional |
| Prometheus | `9090` | Metrics scrape |
| Grafana | `3000` | Dashboards |
| Loki | `3100` | Logs |
| Tempo | `4317/4318/3200` | Traces (OTLP) |
| Fluent Bit | `24224` | Log shipping → Loki |

---

## Tech Stack

- **Java 17**, **Spring Boot 4.0.x**, **Spring Cloud 2025.1.x**
- **Netflix Eureka** (service discovery)
- **Spring Cloud Gateway** (routing, WebFlux)
- **Keycloak** (OAuth2/OIDC)
- **MySQL 8.4** (roaming persistence, JPA/Hibernate)
- **Angular 22** (frontend console)
- **OpenTelemetry**, **Prometheus**, **Grafana**, **Loki**, **Tempo**, **Fluent Bit**
- **Docker Compose** and **Kubernetes (Minikube + Tilt)**

---

## Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 20+ (for the Angular frontend)
- Docker + Docker Compose
- (Optional) Minikube + Tilt for Kubernetes mode
- curl or HTTPie for API validation

---

## Quick Start (Docker Compose)

> Make sure Docker Engine is running.

### 1) Start infrastructure (Keycloak, MySQL, …)

```bash
cd docker
docker compose -f docker-compose-infra.yml up -d --build
```

The realm is imported automatically on a fresh Keycloak (`--import-realm` loads
`keycloak/platform-realm.json`). Keycloak admin console: `http://localhost:8081` (admin/admin).

> **Email:** auth-service and Keycloak realm SMTP read `MAIL_USERNAME` / `MAIL_PASSWORD`
> (a Gmail App Password, no spaces) from a gitignored repo-root `.env` — see `.env.example`.
> `run.sh` loads it locally and Compose passes it through.

### 2) (Optional) Start the observability stack

```bash
docker compose -f docker-compose-observability.yml up -d --build
```

### 3) Start the platform services

From the repository root:

```bash
sh run.sh docker      # build + run the services in Docker
```

or run them as local JARs (Eureka first, then gateway + microservices):

```bash
sh run.sh
```

Verify:

- Eureka dashboard: `http://localhost:8761`
- Gateway health: `http://localhost:9000/actuator/health`

---

## Frontend Console

The Angular 22 console lives in [`Frontend/`](Frontend/) and proxies `/api` to the gateway
(`:9000`) via `Frontend/proxy.conf.json`.

```bash
cd Frontend
npm install
npm start          # ng serve with the proxy → http://localhost:4200
```

Log in with a Keycloak test user (see [Security & Roles](#security--roles)); the console routes
to the right dashboard per role (admin, network operator, security analyst, auditor).

---

## Run with Kubernetes + Tilt

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

Optional check:

```bash
tilt get uiresources
```

---

## Core Endpoints

> Ports and hostnames depend on your setup (Docker vs Kubernetes ingress). All business
> routes go through the gateway at `:9000`.

- **Eureka dashboard**: `http://localhost:8761`
- **Gateway**: `http://localhost:9000`
- **Auth service** (`/api/auth`, `/api/users`) — login, first-login, OTP reset, user CRUD
- **Roaming analysis** (`/api/roaming`) — `/events`, `/summary`, `/partners`, `/live`,
  `/anomalies`, `/forecast`, `/experience`, `/qos`, `/optimization`, `/revenue`
- **Gateway metrics** — `GET /api/metrics/overview` (`PERM_platform-config:read`)

Swagger is aggregated per service under `/<service-id>/v3/api-docs`.

Actuator/metrics (every service):

- `GET /actuator/health`
- `GET /actuator/prometheus`

---

## Security & Roles

Keycloak is the identity provider; authorization uses a **permission-based RBAC** model
enforced at the gateway **and** inside services. Roles are Keycloak composite realm roles that
aggregate fine-grained permissions (client roles on `platform-client`). Realm role names map to
`ROLE_*` and client permissions to `PERM_*` authorities.

| Role | Can do | Cannot do |
|------|--------|-----------|
| `PLATFORM_ADMIN` | Manage users, roles, platform config | Operate the 5GC |
| `NETWORK_OPERATOR` | View NF status, restart NFs, apply config to the core | Manage users, delete audit logs |
| `SECURITY_ANALYST` | View security alerts, roaming events, tune detection rules | Change network config |
| `AUDITOR` | Read everything, including audit logs | Write anything, anywhere |

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

- **Prometheus** — scrapes `/actuator/prometheus` (gateway, eureka, auth, roaming); check
  targets are **UP**.
- **Grafana** — dashboards for metrics/logs/traces correlation (`grafana-dashboard/`).
- **Fluent Bit + Loki** — Fluent Bit forwards service logs to Loki.
- **Tempo + OpenTelemetry** — services export traces via the OTel agent to Tempo.

---

## Adding a New Service

1. Create a Maven module under `microservices/<name>` (package
   `io.javatab.microservices.<name>`) and register it in the parent `pom.xml` `<modules>`.
2. Add the standard deps (web, security, oauth2-resource-server, validation, eureka-client,
   springdoc, actuator, micrometer-prometheus) and a `SecurityConfig` (JWT resource server;
   realm roles → `ROLE_*`, perms → `PERM_*`; actuator + docs public, rest authenticated).
3. Point `eureka.client.service-url.defaultZone` at the Eureka server (default + `docker`
   profiles).
4. Add gateway routes (both profiles) + a Swagger aggregation entry.
5. Wire it into `docker/docker-compose-base.yml`, `build-images.sh`, and the `Tiltfile`, and
   add `kubernetes/deployment.yml` & `service.yml`.
6. Protect its endpoints with `@PreAuthorize("hasAuthority('PERM_...')")` (see `SecurityConfig`).

---

## Troubleshooting

- **Service won't register with Eureka**: confirm Eureka is up at `:8761` and the client's
  `defaultZone` (or `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`) is correct.
- **Auth issues (401/403)**: check token expiry, that the realm was imported, and that the
  user's role carries the required `PERM_*` permission (see [SECURITY.md](SECURITY.md)). A public
  path must be permitted at **both** the gateway and the service; a stale Swagger bearer token
  also causes 401 on permitAll paths — log out first.
- **Emails not sending**: ensure `MAIL_USERNAME` / `MAIL_PASSWORD` (Gmail App Password, no
  spaces) are set in the repo-root `.env`.
- **Roaming service DB errors**: ensure `roaming-mysql` is up (host port `3307`) and reachable
  (`jdbc:mysql://localhost:3307/roaming_db`, user/pass `roaming`/`roaming`).
- **No logs/traces/metrics**: ensure Fluent Bit, the OTel agent, Prometheus, Loki, and Tempo
  are running.
- **Kubernetes image pull issues**: confirm you built images in the Minikube Docker context
  (`eval $(minikube docker-env ...)`).

---

## Notes

- This README reflects the current platform: `util` + `eureka-server` + `gateway-service` +
  `auth-service` + `roaming-analysis-service` + the Angular `Frontend/`.
- `postgres` and `mongodb` in the infra compose are legacy/optional and unused by the current
  services — remove them if you don't need them.
