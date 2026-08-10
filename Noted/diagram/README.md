# Infrastructure Design & Service Catalogue

PlantUML diagrams describing the **infrastructure design** of the 5G Core telecom
management platform and the full list of services in the design.

## Files

| File | What it shows |
|------|---------------|
| [`infrastructure.puml`](infrastructure.puml) | End-to-end infra / deployment topology on the Docker `shared-network`: client → gateway → microservices → identity → data stores → observability. |
| [`services.puml`](services.puml) | Service catalogue — every service/container, grouped by tier, with ports and source paths. |

## Rendered diagrams

### Infrastructure — deployment topology
![Infrastructure](../Assets/infra%205GC.png)

### Service catalogue
![Services](../Assets/service%20infra.svg)

## How to render

- **VS Code**: PlantUML extension → `Alt+D` to preview.
- **CLI**: `plantuml Noted/diagram/*.puml` (produces PNG/SVG next to the source).
- **Online**: paste into <https://www.plantuml.com/plantuml>.

## All services in the design

### Application services (Spring Boot 4, Java 17)
| Service | Path | Port | Role |
|---------|------|------|------|
| `eureka-server` | `spring-cloud/eureka-server` | 8761 | Service discovery / registry |
| `gateway-service` | `spring-cloud/gateway-service` | 9000 | API gateway (Spring Cloud Gateway, WebFlux), OAuth2 RS + RBAC, `GET /api/metrics/overview` |
| `auth-service` | `microservices/auth-service` | 9001 | Keycloak-backed auth & user management (state-aware login, OTP reset, email verify) |
| `roaming-analysis-service` | `microservices/roaming-analysis-service` | 9002 | 5G roaming events + risk scoring & analytics (persisted in MySQL) |
| `util` | `util/` | — | Shared library module |

### Identity
| Service | Port | Role |
|---------|------|------|
| `keycloak` | 8081 → 8080 | OAuth2/OIDC — realm `auth-management`, client `platform-client` |

### Data stores
| Service | Port | Status |
|---------|------|--------|
| `roaming-mysql` (mysql:8.4) | 3307 → 3306 | **Active** — `roaming_db` for roaming-analysis-service |
| `postgres` (postgres:17.4) | 5432 | Legacy / optional |
| `mongodb` (mongo:6.0.4) | 27017 | Legacy / optional |

### Observability
| Service | Port | Role |
|---------|------|------|
| `prometheus` | 9090 | Metrics scraping |
| `grafana` | 3000 | Dashboards |
| `loki` | 3100 | Log storage |
| `tempo` | 4317 / 4318 / 3200 | Traces (OTLP) |
| `fluent-bit` | 24224 | Log shipping → Loki |

### Client
| Service | Path | Role |
|---------|------|------|
| `Frontend` | `Frontend/` | Angular 22 role-based console |

> Compose sources: `docker/docker-compose-base.yml`, `docker/docker-compose-infra.yml`,
> `docker/docker-compose-observability.yml`.
