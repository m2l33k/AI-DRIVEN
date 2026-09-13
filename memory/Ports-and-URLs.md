---
title: Ports and URLs (quick reference)
tags: [reference, ports, infra]
updated: 2026-09-10
---

# Ports & URLs — Quick Reference

Single place to look up every port, base URL, and key endpoint. When you add a service, add a
row here. Local = running on the host; docker = the container name on `shared-network`.

## Application services

| Service | Local port | Docker host | Key paths |
|---------|-----------|-------------|-----------|
| Eureka server | `8761` | `eureka-server:8761` | dashboard `/` |
| Gateway | `9000` | `gateway-service:9000` | all `/api/**`, `GET /api/metrics/overview`, `/swagger-ui.html` (rate-limit enforcement filter was tried then reverted — see ADR-11) |
| auth-service | `9001` | `auth-service:9001` | `/api/auth/**`, `/api/users/**` |
| roaming-analysis-service | `9002` | `roaming-analysis-service:9002` | `/api/roaming/**` (13 eps incl. `POST /upload`, `POST /simulate`) |
| anomaly-detection-service | `9003` | `anomaly-detection-service:9003` | `/api/anomaly/health` |
| rate-limiting-service | `9004` | `rate-limiting-service:9004` | `/api/protection/**` (standalone limiter: `/check`, `/policies`, `/stats`) |
| distributed-tracing-service | `9005` | `distributed-tracing-service:9005` | `/api/tracing/health` |
| fault-injection-service | `9006` | `fault-injection-service:9006` | `/api/fault/health` |
| messaging-service | `9007` | `messaging-service:9007` | `/api/messages/**` (DMs) + **`/ws/notifications`** (WebSocket, `?token=`) |
| Frontend (Angular dev) | `4200` | — | proxies `/api` → gateway `:9000` |

## Identity & data

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| Keycloak | `8081` | `keycloak:8080` | realm `auth-management`, client `platform-client` |
| keycloak Postgres | `5437` | `keycloak-postgres:5432` | DB `keycloak_db`, user/pass `keycloak` — persists Keycloak data |
| roaming MySQL | `3307` | `roaming-mysql:3306` | DB `roaming_db`, user/pass `roaming`/`roaming` |
| anomaly Postgres | `5433` | `anomaly-postgres:5432` | DB `anomaly_db`, user/pass `anomaly` |
| ratelimit Postgres | `5434` | `ratelimit-postgres:5432` | DB `ratelimit_db`, user/pass `ratelimit` |
| tracing Postgres | `5435` | `tracing-postgres:5432` | DB `tracing_db`, user/pass `tracing` |
| fault Postgres | `5436` | `fault-postgres:5432` | DB `fault_db`, user/pass `fault` |
| messaging Postgres | `5438` | `messaging-postgres:5432` | DB `messaging_db`, user/pass `messaging` |
| ratelimit Redis | `6379` | `ratelimit-redis:6379` | rate-limit counters |
| anomaly Redis | `6380` | `anomaly-redis:6379` | real-time windows |
| Postgres (shared) | `5432` | `postgres:5432` | legacy / optional (`course_db`) |
| MongoDB | `27017` | `mongodb:27017` | legacy / optional |

## ML service

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| ml-service (Django) | `8000` | `ml-service:8000` | LSTM+Prophet+ARIMA forecasting; `/api/health/`, `/api/forecast/`, `/api/train/` |

## free5GC control-plane NFs

| NF | Local metrics port | Docker container | Notes |
|----|-------------------|-----------------|-------|
| NRF | `19001` | `free5gc-nrf` | NF registry, SBI OAuth2 |
| AMF | `19002` | `free5gc-amf` | Access & Mobility |
| SMF | `19003` | `free5gc-smf` | Session Management |
| AUSF | `19004` | `free5gc-ausf` | Authentication Server |
| UDM | `19005` | `free5gc-udm` | Unified Data Mgmt |
| UDR | `19006` | `free5gc-udr` | Unified Data Repository |
| PCF | `19007` | `free5gc-pcf` | Policy Control |
| NSSF | `19008` | `free5gc-nssf` | Network Slice Selection |
| WebConsole | `5000` | `free5gc-webui` | Subscriber provisioning UI + REST API (admin/free5gc) |
| UPF | — | `free5gc-upf` | User Plane — **skipped on Windows** (`--scale free5gc-upf=0`) |

NF configs in `E:/My-project/free5gc-compose/config/`. Platform API bridge at `/api/5gc/**` → `roaming-analysis-service:9002`.

## Observability

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| Prometheus | `9090` | `prometheus:9090` | scrapes `/actuator/prometheus` (gateway, eureka, auth, roaming) |
| Grafana | `3000` | `grafana:3000` | admin/admin; dashboards from `grafana-dashboard/` |
| Loki | `3100` | `loki:3100` | log store |
| Tempo | `4317`/`4318`/`3200` | `tempo:*` | OTLP gRPC/HTTP + query |
| Fluent Bit | `24224` | `fluent-bit:24224` | fluentd log driver → Loki |
| redis-exporter | `9121` | `redis-exporter:9121` | multi-target → both Redis (for "Redis & Storage" dashboard) |
| postgres-exporter (keycloak/ratelimit) | — | `postgres-exporter-*:9187` | per-server Postgres metrics |
| mysqld-exporter (roaming) | — | `mysqld-exporter-roaming:9104` | roaming MySQL metrics |

## Per-service actuator/docs (every Spring service)
- Health: `GET /actuator/health`
- Prometheus: `GET /actuator/prometheus`
- OpenAPI: `GET /v3/api-docs` · Swagger UI: `/swagger-ui.html`
- Aggregated via gateway: `/<service-id>/v3/api-docs`

## Keycloak endpoints
- Token: `POST http://localhost:8081/realms/auth-management/protocol/openid-connect/token`
- JWKS: `.../protocol/openid-connect/certs`
- Client secret (local/dev): `platform-client-secret` · scope `openid profile email roles`

## Related notes
- [[Backend-and-Infra]] · [[Platform-Services]] · [[Auth-Service]] · [[Roaming-Analysis-Service]] · [[Diagrams]]
