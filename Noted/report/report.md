# Project Report — Auth Management System

**A Spring Cloud Microservices Starter with Keycloak-backed RBAC and full observability**

| | |
|---|---|
| **Project** | `auth-management-system` (v1.0.0) |
| **Group ID** | `io.javatab.microservices` |
| **Platform** | Java 17 · Spring Boot 4.0.3 · Spring Cloud 2025.x |
| **Author** | m2l33k |
| **Date** | 2026-08-05 |
| **Document** | Technical report — the *Starter* foundation |

---

## Table of Contents

- [Abstract](#abstract)
- [Chapter 1 — Starter](#chapter-1--starter)
  - [1.1 Introduction](#11-introduction)
  - [1.2 Problem statement & motivation](#12-problem-statement--motivation)
  - [1.3 Objectives](#13-objectives)
  - [1.4 Scope](#14-scope)
  - [1.5 Architecture overview](#15-architecture-overview)
  - [1.6 Technology choices & justification](#16-technology-choices--justification)
  - [1.7 Component walkthrough](#17-component-walkthrough)
  - [1.8 Security & RBAC design](#18-security--rbac-design)
  - [1.9 Request workflow](#19-request-workflow)
  - [1.10 Observability](#110-observability)
  - [1.11 Deployment workflows](#111-deployment-workflows)
  - [1.12 Design decisions & trade-offs](#112-design-decisions--trade-offs)
  - [1.13 Limitations & future work](#113-limitations--future-work)
  - [1.14 Conclusion](#114-conclusion)
- [Appendix A — Endpoint reference](#appendix-a--endpoint-reference)
- [Appendix B — Ports reference](#appendix-b--ports-reference)
- [Appendix C — References](#appendix-c--references)

---

## Abstract

This report documents the **starter foundation** of a microservices platform built on
Spring Cloud. The system delivers the cross-cutting concerns that every microservices
platform needs — **service discovery**, an **API gateway**, **centralised authentication**,
**fine-grained authorization**, and **observability** — as a clean, working baseline onto
which domain services can be added. Authentication is delegated to **Keycloak** (OAuth2/OIDC);
authorization uses a **permission-based RBAC** model in which roles are Keycloak composite
roles that aggregate fine-grained permissions, enforced at the API gateway and, for
defence-in-depth, inside services. A functional **auth-service** demonstrates the pattern by
wrapping Keycloak's token and Admin REST APIs for login, password flows, and user management.
The platform is fully instrumented with Prometheus, Grafana, Loki, Tempo, and OpenTelemetry,
and ships Docker Compose and Kubernetes (Minikube + Tilt) deployment workflows.

---

## Chapter 1 — Starter

### 1.1 Introduction

Microservices architectures decompose an application into independently deployable services.
That decomposition is powerful, but it pushes a set of hard, repetitive concerns onto every
project before any business value is written: *how do services find each other, how does a
client reach them through one door, how are requests authenticated and authorized, and how do
operators see what is happening across the fleet?*

This project — the **Auth Management System starter** — answers those questions once, in a
reusable baseline. It is deliberately a *starter*: the platform plumbing is complete and
runnable, while the domain services are left to be added. To make the security model concrete
rather than abstract, the starter is themed around a **5G Core (5GC) management platform**,
with roles such as *Network Operator* and *Security Analyst* and permissions such as
`nf:restart` and `core-config:write`.

### 1.2 Problem statement & motivation

Teams starting a microservices platform repeatedly re-solve the same foundational problems,
often inconsistently:

- **Discovery & routing** — hard-coded service URLs are brittle; a gateway and a registry are
  needed.
- **Authentication** — rolling your own auth is risky; an OIDC provider should own identity.
- **Authorization** — role *names* checked in code couple business logic to an org chart and
  make re-slicing permissions a code change.
- **Observability** — without metrics, logs, and traces correlated from day one, debugging a
  distributed system is guesswork.

The motivation for this starter is to provide a **correct, opinionated, working** baseline for
all four, so that adding a new service is a matter of following an established pattern rather
than re-designing the platform.

### 1.3 Objectives

1. Provide **service discovery** via Netflix Eureka.
2. Provide a **single entry point** (Spring Cloud Gateway) that routes to discovered services.
3. Delegate **authentication** to **Keycloak** (OAuth2/OIDC).
4. Enforce **permission-based authorization** at the edge, decoupled from role names.
5. Demonstrate the pattern end-to-end with a real **auth-service**.
6. Ship **observability** (metrics, logs, traces) wired and correlated.
7. Provide reproducible **Docker Compose** and **Kubernetes/Tilt** run workflows.

### 1.4 Scope

**In scope (delivered by the starter):** Eureka server, gateway with RBAC enforcement,
auth-service (login, forgot/update password, user CRUD via Keycloak Admin API), Keycloak realm
with four roles / permission catalog / four test users, the observability stack, a shared
`util` library, and the deployment tooling (`run.sh`, `build-images.sh`, `Tiltfile`,
compose files, Kubernetes manifests).

**Out of scope (left to extend):** the 5GC domain services behind the gateway (network
functions, core-config, security analytics, audit) — the gateway already carries the `PERM_*`
enforcement template for them; a persistent data tier for domain services (Postgres/MongoDB
manifests remain but are unused by the starter); production hardening (secrets management,
TLS termination, HA Keycloak/Eureka).

### 1.5 Architecture overview

The platform is a set of Spring Boot services coordinated by Spring Cloud:

- A **client** presents a bearer JWT to the **gateway** (`:9000`).
- The **gateway** validates the JWT against Keycloak, converts its claims to Spring
  authorities, authorizes the route on a `PERM_*` permission, and forwards the request to a
  service resolved through **Eureka** (`:8761`).
- The **auth-service** (`:9001`) issues tokens (Keycloak password grant) and administers users
  (Keycloak Admin REST API).
- **Keycloak** (`:8081`) is the identity provider and the source of truth for roles and
  permissions.
- The **observability stack** collects metrics (Prometheus), logs (Fluent Bit → Loki), and
  traces (OpenTelemetry → Tempo), unified in **Grafana**.

> See the component and deployment diagrams in [`../uml/`](../uml/) (PlantUML and Mermaid).

### 1.6 Technology choices & justification

| Concern | Technology | Why |
|---------|-----------|-----|
| Discovery | Netflix Eureka | Battle-tested Spring Cloud registry; client-side load balancing with `lb://` |
| Gateway | Spring Cloud Gateway (WebFlux) | Reactive, non-blocking edge; native OAuth2 resource-server + route predicates |
| Identity | Keycloak (OAuth2/OIDC) | Standards-based; composite roles map cleanly to a permission model; Admin API for user management |
| AuthZ enforcement | Spring Security | `PERM_*` authority checks at the gateway; `@PreAuthorize` in services |
| API docs | springdoc-openapi | Aggregated Swagger UI at the gateway across services |
| Metrics | Micrometer + Prometheus + Grafana | Standard actuator `/prometheus` scraping with histogram/SLO buckets |
| Logs | Fluent Bit + Loki | Lightweight forwarding via the Docker `fluentd` log driver |
| Traces | OpenTelemetry agent + Tempo | Zero-code instrumentation; `trace_id`/`span_id` in log MDC for correlation |
| Local orchestration | Docker Compose / Tilt + Minikube | Two workflows: fast compose loop and realistic K8s loop |

### 1.7 Component walkthrough

**Eureka Server** — standalone registry on `:8761`; does not self-register; self-preservation
disabled for fast dev eviction.

**Gateway Service** — reactive gateway on `:9000`. Explicit route for `auth-service`
(`/api/auth/**`, `/api/users/**` → `lb://auth-service`) plus a **discovery locator** so any
registered service is reachable at `/<service-id>/**`. Its `SecurityConfig` is the platform's
primary enforcement point (details in §1.8). It also aggregates Swagger UIs and exposes
histogram/SLO metrics.

**Auth Service** — on `:9001`, package `io.javatab.microservices.auth`. `AuthController` exposes
login / forgot-password / update-password; `UserController` exposes list / create / delete users
guarded by `@PreAuthorize('PERM_users:...')`. `KeycloakService` wraps Keycloak via Spring
`RestClient`: end-user login uses the `platform-client` password grant, while admin operations
use a master-realm `admin-cli` token. It validates a requested role before creating a user (so
no half-created users) and issues temporary passwords with an `UPDATE_PASSWORD` required action.

**Util** — shared library exposing `NetworkUtility` (hostname/IP/port helper) reusable by
services.

**Keycloak** — realm `auth-management`, client `platform-client` (secret
`platform-client-secret`), four composite realm roles, and four test users (§1.8), all
importable from `keycloak/platform-realm.json`.

### 1.8 Security & RBAC design

The defining design decision of the starter is **permission-based** (not role-name-based)
authorization:

- Each realm role (`PLATFORM_ADMIN`, `NETWORK_OPERATOR`, `SECURITY_ANALYST`, `AUDITOR`) is a
  Keycloak **composite** that aggregates fine-grained **permissions** modelled as **client
  roles** on `platform-client` (e.g. `nf:restart`, `audit:read`).
- On authentication, Keycloak embeds `realm_access.roles` and
  `resource_access.platform-client.roles` in the JWT.
- Both the gateway and the auth-service run an identical converter that maps:
  - realm roles → `ROLE_<NAME>` authorities, and
  - client roles → `PERM_<permission>` authorities.
- **Routes authorize on `PERM_*`, never on role names**, so permissions can be re-sliced in
  Keycloak with zero code change. Read (GET) and write (other verbs) are split per resource.

A notable design choice: `audit:delete` is granted to **no role**, making audit logs
append-only/tamper-evident by design.

> The role→permission mapping is captured in the RBAC diagram
> ([`../uml/rbac-model.puml`](../uml/rbac-model.puml)) and the root `SECURITY.md`.

### 1.9 Request workflow

**Login.** `POST /api/auth/login` is public at the gateway and routed to auth-service, which
performs a Keycloak password grant and returns the JWT to the client (see
[`sequence-login.puml`](../uml/sequence-login.puml)).

**Protected call.** A request with `Authorization: Bearer <JWT>` reaches the gateway, which
verifies the signature against Keycloak's JWK set, extracts `ROLE_*`/`PERM_*` authorities, and
authorizes the route on the required `PERM_*`. If authorized, it forwards the request (still
bearing the JWT) to the downstream service, which re-validates and may apply `@PreAuthorize` —
defence in depth (see [`sequence-protected-request.puml`](../uml/sequence-protected-request.puml)).

### 1.10 Observability

Every service exposes actuator `/health`, `/info`, `/metrics`, `/prometheus`. Prometheus
scrapes the gateway, Eureka, and auth-service; Grafana visualises. Logs flow through the Docker
`fluentd` driver to Fluent Bit and into Loki; the OpenTelemetry Java agent exports OTLP traces
to Tempo. Because the logging pattern injects `trace_id`/`span_id` from the MDC, logs and traces
correlate in Grafana. Dashboards live in `grafana-dashboard/` and are provisioned automatically.

### 1.11 Deployment workflows

Three paths, all reproducible:

1. **Local JARs** — `sh run.sh` builds with Maven and boots Eureka → auth-service → gateway in
   order (Eureka first so clients can register).
2. **Docker Compose** — `sh run.sh docker` packages the JARs and runs the base compose file;
   infra and observability have their own compose files.
3. **Kubernetes + Tilt** — `build-images.sh` builds images into Minikube's Docker daemon and
   `tilt up` applies the manifests with live-update.

### 1.12 Design decisions & trade-offs

- **Permissions over role names** — more Keycloak setup up front, but decouples policy from
  code and keeps the gateway rules stable as the org model evolves.
- **Enforcement at the gateway *and* in services** — some duplication, but a compromised or
  bypassed gateway cannot grant unauthorized access to a service.
- **Keycloak Admin API from a service** — convenient user management, but the auth-service
  holds privileged admin credentials; in production these must come from a secrets manager and
  ideally a dedicated service-account client rather than `admin-cli`.
- **Discovery locator enabled** — fast to add services (`/<service-id>/**`), but every route
  must still be covered by a `PERM_*` rule or the `anyExchange().authenticated()` catch-all.

### 1.13 Limitations & future work

- Domain 5GC services are **not implemented**; the gateway carries only the enforcement
  template for them.
- Default secrets and passwords (`platform-client-secret`, `password`, `admin/admin`) are
  **dev-only** and must be rotated before any non-local use.
- Legacy Postgres/MongoDB manifests remain but are unused — prune or repurpose them.
- No TLS, no HA for Keycloak/Eureka, no rate-limiting/circuit-breaking yet — natural next
  steps for production readiness.

### 1.14 Conclusion

The starter delivers a coherent, working microservices foundation: discovery, a single secured
entry point, standards-based authentication, a decoupled permission-based authorization model,
a demonstrated business service, and end-to-end observability — all runnable via three
deployment workflows. It converts the repetitive, error-prone platform groundwork into a
solved baseline, so that subsequent work can focus on domain services added behind the gateway
as Eureka clients, protected by the existing `PERM_*` model.

---

## Appendix A — Endpoint reference

| Endpoint | Method | Required authority | Service |
|----------|:------:|--------------------|---------|
| `/api/auth/login` | POST | public | auth-service |
| `/api/auth/forgot-password` | POST | public | auth-service |
| `/api/auth/password` | PUT | authenticated | auth-service |
| `/api/users` | GET | `PERM_users:read` | auth-service |
| `/api/users` | POST | `PERM_users:write` | auth-service |
| `/api/users/{username}` | DELETE | `PERM_users:write` | auth-service |
| `/api/roles/**` | GET / write | `PERM_roles:read` / `:write` | (template) |
| `/api/platform-config/**` | GET / write | `PERM_platform-config:read` / `:write` | (template) |
| `/api/nf/**` | GET | `PERM_nf:read` | (template) |
| `/api/nf/*/restart` | POST | `PERM_nf:restart` | (template) |
| `/api/core-config/**` | GET / write | `PERM_core-config:read` / `:write` | (template) |
| `/api/security/alerts/**` | GET | `PERM_security-alerts:read` | (template) |
| `/api/security/roaming/**` | GET | `PERM_roaming-events:read` | (template) |
| `/api/security/detection-rules/**` | GET / write | `PERM_detection-rules:read` / `:write` | (template) |
| `/api/audit/**` | GET | `PERM_audit:read` | (template) |
| `/api/audit/**` | DELETE | `PERM_audit:delete` (no role) | (template) |
| `/actuator/**`, Swagger paths | GET | public | all |

*(template)* = gateway RBAC rule present; downstream 5GC service to be added.

## Appendix B — Ports reference

| Service | Port |
|---------|:----:|
| Eureka Server | 8761 |
| Gateway Service | 9000 |
| Auth Service | 9001 |
| Keycloak | 8081 (→8080) |
| Prometheus | 9090 |
| Grafana | 3000 |
| Loki | 3100 |
| Tempo | 4317 / 4318 / 3200 |
| Fluent Bit | 24224 |
| Postgres / MongoDB | 5432 / 27017 |

## Appendix C — References

- Repository root [`README.md`](../../README.md) and [`SECURITY.md`](../../SECURITY.md)
- `Noted/README.md` — deep-dive documentation
- `Noted/uml/` — component, deployment, class, sequence, and RBAC diagrams
- Spring Cloud Gateway, Spring Security OAuth2 Resource Server, Netflix Eureka
- Keycloak Server Administration & Admin REST API
- OpenTelemetry, Prometheus, Grafana, Loki, Tempo documentation
