# Spring Cloud Microservices Skeleton

A clean, production-style microservices **skeleton** built around a Spring Cloud platform with:

- Service discovery (Netflix Eureka)
- API gateway routing (Spring Cloud Gateway)
- OAuth2/OIDC security with Keycloak and a permission-based RBAC model
- Observability (metrics, logs, traces)
- Docker Compose and Kubernetes/Tilt local deployment workflows

> This repository is a bare skeleton: the original domain services (Course, Review,
> Course Composite) have been removed. Add your own business services as Eureka clients
> behind the gateway.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Run with Kubernetes + Tilt](#run-with-kubernetes--tilt)
- [Core Endpoints](#core-endpoints)
- [Security & Roles](#security--roles)
- [Observability](#observability)
- [Adding a New Service](#adding-a-new-service)
- [Troubleshooting](#troubleshooting)

---

## Overview

The platform currently consists of these components:

- **Eureka Server**: service discovery / registry (Netflix Eureka), port `8761`
- **Gateway Service**: single entry point and request routing; registers with Eureka and
  can auto-route to registered services via `/<service-id>/**`, port `9000`
- **Keycloak**: identity provider (authn) and source of roles/permissions (authz), port `8081`
- **Observability stack**: Prometheus, Grafana, Loki, Tempo, Fluent Bit, OpenTelemetry

---

## Project Structure

```
.
├── pom.xml                       # parent (aggregator) pom
├── util/                         # shared library module
├── spring-cloud/
│   ├── eureka-server/            # service discovery server (port 8761)
│   └── gateway-service/          # API gateway + Eureka client (port 9000)
├── keycloak/
│   └── platform-realm.json       # importable realm: roles, client, test users
├── docker/                       # docker-compose files (infra, observability, base)
├── kubernetes/                   # infrastructure manifests
├── Tiltfile                      # Tilt config for Minikube workflow
├── build-images.sh               # builds service images into Minikube's docker
├── run.sh                        # local / docker run helper
└── SECURITY.md                   # RBAC roles & permission model
```

---

## Tech Stack

- **Java 17**, **Spring Boot 4.0.x**, **Spring Cloud 2025.1.x**
- **Netflix Eureka** (service discovery)
- **Spring Cloud Gateway** (routing)
- **Keycloak** (OAuth2/OIDC)
- **OpenTelemetry**, **Prometheus**, **Grafana**, **Loki**, **Tempo**, **Fluent Bit**
- **Docker Compose** and **Kubernetes (Minikube + Tilt)**

---

## Prerequisites

- Java 17+
- Maven 3.8+
- Docker + Docker Compose
- (Optional) Minikube + Tilt for Kubernetes mode
- curl or HTTPie for API validation

---

## Quick Start (Docker Compose)

> Make sure Docker Engine is running.

### 1) Start infrastructure (at minimum, Keycloak)

```bash
cd docker
docker compose -f docker-compose-infra.yml up -d --build
```

Then import the realm so roles/users exist: open Keycloak at `http://localhost:8081`
(admin/admin) → **Create realm** → upload `keycloak/platform-realm.json`.

### 2) (Optional) Start the observability stack

The `docker-compose-base.yml` services log to Fluent Bit, so start this if you run the
services in Docker:

```bash
docker compose -f docker-compose-observability.yml up -d --build
```

### 3) Start the platform services

From the repository root:

```bash
sh run.sh docker      # build + run eureka-server and gateway-service in Docker
```

or run them as local JARs (starts Eureka first, then the gateway):

```bash
sh run.sh
```

Verify:

- Eureka dashboard: `http://localhost:8761`
- Gateway health: `http://localhost:9000/actuator/health`

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

> Ports and hostnames depend on your setup (Docker vs Kubernetes ingress).

- **Eureka dashboard**: `http://localhost:8761`
- **Gateway**: `http://localhost:9000`

The gateway ships with no business routes. Either add explicit routes in
`spring-cloud/gateway-service/src/main/resources/application.yml`, or rely on the Eureka
**discovery locator** (`/<service-id>/**`) once you register new services.

Actuator/metrics (every service):

- `GET /actuator/health`
- `GET /actuator/prometheus`

---

## Security & Roles

Keycloak is the identity provider; authorization uses a **permission-based RBAC** model
enforced at the gateway. Roles are Keycloak composite realm roles that aggregate
fine-grained permissions (client roles on `platform-client`).

| Role | Can do | Cannot do |
|------|--------|-----------|
| `PLATFORM_ADMIN` | Manage users, roles, platform config | Operate the 5GC |
| `NETWORK_OPERATOR` | View NF status, restart NFs, apply config to the core | Manage users, delete audit logs |
| `SECURITY_ANALYST` | View security alerts, roaming events, tune detection rules | Change network config |
| `AUDITOR` | Read everything, including audit logs | Write anything, anywhere |

Full permission catalog, role→permission mapping, and enforcement details are in
[SECURITY.md](SECURITY.md).

### Get a token and call the gateway

Import `keycloak/platform-realm.json` first (realm `course-management-realm`, client
`platform-client`, one test user per role with password `password`).

```bash
# 1) Get a bearer token
curl -X POST http://localhost:8081/realms/course-management-realm/protocol/openid-connect/token \
  -d grant_type=password \
  -d client_id=platform-client \
  -d client_secret=platform-client-secret \
  -d username=operator-user -d password=password \
  -d scope="openid roles"

# 2) Call the gateway
curl http://localhost:9000/<route> -H "Authorization: Bearer <token>"
```

> Change the client secret and default passwords before any non-local use.

---

## Observability

- **Prometheus** — scrapes `/actuator/prometheus`; check targets are **UP**.
- **Grafana** — dashboards for metrics/logs/traces correlation.
- **Fluent Bit + Loki** — Fluent Bit forwards service logs to Loki.
- **Tempo + OpenTelemetry** — services export traces via the OTel agent to Tempo.

---

## Adding a New Service

1. Create a Maven module (e.g. under `microservices/<name>`) and register it in the
   parent `pom.xml` `<modules>`.
2. Add the `spring-cloud-starter-netflix-eureka-client` dependency and point
   `eureka.client.service-url.defaultZone` at the Eureka server.
3. Expose the service through the gateway (discovery locator `/<service-id>/**` or an
   explicit route).
4. Wire it into `docker/docker-compose-base.yml`, `build-images.sh`, and the `Tiltfile`
   the same way `gateway-service` is wired.
5. Protect its routes at the gateway using the `PERM_*` authorities (see `SecurityConfig`).

---

## Troubleshooting

- **Service won't register with Eureka**: confirm Eureka is up at `:8761` and the client's
  `defaultZone` (or `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`) is correct.
- **Auth issues (401/403)**: check token expiry, that the realm was imported, and that the
  user's role carries the required `PERM_*` permission (see [SECURITY.md](SECURITY.md)).
- **No logs/traces/metrics**: ensure Fluent Bit, the OTel agent, Prometheus, Loki, and
  Tempo are running.
- **Kubernetes image pull issues**: confirm you built images in the Minikube Docker context
  (`eval $(minikube docker-env ...)`).

---

## Notes

- This README reflects the current skeleton (util + eureka-server + gateway-service).
- Some infrastructure manifests (PostgreSQL, MongoDB) remain from the removed domain
  services and are unused by the skeleton — remove them if you don't need them.
