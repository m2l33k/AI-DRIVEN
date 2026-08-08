---
title: Project Overview
tags: [overview, architecture]
updated: 2026-08-07
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
| Microservices | Spring Boot | `microservices/`, `spring-cloud/` |
| API gateway | Spring Cloud Gateway | `spring-cloud/gateway-service` |
| Service discovery | Eureka | `spring-cloud/` |
| Auth / IAM | Keycloak | `keycloak/platform-realm.json` |
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
- [[Frontend-Architecture]]
- [[Backend-and-Infra]]
- [[Roles-and-Permissions]]
