---
title: Backend and Infra
tags: [backend, infra, observability]
updated: 2026-09-15
---

# Backend and Infra

## Ports
Full table → [[Ports-and-URLs]]. All endpoints → [[All-Endpoints]].

| Component                   | Port  |
|-----------------------------|-------|
| Eureka server               | 8761  |
| Gateway                     | 9000  |
| auth-service                | 9001  |
| roaming-analysis-service    | 9002  |
| anomaly-detection-service   | 9003  |
| rate-limiting-service       | 9004  |
| distributed-tracing-service | 9005  |
| fault-injection-service     | 9006  |
| messaging-service           | 9007  |
| fivegc-service              | 9008  |
| ml-service (Django)         | 8000  |

## Microservices / Spring Cloud
- `spring-cloud/eureka-server` — service discovery
- `spring-cloud/gateway-service` — Spring Cloud Gateway (WebFlux). Routes all `/api/**`. Aggregates Swagger. Hosts `GET /api/metrics/overview` (Prometheus-backed JVM/request metrics).
- `microservices/auth-service` (9001) — Keycloak-backed auth + user mgmt. See [[Auth-Service]].
- `microservices/roaming-analysis-service` (9002) — roaming events + risk scoring + **free5GC NF facade** (`Free5gcService`, `Free5gcController`). See [[Roaming-Analysis-Service]].
- `microservices/fivegc-service` (9008) — **5GC proxy + VM MongoDB console**:
  - WebConsole proxy: NF status, subscribers, UE contexts, network config read/write
  - VM MongoDB controller: database/collection/document browser + insert/delete + stats
  - Deps: `spring-boot-starter-data-mongodb`, `MongoClient` auto-configured from `spring.data.mongodb.uri`
  - MongoDB health check disabled (`management.health.mongo.enabled: false`) so service starts without MongoDB
- `microservices/anomaly-detection-service` (9003) — placeholder (health-check only)
- `microservices/rate-limiting-service` (9004) — Redis token-bucket limiter. See [[Platform-Services]].
- `microservices/distributed-tracing-service` (9005) — placeholder
- `microservices/fault-injection-service` (9006) — placeholder
- `microservices/messaging-service` (9007) — DM messaging + WebSocket notifications. See [[Messaging-Service]].

## Service template (how new microservices are built)
- Package `io.javatab.microservices.<name>`; Spring Boot 4.0.3, Java 17, spring-cloud 2025.1.1
- Deps: web, security, oauth2-resource-server, validation, eureka-client, springdoc, actuator, micrometer-prometheus
- `SecurityConfig`: JWT resource server; realm roles → `ROLE_<NAME>`, `platform-client` perms → `PERM_<perm>`; `@EnableMethodSecurity` + `@PreAuthorize`
- `application.yml`: default + `docker` profile. Actuator exposes health/info/metrics/prometheus.
- `Dockerfile` (layered jar) + `kubernetes/deployment.yml`
- Register module in root `pom.xml` + add gateway routes (both profiles) + Swagger entry

## Auth — Keycloak
- Realm config: `keycloak/platform-realm.json`
- Client: `platform-client` (confidential)
- Real Keycloak + users is in the `nexus-docker` project (not the default `docker` project). See [[Two-docker-projects]] memory note.
- Full auth API → [[Auth-Service]]

## ML service (Django)
- Location: `ml-service/` (repo root), port `8000`, Docker only
- LSTM + Prophet + ARIMA + ensemble forecasting for roaming traffic
- See [[ML-Forecasting-Service]] for full reference

## free5GC 5G Core
- `docker/docker-compose-5gc.yml` — 8 control-plane NFs + WebConsole + MongoDB (no UPF on Windows)
- `docker/.env` — `F5GC_DIR=E:/My-project/free5gc-compose`, `F5GC_TAG=v4.2.3`
- NF metric ports 19001–19008 scraped by Prometheus with `free5gc="true"` label
- Backend NF facade in `fivegc-service` (port 9008) — `WebConsoleProxyService`, `FiveGcController`, `VmMongoController`
- Angular bridge: Security Analyst `/security/5gc`, Network Operator `/operator/network-functions`, both roles `/vm`
- See [[5GC-Core]] for full integration plan

## MongoDB (Docker)
- Container: `mongodb` (mongo:6.0.4), exposed `0.0.0.0:27017->27017/tcp`
- Container: `free5gc-db` (mongo:6.0.4), internal only (no host port — used by free5GC NFs)
- `testdb` created with collections: `users`, `devices`, `network_events` (sample telecom data)
- `free5gc` database created by free5GC WebConsole (subscriptionData collections)
- Spring Boot connects via `spring.data.mongodb.uri: mongodb://localhost:27017`

## Observability
- **Prometheus** (9090) — scrapes gateway, eureka, auth, roaming, fivegc NFs (19001–19008)
- **Grafana** (3000) — datasources provisioned; dashboards in `grafana-dashboard/`
- **Loki** (3100), **Tempo** (4317/4318/3200), **Fluent Bit** (24224)
- **Dashboard design** → [[Grafana-Dashboards]]

## Gateway security
`spring-cloud/gateway-service/.../SecurityConfig.java` — key rules:
- Public: `/actuator/**`, Swagger, auth login endpoints, `/ws/**`, service health probes
- Authenticated: `/api/metrics/**`, `/api/messages/**`, `/api/users/directory`, plus all `/api/vm/**` and `/api/5gc/**` (fall through to `anyExchange().authenticated()`)
- PERM-gated: users, roles, platform-config, NF restart, core-config, roaming, protection, audit

## Gateway routes (both default + docker profiles)
| Route ID | Path | Target service |
|----------|------|----------------|
| auth-service | `/api/auth/**`, `/api/users/**` | auth-service |
| roaming-analysis-service | `/api/roaming/**` | roaming-analysis-service |
| fivegc-service | `/api/5gc/**` | fivegc-service |
| vm-service | `/api/vm/**` | fivegc-service |
| anomaly-detection-service | `/api/anomaly/**` | anomaly-detection-service |
| rate-limiting-service | `/api/protection/**` | rate-limiting-service |
| distributed-tracing-service | `/api/tracing/**` | distributed-tracing-service |
| fault-injection-service | `/api/fault/**` | fault-injection-service |
| messaging-service | `/api/messages/**` | messaging-service |
| messaging-ws | `/ws/**` | messaging-service (ws) |

⚠️ After editing `application.yml`, copy source → `target/classes/application.yml` and restart the service — DevTools does not always auto-reload YAML changes.

## Orchestration / tooling
- `docker/` — compose/config for the stack
- `kubernetes/` — K8s manifests
- `Tiltfile` — local dev orchestration
- Scripts: `run.sh`, `infra.sh`, `build-images.sh`
- See [[Scripts-and-Tooling]]

## Related notes
- [[Project-Overview]] · [[Ports-and-URLs]] · [[All-Endpoints]]
- [[Auth-Service]] · [[Roaming-Analysis-Service]] · [[Platform-Services]] · [[Messaging-Service]] · [[5GC-Core]]
