---
title: Platform Services (new placeholders)
tags: [backend, microservice, roadmap]
updated: 2026-08-15
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

## Per-service datastores (database-per-service, added 2026-08-10)
Each service owns a **dedicated Postgres** container; Redis added only where needed. Defined in
`docker/docker-compose-infra.yml` (bring up with `./infra.sh up` **before** the services). JPA
`ddl-auto=update` — no entities yet, so no tables are created until real logic lands. Redis is
lazy (Lettuce), so it won't block startup; Postgres **is** required at startup.

| Service | Postgres (container / host port / db / user·pass) | Redis (container / host port) |
|---------|--------------------------------------------------|-------------------------------|
| anomaly-detection | `anomaly-postgres` / 5433 / `anomaly_db` / `anomaly` | `anomaly-redis` / 6380 |
| rate-limiting | `ratelimit-postgres` / 5434 / `ratelimit_db` / `ratelimit` | `ratelimit-redis` / 6379 |
| distributed-tracing | `tracing-postgres` / 5435 / `tracing_db` / `tracing` | — (traces go to a backend) |
| fault-injection | `fault-postgres` / 5436 / `fault_db` / `fault` | — |

- Deps added: `spring-boot-starter-data-jpa` + `org.postgresql:postgresql`; anomaly & rate-limiting
  also get `spring-boot-starter-data-redis`.
- Config: default profile → `localhost:<host-port>`; `docker` profile → `<container>:5432` /
  `<redis>:6379`. Overridable via env (`ANOMALY_DB_URL`, `RATELIMIT_REDIS_HOST`, …).
- **Not wired for k8s yet** — would need Postgres/Redis StatefulSets + datasource env in the
  deployment manifests. Follow-up.

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
- **rate-limiting-service** — ✅ **Role A + gateway enforcement live** (2026-08-14 / 2026-08-15):
  Redis token-bucket limiter, reusing existing SECURITY_ANALYST perms (no Keycloak change), **now
  enforced on all downstream traffic** by a gateway `GlobalFilter` (see the 2026-08-15 section
  below). Still open: Role B (attach-flood detection over roaming `attach_events`) + persist
  `BlockEvent`s.
- **distributed-tracing-service** — **Jaeger** facade/placeholder. NB: Jaeger is a tracing
  *backend*, not a Spring service. Real work is either (a) add a Jaeger container to
  `docker-compose-observability.yml` (OTLP sink, can augment/replace Tempo) and make this a thin
  query facade, or (b) drop the service and use Jaeger directly. Decide before building logic.
- **fault-injection-service** — chaos / resilience testing (inject latency, errors, NF outages)
  to validate the platform's fault tolerance.

## rate-limiting-service — Role A (Redis token bucket) ✅ 2026-08-14
No longer a placeholder. Implements an **atomic token-bucket rate limiter** on Redis (:6379) with
policies in Postgres (:5434).

**Design / layers**
```
domain/     RateLimitPolicy (@Entity, keyed by keyType) · RateLimitAction (THROTTLE|BLOCK)
repository/ RateLimitPolicyRepository · PolicySeeder (seeds default/imsi/operator/ip on empty)
ratelimit/  TokenBucketService — runs the Lua script, keeps allow/block counters + top-blocked ZSET
config/     SecurityConfig (JWT, copied from roaming) · RedisConfig (loads Lua) · OpenApiConfig
web/        ProtectionController · dto/{RateLimitCheckRequest,RateLimitResult,ProtectionStatsDto}
resources/scripts/token_bucket.lua   atomic bucket: refill-by-elapsed, consume, PEXPIRE
```
**Bucket semantics.** Policy = `capacity` (burst) refilled `refillTokens` per `refillIntervalMs`.
Decision + consume happen in **one Redis round-trip** via `token_bucket.lua` (no read-modify-write
race across instances). **Fail-open:** missing/disabled policy or Redis error ⇒ allowed (the limiter
can never take the platform down). Seeded policies: `default` 100/min, `imsi` 20/min (BLOCK),
`operator` 2000/min, `ip` 300/min.

**API (`/api/protection`)** — all JWT-guarded except `/health`.
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/check` | `PERM_roaming-events:read` | Decide+consume for `{keyType,key,tokens?}`; 200 or **429** + `Retry-After`/`X-RateLimit-Remaining` |
| GET | `/policies` | `PERM_roaming-events:read` | List policies |
| PUT | `/policies/{keyType}` | `PERM_detection-rules:write` | Create/replace a policy (body = `RateLimitPolicyDto`, validated) |
| DELETE | `/policies/{keyType}` | `PERM_detection-rules:write` | Delete a policy |
| GET | `/stats?topN=` | `PERM_roaming-events:read` | allowed/blocked counts, block-rate %, top offenders |
| POST | `/internal/protection/check` | **public (in-cluster only)** | Gateway hot-path decision — never routed publicly |
| GET | `/health` | public | Liveness probe |

**✅ No Keycloak change needed (2026-08-14 decision).** Reuses permissions that already exist and
are held by **SECURITY_ANALYST**: reads → `roaming-events:read`, writes → `detection-rules:write`
(AUDITOR/PLATFORM_ADMIN also read via `roaming-events:read`). The earlier `protection:read/manage`
idea was dropped to avoid editing the realm. See [[Roles-and-Permissions]].

**Wiring:** pom gained `security` + `oauth2-resource-server` + `validation`; `application.yml` gained
the Keycloak `issuer-uri`/`jwk-set-uri` (both profiles). Gateway now enforces
`PERM_roaming-events:read` (+`detection-rules:write` on policy writes); `/api/protection/health`
stays public. `mvnw -pl microservices/rate-limiting-service compile` → **EXIT=0**.

**Docker image built (2026-08-14):** `mvnw -pl … package -DskipTests` (fat jar ~100 MB) then
`docker compose -f docker/docker-compose-base.yml build rate-limiting-service` →
image **`docker-rate-limiting-service:latest`** (~573 MB), **EXIT=0**. To run it, bring up infra
first (`./infra.sh up` → eureka, keycloak, `ratelimit-postgres`, `ratelimit-redis`), then
`docker compose -f docker-compose-base.yml up -d rate-limiting-service`.

## rate-limiting-service — fixes + gateway enforcement ✅ 2026-08-15
Three fixes + the enforcement wiring that makes the limiter actually protect the other services.

**Fixes (rate-limiting-service):**
- **Swagger Authorize:** `OpenApiConfig` was missing `@SecurityScheme(name="bearerAuth", HTTP,
  bearer, JWT)` — the lock icons rendered (from operation `@SecurityRequirement`) but the button
  couldn't accept a token. Added it (mirrors roaming's).
- **PUT policy 400:** the endpoint bound the JSON body to the JPA **entity** `RateLimitPolicy`,
  which has record-style accessors (`capacity()`) and **no setters** → Jackson couldn't map the
  fields (`FAIL_ON_UNKNOWN_PROPERTIES`) → 400, and `GET /policies` serialized empty `{}`. Fix: new
  **`web/dto/RateLimitPolicyDto`** (record; `@Min(1)` capacity/refill/interval, `@NotNull action`)
  used for **both** read (`from(entity)`) and write; controller GET/PUT now use it. Added
  **`web/ApiExceptionHandler`** (`@RestControllerAdvice`) → detailed 400s:
  `{error:"Validation failed", fields:{…}}` and `{error:"Malformed request body", details:…}`.
- **`/internal/protection/check`** — new unauthenticated, in-cluster decision endpoint
  (`InternalProtectionController`, reuses `TokenBucketService`); `/internal/**` permitted in
  `SecurityConfig`. Not in the gateway route table → unreachable publicly. Lets the gateway ask
  "allowed?" without carrying a user JWT (the public `/check` stays permission-guarded for humans).

**Gateway enforcement (Option 1 — chosen over Gateway's built-in `RequestRateLimiter`)** — new
package `com.example.springcloud.gateway.ratelimit`:
- **`RateLimitGlobalFilter`** (reactive `GlobalFilter`, order `HIGHEST_PRECEDENCE+100`): derives a
  `(keyType,key)` — `X-Subscriber-Imsi`→`imsi`, `X-Operator-Id`→`operator`, else client IP→`ip`
  (maps onto the seeded policies) — calls the limiter and **short-circuits `429` + `Retry-After`**
  on deny, else forwards. Skips `/api/protection`, `/internal`, `/actuator`, `/swagger-ui`,
  `/eureka`, `/api/auth`, any `*/v3/api-docs`. **Fail-open** on limiter error (configurable).
- **`RateLimitClient`** — load-balanced `WebClient` → `lb://rate-limiting-service/internal/protection/check`.
- **`RateLimitConfig`** (`@LoadBalanced WebClient.Builder` + `@EnableConfigurationProperties`) and
  **`RateLimitProperties`** (`protection.enforcement.enabled|failOpen|tokensPerRequest|excludedPaths`,
  added to gateway `application.yml`, env-overridable `PROTECTION_ENFORCEMENT_*`).
- **Effect:** editing a policy in the console now throttles **real traffic to every downstream
  service** (roaming/anomaly/audit/…) at the single gateway choke point; `/stats` allowed/blocked +
  top-offenders reflect real traffic. Both modules compile (EXIT=0). Why this over the built-in
  `RedisRateLimiter`: keeps the Postgres policy table + `TokenBucketService` as the single source of
  truth. See ADR-11 in [[Architecture-Decisions]].

**Still open:** persist `BlockEvent`s for the dashboard; Role B attach-flood detection tied to
[[Roaming-Analysis-Service]]; runtime smoke test with the full stack up.

**Frontend:** a **Rate Limiting** page (security-analyst) drives `/stats` + policy CRUD (write UI
gated on `detection-rules:write`) + a decision tester — see [[Frontend-Components]].

## Related notes
- [[Backend-and-Infra]] · [[Ports-and-URLs]] · [[Architecture-Decisions]] · [[Diagrams]] · [[Next-Steps]] · [[Session-Log]] · [[Roaming-Analysis-Service]]
