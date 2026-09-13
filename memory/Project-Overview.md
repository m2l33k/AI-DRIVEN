---
title: Project Overview
tags: [overview, architecture]
updated: 2026-09-10
---

# Project Overview

A **5G Core (5GC) telecom management platform**, built as Spring Boot microservices with
a role-based Angular console on top.

## Repository

- **Root:** `E:\My-project\spring-boot-based-microservices`
- **Platform:** Windows 11, PowerShell (default shell), Git repo.

## High-level pieces

| Area | Tech | Location |
|------|------|----------|
| Business microservices | Spring Boot | `microservices/` (auth 9001, roaming 9002 + 5GC proxy, + 4 placeholders 9003–9006 — see [[Platform-Services]]) |
| Platform microservices | Spring Boot | `spring-cloud/` (eureka 8761, gateway 9000) |
| API gateway | Spring Cloud Gateway | `spring-cloud/gateway-service` |
| Service discovery | Eureka | `spring-cloud/` |
| Auth / IAM | Keycloak | `keycloak/platform-realm.json` |
| ML forecasting service | Django / Python | `ml-service/` (port 8000, Docker only; LSTM+Prophet+ARIMA) |
| 5G Core | free5GC v4.2.3 | `docker/docker-compose-5gc.yml` + `E:/My-project/free5gc-compose/` |
| Observability | Prometheus, Grafana, Loki, Tempo, Fluent Bit, OpenTelemetry | `docker/`, `grafana-dashboard/` |
| Orchestration | Docker, Kubernetes, Tilt | `docker/`, `kubernetes/`, `Tiltfile` |
| Frontend | Angular 22 console | `Frontend/` |
| API contracts | OpenAPI specs | `api-specs/` |
| Helper scripts | Bash | `run.sh`, `infra.sh`, `build-images.sh`, `create-project.sh` |

## Domain in one line

Operators run the 5G Core (network functions, core config), security analysts watch
signalling/roaming threats, admins manage users & platform config, and auditors have
read-only visibility including audit logs. See [[Roles-and-Permissions]].

## Related notes
- [[Architecture-Decisions]] — the why behind the design
- [[Glossary]] — domain + platform terms
- [[Frontend-Architecture]]
- [[Backend-and-Infra]] · [[Ports-and-URLs]] · [[Platform-Services]]
- [[Roles-and-Permissions]]
- [[Diagrams]]
