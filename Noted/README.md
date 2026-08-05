# Auth Management System — Spring Cloud Microservices Starter

> A production-style **microservices starter** built on Spring Cloud. It provides service
> discovery, a single API gateway, Keycloak-backed OAuth2/OIDC authentication, a
> **permission-based RBAC** authorization model, a working **auth-service** (login + user
> management), and a full observability stack (metrics, logs, traces).

This document is the deep-dive companion to the repository. It describes **what the project
is, how every component fits together, and exactly how a request flows** from a client
through the gateway to a downstream service and to Keycloak.

---

## Table of Contents

1. [What this project is](#1-what-this-project-is)
2. [High-level architecture](#2-high-level-architecture)
3. [Modules and ports](#3-modules-and-ports)
4. [Technology stack](#4-technology-stack)
5. [The request / auth workflow](#5-the-request--auth-workflow)
6. [Security & RBAC model](#6-security--rbac-model)
7. [The auth-service in detail](#7-the-auth-service-in-detail)
8. [The gateway in detail](#8-the-gateway-in-detail)
9. [Service discovery (Eureka)](#9-service-discovery-eureka)
10. [Observability stack](#10-observability-stack)
11. [Running the platform](#11-running-the-platform)
12. [End-to-end walkthrough (curl)](#12-end-to-end-walkthrough-curl)
13. [Adding a new business service](#13-adding-a-new-business-service)
14. [Repository layout](#14-repository-layout)
15. [UML diagrams & report](#15-uml-diagrams--report)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. What this project is

`auth-management-system` (Maven `groupId: io.javatab.microservices`, `version: 1.0.0`) is a
Spring Boot **4.0.3** / Spring Cloud multi-module aggregator that stands up the backbone of a
microservices platform:

- **Eureka Server** — the service registry every service registers with.
- **Gateway Service** — the single public entry point; routes traffic, and is the primary
  **authorization enforcement point** (JWT validation + permission checks).
- **Auth Service** — a business service that wraps Keycloak: user login, password flows, and
  admin user management via the Keycloak Admin REST API.
- **Util** — a shared library module (network utility helper) reused across services.
- **Keycloak** — the external identity provider (authentication + role/permission source).
- **Observability** — Prometheus, Grafana, Loki, Tempo, Fluent Bit, and the OpenTelemetry
  Java agent.

It is designed as a **starter**: the plumbing (discovery, gateway, security, observability,
Docker/Kubernetes workflows) is complete and working, and you add your own domain services as
Eureka clients behind the gateway. The security layer is themed around a **5G Core (5GC)
management platform** (network functions, core config, security analytics, audit) to give the
RBAC model concrete, realistic roles.

---

## 2. High-level architecture

```
                       ┌──────────────────────────────────────────────┐
                       │                   Clients                    │
                       │        (curl / Bruno / SPA / Swagger UI)      │
                       └───────────────────────┬──────────────────────┘
                                               │  HTTPS + Bearer JWT
                                               ▼
                       ┌──────────────────────────────────────────────┐
                       │           Gateway Service  (:9000)           │
                       │  • Spring Cloud Gateway (WebFlux)            │
                       │  • OAuth2 Resource Server (validates JWT)    │
                       │  • RBAC: PERM_* authority checks per route   │
                       │  • Discovery locator  /<service-id>/**       │
                       └───────┬───────────────────────────┬──────────┘
                               │ lb://auth-service         │ registers /
                               ▼                           │ discovers
        ┌────────────────────────────────┐                 ▼
        │       Auth Service (:9001)      │      ┌────────────────────────┐
        │  • OAuth2 Resource Server      │◄─────│  Eureka Server (:8761) │
        │  • @PreAuthorize PERM_* checks │      │   service registry     │
        │  • Keycloak Admin REST client  │      └────────────────────────┘
        └───────────────┬─────────────────┘
                        │ token + admin REST
                        ▼
        ┌────────────────────────────────┐
        │        Keycloak (:8081)         │
        │  realm: auth-management         │
        │  client: platform-client        │
        │  roles + composite permissions  │
        └────────────────────────────────┘

  Observability (side channel):
   Services ──logs──► Fluent Bit ──► Loki ──┐
   Services ──traces (OTel agent)──► Tempo ──┼──► Grafana (:3000)
   Prometheus (:9090) ──scrape /actuator/prometheus──┘
```

---

## 3. Modules and ports

| Module | Path | Port | Role |
|--------|------|:----:|------|
| Eureka Server | `spring-cloud/eureka-server` | `8761` | Service discovery / registry |
| Gateway Service | `spring-cloud/gateway-service` | `9000` | API gateway + auth enforcement |
| Auth Service | `microservices/auth-service` | `9001` | Login, password flows, user admin |
| Util | `util` | — | Shared library (`NetworkUtility`) |
| Keycloak | (Docker) | `8081`→8080 | Identity provider |
| Prometheus | (Docker) | `9090` | Metrics scraping |
| Grafana | (Docker) | `3000` | Dashboards |
| Loki | (Docker) | `3100` | Log aggregation |
| Tempo | (Docker) | `4317/4318/3200` | Trace storage (OTLP) |
| Fluent Bit | (Docker) | `24224` | Log forwarder → Loki |
| Postgres | (Docker) | `5432` | Infra (legacy, optional) |
| MongoDB | (Docker) | `27017` | Infra (legacy, optional) |

---

## 4. Technology stack

- **Java 17**, **Spring Boot 4.0.3**, **Spring Cloud 2025.x**
- **Netflix Eureka** — service discovery
- **Spring Cloud Gateway (WebFlux / reactive)** — routing + edge security
- **Spring Security OAuth2 Resource Server** — JWT validation (both gateway and auth-service)
- **Keycloak** — OAuth2/OIDC provider; realm `auth-management`, client `platform-client`
- **Spring `RestClient`** — auth-service → Keycloak Admin REST API
- **springdoc-openapi / Swagger UI** — API docs, aggregated at the gateway
- **OpenTelemetry Java agent** — trace export (OTLP → Tempo)
- **Prometheus / Grafana / Loki / Tempo / Fluent Bit** — observability
- **Docker Compose** and **Kubernetes (Minikube + Tilt)** — deployment workflows
- **Bruno** (`api-specs/bruno`) — API request collection

---

## 5. The request / auth workflow

The platform separates **authentication** (proving who you are — Keycloak) from
**authorization** (what you may do — enforced on `PERM_*` authorities at the edge and in
services). There are two token journeys:

### 5.1 Login (obtaining a token)

1. Client `POST /api/auth/login` with `{ email, password }` → hits the **gateway**.
2. Gateway sees `/api/auth/login` is **permitAll** and routes it to **auth-service**
   (`lb://auth-service` via Eureka).
3. Auth-service `KeycloakService.login()` performs an OAuth2 **password grant** against
   Keycloak's token endpoint using `platform-client` + secret, scope `openid roles`.
4. Keycloak returns a **JWT access token** whose claims carry:
   - `realm_access.roles` → the realm role (e.g. `NETWORK_OPERATOR`)
   - `resource_access.platform-client.roles` → fine-grained permissions (e.g. `nf:restart`)
5. The token is returned to the client.

### 5.2 Calling a protected route

1. Client calls e.g. `POST /api/nf/{id}/restart` with `Authorization: Bearer <token>`.
2. The **gateway** (OAuth2 resource server) validates the JWT signature against Keycloak's
   JWK set (`.../protocol/openid-connect/certs`).
3. The gateway's `grantedAuthoritiesExtractor` converts claims into Spring authorities:
   - realm roles → `ROLE_<NAME>` (e.g. `ROLE_NETWORK_OPERATOR`)
   - `platform-client` roles → `PERM_<permission>` (e.g. `PERM_nf:restart`)
4. The route matcher `.pathMatchers(POST, "/api/nf/*/restart").hasAuthority("PERM_nf:restart")`
   authorizes the request — **on the permission, not the role name**.
5. The gateway forwards the request (still bearing the JWT) to the downstream service.
6. The downstream service (e.g. auth-service) **re-validates** the JWT and may apply its own
   `@PreAuthorize("hasAuthority('PERM_users:read')")` method checks — defence in depth.

> See the [auth login sequence diagram](uml/sequence-login.puml) and the
> [protected-request sequence diagram](uml/sequence-protected-request.puml).

---

## 6. Security & RBAC model

Authorization is **permission-based**, not role-name-based. Each Keycloak realm role is a
**composite** that aggregates fine-grained permissions, modelled as **client roles** on the
`platform-client` client. Services authorize on permissions, so roles can be re-sliced in
Keycloak with **no code change**.

### Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| `PLATFORM_ADMIN` | Manage users, roles, platform config | Operate the 5GC |
| `NETWORK_OPERATOR` | View NF status, restart NFs, apply core config | Manage users, delete audit logs |
| `SECURITY_ANALYST` | View security alerts, roaming events, tune detection rules | Change network config |
| `AUDITOR` | Read everything, including audit logs | Write anything, anywhere |

### Permission catalog

| Resource | Permissions |
|----------|-------------|
| IAM — users | `users:read`, `users:write` |
| IAM — roles | `roles:read`, `roles:write` |
| Platform config | `platform-config:read`, `platform-config:write` |
| Network Functions | `nf:read`, `nf:restart` |
| 5GC core config | `core-config:read`, `core-config:write` |
| Security | `security-alerts:read`, `roaming-events:read`, `detection-rules:read`, `detection-rules:write` |
| Audit logs | `audit:read`, `audit:delete` |

> `audit:delete` is deliberately mapped to **no role** — audit logs are append-only /
> tamper-evident by design.

### How claims become authorities

Both the gateway (`SecurityConfig.grantedAuthoritiesExtractor`) and the auth-service
(`SecurityConfig.jwtAuthenticationConverter`) run the same conversion:

```
realm_access.roles = [ "NETWORK_OPERATOR" ]
resource_access.platform-client.roles = [ "nf:read", "nf:restart", "core-config:read", "core-config:write" ]
        │
        ▼
Granted authorities:
  ROLE_NETWORK_OPERATOR
  PERM_nf:read
  PERM_nf:restart
  PERM_core-config:read
  PERM_core-config:write
```

Full mapping is in the root [`SECURITY.md`](../SECURITY.md).

### Test users

Imported from `keycloak/platform-realm.json` (realm `auth-management`, all password `password`):

| User | Role |
|------|------|
| `admin-user` | `PLATFORM_ADMIN` |
| `operator-user` | `NETWORK_OPERATOR` |
| `analyst-user` | `SECURITY_ANALYST` |
| `auditor-user` | `AUDITOR` |

---

## 7. The auth-service in detail

Package root: `io.javatab.microservices.auth`.

| Endpoint | Method | Auth | Purpose |
|----------|:------:|------|---------|
| `/api/auth/login` | POST | public | Password grant → Keycloak tokens |
| `/api/auth/forgot-password` | POST | public | Set temp password + force change (dev returns it) |
| `/api/auth/password` | PUT | authenticated | Change your own password (verifies current) |
| `/api/users` | GET | `PERM_users:read` | List realm users |
| `/api/users` | POST | `PERM_users:write` | Create user + assign realm role |
| `/api/users/{username}` | DELETE | `PERM_users:write` | Delete user |

**Key classes**

- `AuthController` / `UserController` — REST endpoints; `UserController` uses
  `@PreAuthorize("hasAuthority('PERM_users:...')")`.
- `KeycloakService` — thin wrapper over Keycloak using Spring `RestClient`:
  - **login** via password grant on `platform-client`;
  - **admin operations** (create/list/delete user, set/reset password, assign realm role)
    using a **master-realm `admin-cli`** admin token;
  - validates the requested role first so a user is never half-created;
  - `resetForgottenPassword` sets a random temp password + `UPDATE_PASSWORD` required action.
- `SecurityConfig` — resource server; permits login/forgot-password/docs/actuator, requires
  JWT elsewhere, and installs the `ROLE_*` / `PERM_*` converter with `@EnableMethodSecurity`.
- `KeycloakProperties` — binds `keycloak.*` config (base-url, realm, client id/secret, admin
  creds).
- `OpenApiConfig` — declares the JWT bearer scheme and a relative `/` server so Swagger
  "Try it out" works through the gateway.

**Configuration** (`application.yml`) is env-overridable; a `docker` profile repoints
Keycloak/Eureka to in-network hostnames (`keycloak:8080`, `eureka-server:8761`).

---

## 8. The gateway in detail

Package root: `com.example.springcloud.gateway`.

- **Routing** (`application.yml`):
  - Explicit route `auth-service` → `lb://auth-service` for `Path=/api/auth/**,/api/users/**`.
  - `auth-service-docs` route rewrites `/auth-service/v3/api-docs` for the aggregated Swagger.
  - **Discovery locator enabled**: any registered service is reachable at `/<service-id>/**`.
- **Security** (`SecurityConfig.java`) — reactive `SecurityWebFilterChain`:
  - CSRF disabled (stateless bearer API).
  - Public: `/api/public`, `/actuator/**`, Swagger/OpenAPI paths, `POST /api/auth/login`,
    `POST /api/auth/forgot-password`.
  - Per-resource `PERM_*` rules split **read (GET)** vs **write (other methods)** — see the
    [SecurityConfig source](../spring-cloud/gateway-service/src/main/java/com/example/springcloud/gateway/config/SecurityConfig.java).
  - `anyExchange().authenticated()` as the catch-all.
  - OAuth2 resource server with the custom JWT → authorities converter.
- **Aggregated Swagger UI** at `/swagger-ui.html` lists both `gateway` and `auth-service`.
- **Metrics**: histogram + SLO buckets for `http.server.requests`, Prometheus endpoint enabled.
- **Tracing**: the OpenTelemetry Java agent (wired via `JAVA_TOOL_OPTIONS` in Docker) exports
  OTLP traces to Tempo.

---

## 9. Service discovery (Eureka)

- Standalone server on `:8761`; does **not** register with or fetch from itself;
  self-preservation disabled for fast dev eviction.
- Gateway and auth-service register as clients (`prefer-ip-address: true`), pointing
  `defaultZone` at `http://localhost:8761/eureka/` (or `http://eureka-server:8761/eureka/`
  under the `docker` profile).
- The gateway resolves `lb://auth-service` and the `/<service-id>/**` discovery locator via
  the Eureka registry.

---

## 10. Observability stack

| Concern | Tooling | Flow |
|---------|---------|------|
| **Metrics** | Prometheus + Grafana | Prometheus scrapes `/actuator/prometheus` on gateway (9000), eureka (8761), auth-service (9001); Grafana visualizes. |
| **Logs** | Fluent Bit + Loki | Docker `fluentd` log driver → Fluent Bit (`:24224`) → Loki (`:3100`) → Grafana. |
| **Traces** | OpenTelemetry + Tempo | OTel Java agent exports OTLP → Tempo (`:4318`) → Grafana. |

- Log pattern includes `trace_id` / `span_id` MDC so logs correlate with traces in Grafana.
- Dashboards live in `grafana-dashboard/` and are provisioned via
  `docker/grafana/provisioning/`.
- Start it with `docker compose -f docker/docker-compose-observability.yml up -d --build`.

---

## 11. Running the platform

### Option A — Local JARs (fastest for dev)

```bash
# 1. Start infra (Keycloak, etc.)
cd docker && docker compose -f docker-compose-infra.yml up -d --build && cd ..

# 2. Import the realm: http://localhost:8081 (admin/admin) →
#    Create realm → upload keycloak/platform-realm.json

# 3. (optional) observability
cd docker && docker compose -f docker-compose-observability.yml up -d --build && cd ..

# 4. Build + run eureka → auth-service → gateway (in order)
sh run.sh
```

Endpoints:
- Eureka dashboard — http://localhost:8761
- Gateway health — http://localhost:9000/actuator/health
- Gateway Swagger — http://localhost:9000/swagger-ui.html
- Auth service Swagger — http://localhost:9001/swagger-ui.html

### Option B — Docker Compose

```bash
sh run.sh docker   # mvn package + docker-compose-base.yml (eureka, auth, gateway)
```

### Option C — Kubernetes + Tilt

```bash
minikube start --profile=microservice-deployment --memory=4g --cpus=4 \
  --disk-size=30g --kubernetes-version=v1.31.0 --driver=docker
minikube addons enable ingress --profile microservice-deployment
eval $(minikube -p microservice-deployment docker-env)
sh build-images.sh
tilt up
```

---

## 12. End-to-end walkthrough (curl)

```bash
# 1) Log in as the network operator (through the gateway)
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"operator-user","password":"password"}' | jq -r .access_token)

# 2) Allowed: operator can read network-function status
curl -i http://localhost:9000/api/nf/amf-1 -H "Authorization: Bearer $TOKEN"

# 3) Allowed: operator can restart a network function
curl -i -X POST http://localhost:9000/api/nf/amf-1/restart -H "Authorization: Bearer $TOKEN"

# 4) Denied (403): operator lacks users:read
curl -i http://localhost:9000/api/users -H "Authorization: Bearer $TOKEN"
```

> `PERM_*` authorities decide each outcome. Log in as `admin-user` to exercise `/api/users`,
> or `auditor-user` to exercise `/api/audit` (read-only). Note `/api/nf/**` beyond auth-service
> has no downstream service yet — it demonstrates the gateway enforcement template; add the
> service to make it functional.

You can also drive these from the **Bruno** collection in `api-specs/bruno`.

---

## 13. Adding a new business service

1. Create a Maven module under `microservices/<name>` and add it to the parent `pom.xml`
   `<modules>`.
2. Add `spring-cloud-starter-netflix-eureka-client` and point
   `eureka.client.service-url.defaultZone` at Eureka.
3. Make it an **OAuth2 resource server** and reuse the `ROLE_*` / `PERM_*` JWT converter for
   defence-in-depth method security.
4. Expose it at the gateway — rely on the discovery locator `/<service-id>/**` or add an
   explicit route in the gateway `application.yml`.
5. Add `PERM_*` path rules to the gateway `SecurityConfig`.
6. Wire it into `docker/docker-compose-base.yml`, `build-images.sh`, and the `Tiltfile`
   exactly like `auth-service`.

---

## 14. Repository layout

```
.
├── pom.xml                         # parent aggregator (Spring Boot 4.0.3)
├── util/                           # shared library (NetworkUtility)
├── spring-cloud/
│   ├── eureka-server/              # discovery server (8761)
│   └── gateway-service/            # API gateway + edge security (9000)
├── microservices/
│   └── auth-service/               # login + Keycloak user management (9001)
├── keycloak/
│   └── platform-realm.json         # realm: roles, platform-client, 4 test users
├── docker/                         # compose: infra / base / observability + configs
├── kubernetes/                     # infra manifests (keycloak, prometheus, loki, ...)
├── grafana-dashboard/              # Grafana dashboard JSON
├── api-specs/bruno/                # Bruno API collection
├── Tiltfile                        # Tilt (Minikube) workflow
├── build-images.sh / run.sh        # build & run helpers
├── README.md / SECURITY.md         # root docs
└── Noted/                          # ← this documentation set (README, UML, report)
```

---

## 15. UML diagrams & report

- **UML** — see [`Noted/uml/`](uml/): component, deployment, class, RBAC, and sequence
  diagrams in [PlantUML](https://plantuml.com) (`.puml`) plus a Mermaid mirror
  ([`diagrams.mermaid.md`](uml/diagrams.mermaid.md)) that renders directly on GitHub.
- **Report** — see [`Noted/report/report.md`](report/report.md), which contains the
  **"Starter"** chapter documenting the project foundation.

To render PlantUML locally:

```bash
# with the plantuml CLI (needs Java + Graphviz)
plantuml Noted/uml/*.puml
```

---

## 16. Troubleshooting

- **Service not in Eureka** — confirm Eureka is up on `:8761` and the client `defaultZone`
  (or `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`) is correct.
- **401 Unauthorized** — token missing/expired, or JWK/issuer URI mismatch (check the
  `docker` profile hostnames).
- **403 Forbidden** — the user's role does not carry the required `PERM_*` permission; verify
  the realm was imported and the composite mapping (see `SECURITY.md`).
- **Login works but admin ops fail** — auth-service needs valid Keycloak **admin** credentials
  (`KEYCLOAK_ADMIN_USERNAME`/`PASSWORD`) to call the Admin REST API.
- **No metrics/logs/traces** — ensure Prometheus, Fluent Bit, Loki, Tempo are running and the
  OTel agent is attached (gateway `JAVA_TOOL_OPTIONS`).
- **K8s image pull errors** — build inside the Minikube Docker context
  (`eval $(minikube docker-env ...)`).

---

*Generated as part of the `Noted/` documentation set for the Auth Management System starter.*
