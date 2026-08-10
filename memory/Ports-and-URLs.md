---
title: Ports and URLs (quick reference)
tags: [reference, ports, infra]
updated: 2026-08-10
---

# Ports & URLs — Quick Reference

Single place to look up every port, base URL, and key endpoint. When you add a service, add a
row here. Local = running on the host; docker = the container name on `shared-network`.

## Application services

| Service | Local port | Docker host | Key paths |
|---------|-----------|-------------|-----------|
| Eureka server | `8761` | `eureka-server:8761` | dashboard `/` |
| Gateway | `9000` | `gateway-service:9000` | all `/api/**`, `GET /api/metrics/overview`, `/swagger-ui.html` |
| auth-service | `9001` | `auth-service:9001` | `/api/auth/**`, `/api/users/**` |
| roaming-analysis-service | `9002` | `roaming-analysis-service:9002` | `/api/roaming/**` |
| anomaly-detection-service | `9003` | `anomaly-detection-service:9003` | `/api/anomaly/health` |
| rate-limiting-service | `9004` | `rate-limiting-service:9004` | `/api/protection/health` |
| distributed-tracing-service | `9005` | `distributed-tracing-service:9005` | `/api/tracing/health` |
| fault-injection-service | `9006` | `fault-injection-service:9006` | `/api/fault/health` |
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
| ratelimit Redis | `6379` | `ratelimit-redis:6379` | rate-limit counters |
| anomaly Redis | `6380` | `anomaly-redis:6379` | real-time windows |
| Postgres (shared) | `5432` | `postgres:5432` | legacy / optional (`course_db`) |
| MongoDB | `27017` | `mongodb:27017` | legacy / optional |

## Observability

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| Prometheus | `9090` | `prometheus:9090` | scrapes `/actuator/prometheus` (gateway, eureka, auth, roaming) |
| Grafana | `3000` | `grafana:3000` | admin/admin; dashboards from `grafana-dashboard/` |
| Loki | `3100` | `loki:3100` | log store |
| Tempo | `4317`/`4318`/`3200` | `tempo:*` | OTLP gRPC/HTTP + query |
| Fluent Bit | `24224` | `fluent-bit:24224` | fluentd log driver → Loki |

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
