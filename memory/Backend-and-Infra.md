---
title: Backend and Infra
tags: [backend, infra, observability]
updated: 2026-09-10
---

# Backend and Infra

> Partly explored. Microservice conventions are well understood (see the service
> template below); observability internals still to be dug into.

## Ports
Full table (incl. observability + data + URLs) → [[Ports-and-URLs]].

| Component                   | Port                                        |
| --------------------------- | ------------------------------------------- |
| Eureka server               | 8761                                        |
| Gateway                     | 9000                                        |
| auth-service                | 9001                                        |
| roaming-analysis-service    | 9002                                        |
| anomaly-detection-service   | 9003                                        |
| rate-limiting-service       | 9004                                        |
| distributed-tracing-service | 9005                                        |
| fault-injection-service     | 9006                                        |
| messaging-service           | 9007 (DMs between users; see [[Messaging-Service]]) |
| roaming MySQL               | 3307 (host) / 3306 (docker `roaming-mysql`) |
| Keycloak                    | 8081 (local) / 8080 (docker)                |

## Microservices / Spring Cloud
- `spring-cloud/` — `eureka-server` (service discovery) + `gateway-service` (Spring Cloud
  Gateway, WebFlux). Gateway uses the Eureka discovery locator + explicit routes per service,
  and aggregates each service's Swagger under `/<service-id>/v3/api-docs`.
  - Gateway also hosts a local controller **`GET /api/metrics/overview`** (`web/MetricsController`)
    that queries **Prometheus** (`prometheus.base-url`) and returns request/JVM metrics as JSON for
    the admin System Health page. Secured `PERM_platform-config:read`. Use `WebClient.create(...)`
    (no `WebClient.Builder` bean here). Requests not matching a route fall through to controllers.
- `microservices/` — business microservices:
  - `auth-service` (port 9001) — Keycloak-backed auth & user management; state-aware login,
    first-login password change, OTP self-service reset, emailed temp passwords. See [[Auth-Service]].
  - `roaming-analysis-service` (port 9002) — roaming events + risk scoring. See [[Roaming-Analysis-Service]].
  - **4 empty placeholder services** (ports 9003–9006, health-check only) — `anomaly-detection`,
    `rate-limiting`, `distributed-tracing`, `fault-injection`. See [[Platform-Services]].
- `util/` — shared library module.
- `api-specs/` — OpenAPI contracts.
- Maven multi-module build (root `pom.xml` lists modules; Spring Boot 4.0.3, Java 17,
  spring-cloud 2025.1.1).

## Service template (how new microservices are built)
- Package `io.javatab.microservices.<name>`; artifactId `<name>-service`, `1.0.0-SNAPSHOT`.
- Deps: web, security, oauth2-resource-server, validation, eureka-client, springdoc,
  actuator, micrometer-prometheus (+ test, spring-security-test).
- `SecurityConfig`: JWT resource server; realm roles → `ROLE_<NAME>`, `platform-client`
  perms → `PERM_<perm>`; actuator + docs public, everything else authenticated;
  `@EnableMethodSecurity` + `@PreAuthorize("hasAuthority('PERM_...')")` on endpoints.
- `application.yml`: default + `docker` profile (docker points at `keycloak:8080` /
  `eureka-server:8761`). Actuator exposes health/info/metrics/prometheus.
- `Dockerfile` (layered jar) + `kubernetes/deployment.yml` & `service.yml` (ClusterIP 80→port).
- Register the module in root `pom.xml` and add gateway routes (both profiles) + Swagger entry.

## Auth — Keycloak
- Realm config: `keycloak/platform-realm.json`.
- Client: `platform-client` (confidential, standard + direct-access grants).
- Roles & permissions → see [[Roles-and-Permissions]].
- Full auth API / flows → [[Auth-Service]].
- **Two separate SMTP setups:** (1) auth-service's own mail (`MAIL_USERNAME`/`MAIL_PASSWORD`,
  Gmail App Password, from repo-root `.env`) sends OTP + temp-password emails; (2) Keycloak's
  **realm SMTP** (realm settings) is what actually sends the `send-verify-email` link — still TODO.

## ML service (Django, added)
- Location: `ml-service/` (repo root)
- Port: `8000` (Docker only — not a JAR, runs as `ml-service` container in `docker-compose-infra.yml`)
- LSTM + Prophet + ARIMA + ensemble forecasting for roaming traffic
- Endpoints: `/api/health/`, `POST /api/forecast/`, `POST /api/train/` (triggers background training), `GET /api/train/` (status + metrics)
- First build takes 3–5 min (TensorFlow ~500 MB). `mem_limit: 2g` in compose.
- Spring Boot integration: `RestTemplate` with 5s/30s timeouts; `roaming.ml-service.url=http://localhost:8000` (host) / `http://ml-service:8000` (docker profile)
- Always set `Content-Type: application/json` on POST requests to Django (see [[spring-boot-4-compat]])

## free5GC 5G Core (added 2026-09-10)
- `docker/docker-compose-5gc.yml` — 8 control-plane NFs + WebConsole + MongoDB (no UPF on Windows)
- `docker/.env` — `F5GC_DIR=E:/My-project/free5gc-compose`, `F5GC_TAG=v4.2.3`
- NF metric ports 19001–19008 scraped by Prometheus with `free5gc="true"` label
- Backend proxy in `roaming-analysis-service` (`fivegc/` package): `Free5gcService` + `Free5gcController`
- Gateway route: `/api/5gc/**` → `lb://roaming-analysis-service`
- Angular pages: Security Analyst `/security/5gc` + Network Operator `/operator/network-functions`
- Grafana dashboard: `grafana-dashboard/free5gc-5g-core.json`
- See [[5GC-Core]] and [[Ports-and-URLs]] for full details

## Observability (from commit `5ab6c0b`, `96edc40`)
- **Prometheus** — scrapes gateway + eureka (+ auth, roaming via `host.docker.internal`).
- **Grafana** — datasources provisioned; dashboards in `grafana-dashboard/`.
- **Loki** (logs), **Tempo** (traces), **Fluent Bit** (log shipping), **OpenTelemetry**.
- **Dashboard design (D6):** the full set of planned dashboards — NF health/KPIs, 5GC signalling,
  security/anomaly fusion, zero-trust/certs, rate-limit, roaming, logs/traces — is designed in
  **[[Grafana-Dashboards]]** (with data sources + PromQL/LogQL). Ties into [[5GC-Core]].

## Orchestration / tooling
- `docker/` — compose/config for the stack.
- `kubernetes/` — K8s manifests.
- `Tiltfile` — local dev orchestration.
- Scripts: `run.sh`, `infra.sh`, `build-images.sh`, `create-project.sh`.

## Infra diagrams (source of truth)
- **`Noted/diagram/`** — current PlantUML infra design (added 2026-08-10):
  `infrastructure.puml` (deployment topology), `services.puml` (service catalogue),
  `README.md` (render steps + full service table). Reflects roaming-analysis-service + MySQL.
- `Noted/uml/` — older deployment/component diagrams (predate roaming service/MySQL).

## Related notes
- [[Project-Overview]]
- [[Git-Workflow-and-History]]
