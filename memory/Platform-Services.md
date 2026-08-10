---
title: Platform Services (new placeholders)
tags: [backend, microservice, roadmap]
updated: 2026-08-10
---

# Platform Services

Four **empty placeholder microservices** added on 2026-08-10, each currently exposing **only**
a health-check endpoint. They mirror the [[Backend-and-Infra|service template]] but are kept
deliberately lean — **no security, no JPA** — so they're trivial liveness probes until real
logic lands. See the roadmap per service below.

## The four services

| Service | Port | Route | Base package | Health |
|---------|------|-------|--------------|--------|
| `anomaly-detection-service` | 9003 | `/api/anomaly` | `io.javatab.microservices.anomaly` | `GET /api/anomaly/health` |
| `rate-limiting-service` | 9004 | `/api/protection` | `io.javatab.microservices.ratelimit` | `GET /api/protection/health` |
| `distributed-tracing-service` | 9005 | `/api/tracing` | `io.javatab.microservices.tracing` | `GET /api/tracing/health` |
| `fault-injection-service` | 9006 | `/api/fault` | `io.javatab.microservices.faultinjection` | `GET /api/fault/health` |

Each health endpoint returns `{ "status": "UP", "service": "<name>", "timestamp": "<ISO>" }`.
Actuator (`/actuator/health`, `/actuator/prometheus`) is also exposed.

## What's in each module (the empty skeleton)
```
pom.xml                         web + eureka-client + actuator + micrometer-prometheus + springdoc
src/main/java/.../<Name>Application.java
src/main/java/.../web/HealthController.java     @RequestMapping("/api/<slug>") + GET /health
src/main/java/.../config/OpenApiConfig.java     @OpenAPIDefinition (Swagger title)
src/main/resources/application.yml              default + docker profiles (eureka only)
Dockerfile                                      layered jar, EXPOSE <port>
kubernetes/deployment.yml + service.yml         ClusterIP 80 -> <port>
```

## Wiring done (same as any platform service)
- Registered in root `pom.xml` `<modules>`.
- Gateway routes + docs routes + Swagger aggregation entries — **both** default and `docker`
  profiles (`gateway-service/application.yml`).
- **Health paths whitelisted as public** in the gateway `SecurityConfig` (WebFlux) so they're
  reachable through `:9000` without a JWT.
- Added to `docker/docker-compose-base.yml` (fluentd logging, `shared-network`, depends on eureka).
- `mvnw compile` on all four + gateway → **EXIT=0** (2026-08-10).

## Roadmap — what each should become
- **anomaly-detection-service** — real-time anomaly detection over 5G signalling/roaming.
  Likely consumes/overlaps with [[Roaming-Analysis-Service]]'s heuristic `/anomalies`; candidate
  to centralise anomaly logic and swap heuristics for ML.
- **rate-limiting-service** — request throttling / abuse protection for the 5GC edge. Could back
  gateway rate-limit filters (Redis token bucket) or protect signalling interfaces.
- **distributed-tracing-service** — **Jaeger** facade/placeholder. NB: Jaeger is a tracing
  *backend*, not a Spring service. Real work is either (a) add a Jaeger container to
  `docker-compose-observability.yml` (OTLP sink, can augment/replace Tempo) and make this a thin
  query facade, or (b) drop the service and use Jaeger directly. Decide before building logic.
- **fault-injection-service** — chaos / resilience testing (inject latency, errors, NF outages)
  to validate the platform's fault tolerance.

## Related notes
- [[Backend-and-Infra]] · [[Ports-and-URLs]] · [[Architecture-Decisions]] · [[Diagrams]] · [[Next-Steps]] · [[Session-Log]]
