---
title: Ports and URLs (quick reference)
tags: [reference, ports, infra]
updated: 2026-09-15
---

# Ports & URLs — Quick Reference

Single place to look up every port, base URL, and key endpoint.
Full endpoint catalogue → [[All-Endpoints]].

## Application services

| Service | Local port | Docker host | Gateway path |
|---------|-----------|-------------|--------------|
| Eureka server | `8761` | `eureka-server:8761` | — |
| Gateway | `9000` | `gateway-service:9000` | `/api/**`, `/swagger-ui.html` |
| auth-service | `9001` | `auth-service:9001` | `/api/auth/**`, `/api/users/**` |
| roaming-analysis-service | `9002` | `roaming-analysis-service:9002` | `/api/roaming/**` |
| anomaly-detection-service | `9003` | `anomaly-detection-service:9003` | `/api/anomaly/**` |
| rate-limiting-service | `9004` | `rate-limiting-service:9004` | `/api/protection/**` |
| distributed-tracing-service | `9005` | `distributed-tracing-service:9005` | `/api/tracing/**` |
| fault-injection-service | `9006` | `fault-injection-service:9006` | `/api/fault/**` |
| messaging-service | `9007` | `messaging-service:9007` | `/api/messages/**`, `/ws/**` |
| **fivegc-service** | **`9008`** | `fivegc-service:9008` | `/api/5gc/**`, `/api/vm/**` |
| Frontend (Angular dev) | `4200` | — | proxies `/api` → gateway `:9000` |

## Identity & data

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| Keycloak | `8081` | `keycloak:8080` | realm `auth-management`, client `platform-client`; **real users in `nexus-docker` project** |
| keycloak Postgres | `5437` | `keycloak-postgres:5432` | DB `keycloak_db` |
| roaming MySQL | `3307` | `roaming-mysql:3306` | DB `roaming_db`, user/pass `roaming`/`roaming` |
| anomaly Postgres | `5433` | `anomaly-postgres:5432` | DB `anomaly_db` |
| ratelimit Postgres | `5434` | `ratelimit-postgres:5432` | DB `ratelimit_db` |
| tracing Postgres | `5435` | `tracing-postgres:5432` | DB `tracing_db` |
| fault Postgres | `5436` | `fault-postgres:5432` | DB `fault_db` |
| messaging Postgres | `5438` | `messaging-postgres:5432` | DB `messaging_db` |
| ratelimit Redis | `6379` | `ratelimit-redis:6379` | rate-limit token buckets |
| anomaly Redis | `6380` | `anomaly-redis:6379` | real-time windows |
| **MongoDB** | **`27017`** | `mongodb:27017` | **host-exposed**; used by fivegc-service VM console; has `testdb` + `free5gc` databases |
| free5gc-db MongoDB | internal | `free5gc-db` | **no host port** — used only by free5GC NFs; `free5gc` database |
| Postgres (shared) | `5432` | `postgres:5432` | legacy/optional |

## ML service

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| ml-service (Django) | `8000` | `ml-service:8000` | LSTM+Prophet+ARIMA; Docker only |

## free5GC control-plane NFs

| NF | Metrics port | Docker container | Role |
|----|-------------|-----------------|------|
| NRF | `19001` | `free5gc-nrf` | NF registry, SBI OAuth2 |
| AMF | `19002` | `free5gc-amf` | Access & Mobility |
| SMF | `19003` | `free5gc-smf` | Session Management |
| AUSF | `19004` | `free5gc-ausf` | Authentication Server |
| UDM | `19005` | `free5gc-udm` | Unified Data Mgmt |
| UDR | `19006` | `free5gc-udr` | Unified Data Repository |
| PCF | `19007` | `free5gc-pcf` | Policy Control |
| NSSF | `19008` | `free5gc-nssf` | Network Slice Selection |
| WebConsole | `5000` | `free5gc-webui` | Subscriber provisioning (admin/free5gc) |
| UPF | — | `free5gc-upf` | **Skipped on Windows** |
| UERANSIM gNB | `19020` | `free5gc-gnb` | simulated gNodeB |
| UERANSIM UE | `19021` | `free5gc-ue` | simulated UE |

## Observability

| Component | Local | Docker | Notes |
|-----------|-------|--------|-------|
| Prometheus | `9090` | `prometheus:9090` | scrapes all services + NF metrics |
| Grafana | `3000` | `grafana:3000` | admin/admin; dashboards from `grafana-dashboard/` |
| Loki | `3100` | `loki:3100` | log store |
| Tempo | `4317/4318/3200` | `tempo:*` | OTLP gRPC/HTTP + query |
| Fluent Bit | `24224` | `fluent-bit:24224` | log shipping → Loki |
| redis-exporter | `9121` | `redis-exporter:9121` | multi-target both Redis |
| postgres-exporter | — | `postgres-exporter-*:9187` | per-service Postgres metrics |
| mysqld-exporter | — | `mysqld-exporter-roaming:9104` | roaming MySQL metrics |

## UI dashboards

| Tool | URL |
|------|-----|
| Platform console | http://localhost:4200 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Eureka | http://localhost:8761 |
| Keycloak admin | http://localhost:8081 |
| free5GC WebConsole | http://localhost:5000 |
| Gateway Swagger | http://localhost:9000/swagger-ui.html |

## Per-service actuator/docs (every Spring service)
- Health: `GET /actuator/health`
- Prometheus: `GET /actuator/prometheus`
- OpenAPI: `GET /v3/api-docs` · Swagger UI: `GET /swagger-ui.html`
- Aggregated via gateway: `/<service-id>/v3/api-docs`

## Keycloak token endpoint
```
POST http://localhost:8081/realms/auth-management/protocol/openid-connect/token
  grant_type=password&client_id=platform-client&client_secret=platform-client-secret
  &username=...&password=...&scope=openid profile email roles
```

## Related notes
- [[Backend-and-Infra]] · [[All-Endpoints]] · [[Platform-Services]] · [[Auth-Service]]
