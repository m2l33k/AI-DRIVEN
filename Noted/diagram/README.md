# Nexo Platform — Diagrams (full design set)

Complete visual model of the **5G Core (5GC) telecom management platform** — from system
context down to per-service class design. Sources are **PlantUML** (`.puml`) with a **Mermaid**
mirror ([`diagrams.mermaid.md`](diagrams.mermaid.md)) that renders directly on GitHub.

> Reflects the current codebase: **9 Spring Boot modules** (eureka, gateway, auth, roaming,
> anomaly, rate-limiting, tracing, fault-injection, messaging), Keycloak, per-service databases,
> and the observability stack. Supersedes the older 2-service `infrastructure.puml` / `services.puml`.

---

## How to read this folder (design levels)

| Level | Question it answers | Files |
|-------|--------------------|-------|
| **Context (C4-L1)** | Who uses the system and what does it talk to? | `00-context.puml` |
| **High-Level Design** | What are the layers / big blocks? | `03-hld-architecture.puml` |
| **Infrastructure / Deployment** | What runs where, on which ports? | `01-infrastructure.puml`, `04-deployment.puml` |
| **Service catalogue** | What services/containers exist? | `02-services-catalogue.puml` |
| **Functional (Use cases)** | What can each role do? | `05-usecase.puml` |
| **Security model** | Who is allowed to do what? | `06-rbac-model.puml` |
| **Data model** | How is the roaming data structured? | `07-data-model.puml` |
| **Low-Level Design** | How is each service built internally? | `lld-*.puml` |
| **Behaviour (Sequences)** | How do key flows run end-to-end? | `seq-*.puml` |

---

## File index

### High-level / architecture
| File | Diagram |
|------|---------|
| [`00-context.puml`](00-context.puml) | System context — 4 actors + Keycloak, free5GC, SMTP, observability |
| [`03-hld-architecture.puml`](03-hld-architecture.puml) | Layered high-level design (6 layers) |
| [`01-infrastructure.puml`](01-infrastructure.puml) | Full infrastructure / deployment topology (all 9 services + DBs) |
| [`04-deployment.puml`](04-deployment.puml) | Deployment diagram — local JARs + Docker infra split (+ Compose/K8s note) |
| [`02-services-catalogue.puml`](02-services-catalogue.puml) | Every service/container grouped by tier, with ports |

### Functional / security / data
| File | Diagram |
|------|---------|
| [`05-usecase.puml`](05-usecase.puml) | Use case diagram — Admin / Operator / Analyst / Auditor + shared messaging |
| [`06-rbac-model.puml`](06-rbac-model.puml) | RBAC — realm roles → `PERM_*` client-role permissions |
| [`07-data-model.puml`](07-data-model.puml) | ER model of the roaming dataset (6 entities) |

### Low-level design (per service — class diagrams)
| File | Service |
|------|---------|
| [`lld-auth-service.puml`](lld-auth-service.puml) | auth-service (:9001) |
| [`lld-roaming-analysis-service.puml`](lld-roaming-analysis-service.puml) | roaming-analysis-service (:9002) |
| [`lld-rate-limiting-service.puml`](lld-rate-limiting-service.puml) | rate-limiting-service (:9004) |
| [`lld-messaging-service.puml`](lld-messaging-service.puml) | messaging-service (:9007) |
| [`lld-gateway-and-platform.puml`](lld-gateway-and-platform.puml) | gateway (:9000), eureka (:8761), placeholder services (:9003/5/6) |

### Behaviour (sequence diagrams)
| File | Flow |
|------|------|
| [`seq-login.puml`](seq-login.puml) | State-aware login (ADR-05) |
| [`seq-protected-request.puml`](seq-protected-request.puml) | Protected request + PERM_* (defence in depth) |
| [`seq-first-login-otp.puml`](seq-first-login-otp.puml) | Forgot-password / 3-step OTP reset |
| [`seq-roaming-anomaly.puml`](seq-roaming-anomaly.puml) | Roaming anomaly detection |
| [`seq-rate-limit-check.puml`](seq-rate-limit-check.puml) | Rate-limit decision (Redis token bucket) |
| [`seq-messaging-websocket.puml`](seq-messaging-websocket.puml) | DM + real-time WebSocket notification (ADR-14) |

### Mirror
| File | Purpose |
|------|---------|
| [`diagrams.mermaid.md`](diagrams.mermaid.md) | Mermaid versions of the key diagrams (render on GitHub) |

---

## How to render the PlantUML

- **VS Code** — install the *PlantUML* extension → open a `.puml` → `Alt+D` to preview.
- **CLI** — `plantuml Noted/diagram/*.puml` (needs Java + Graphviz) → PNG/SVG next to each source.
- **Online** — paste a file into <https://www.plantuml.com/plantuml>.

Export all to PNG for the slide deck:
```bash
plantuml -tpng Noted/diagram/*.puml
```

---

## Service / port quick reference

| Service | Path | Port | Datastore |
|---------|------|:----:|-----------|
| eureka-server | `spring-cloud/eureka-server` | 8761 | — |
| gateway-service | `spring-cloud/gateway-service` | 9000 | — |
| auth-service | `microservices/auth-service` | 9001 | Keycloak (via `keycloak-postgres` :5437) |
| roaming-analysis-service | `microservices/roaming-analysis-service` | 9002 | roaming-mysql :3307 |
| anomaly-detection-service | `microservices/anomaly-detection-service` | 9003 | anomaly-postgres :5433 / redis :6380 |
| rate-limiting-service | `microservices/rate-limiting-service` | 9004 | ratelimit-postgres :5434 / redis :6379 |
| distributed-tracing-service | `microservices/distributed-tracing-service` | 9005 | tracing-postgres :5435 |
| fault-injection-service | `microservices/fault-injection-service` | 9006 | fault-postgres :5436 |
| messaging-service | `microservices/messaging-service` | 9007 | messaging-postgres :5438 |
| Keycloak | (Docker) | 8081→8080 | keycloak-postgres :5437 |
| Prometheus / Grafana / Loki / Tempo / Fluent Bit | (Docker) | 9090 / 3000 / 3100 / 4317-4318-3200 / 24224 | — |

> Compose sources: `docker/docker-compose-infra.yml`, `docker/docker-compose-base.yml`,
> `docker/docker-compose-observability.yml`. Realm: `keycloak/platform-realm.json`.
> Design rationale (ADRs) lives in the memory vault `memory/Architecture-Decisions.md`.
