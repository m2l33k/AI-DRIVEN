---
title: Backend and Infra
tags: [backend, infra, observability]
updated: 2026-08-07
---

# Backend and Infra

> Partly explored. Microservice conventions are well understood (see the service
> template below); observability internals still to be dug into.

## Ports
| Component | Port |
|-----------|------|
| Eureka server | 8761 |
| Gateway | 9000 |
| auth-service | 9001 |
| roaming-analysis-service | 9002 |
| Keycloak | 8081 (local) / 8080 (docker) |

## Microservices / Spring Cloud
- `spring-cloud/` — `eureka-server` (service discovery) + `gateway-service` (Spring Cloud
  Gateway, WebFlux). Gateway uses the Eureka discovery locator + explicit routes per service,
  and aggregates each service's Swagger under `/<service-id>/v3/api-docs`.
- `microservices/` — business microservices:
  - `auth-service` (port 9001) — Keycloak-backed auth & user management.
  - `roaming-analysis-service` (port 9002) — roaming events + risk scoring. See [[Roaming-Analysis-Service]].
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

## Observability (from commit `5ab6c0b`, `96edc40`)
- **Prometheus** — scrapes gateway + eureka.
- **Grafana** — datasources provisioned; dashboards in `grafana-dashboard/`.
- **Loki** (logs), **Tempo** (traces), **Fluent Bit** (log shipping), **OpenTelemetry**.

## Orchestration / tooling
- `docker/` — compose/config for the stack.
- `kubernetes/` — K8s manifests.
- `Tiltfile` — local dev orchestration.
- Scripts: `run.sh`, `infra.sh`, `build-images.sh`, `create-project.sh`.

## Related notes
- [[Project-Overview]]
- [[Git-Workflow-and-History]]
