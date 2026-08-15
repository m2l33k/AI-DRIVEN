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
> In the **[[5GC-Core|free5GC]]** design these three placeholders become the proposal's Layer-02/03
> engines around the core — see the service-mapping table in [[5GC-Core]] and dashboards in
> [[Grafana-Dashboards]].
- **anomaly-detection-service** — real-time anomaly detection over 5G signalling/roaming
  (**Layer 02**): consume free5GC signalling (metrics + Loki logs) → registration-flood / auth-failure
  bursts / NAS anomalies; P1 rule-based → P2 z-score/IQR reusing [[Roaming-Analysis-Service]]'s
  `AnomalyDetector`; alerts → Grafana **D4**. Centralises anomaly logic; ML later.
- **rate-limiting-service** — ✅ **Role A (standalone limiter)** (2026-08-14), + Swagger/PUT-DTO
  fixes (2026-08-15). A gateway-enforcement experiment was **tried and reverted** the same day (it
  slowed the hot path — see the 2026-08-15 section below). Limiter stays **advisory** (`/check`).
  Still open: Role B (attach-flood detection over roaming `attach_events`) + persist `BlockEvent`s.
- **distributed-tracing-service** — **Jaeger** facade/placeholder. NB: Jaeger is a tracing
  *backend*, not a Spring service. Real work is either (a) add a Jaeger container to
  `docker-compose-observability.yml` (OTLP sink, can augment/replace Tempo) and make this a thin
  query facade, or (b) drop the service and use Jaeger directly. Decide before building logic.
- **fault-injection-service** — chaos / resilience testing (**Layer 03**, proposal §5.3): kill SMF
  mid-session (NRF heartbeat cleanup), UDM 503, cert expiry, isolate UPF↔SMF (PFCP teardown) — assert
  free5GC recovers. Pairs with the conformance scenario runner. See [[5GC-Core]] Phase 4.

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

## rate-limiting-service — fixes (kept) + gateway enforcement (REVERTED) 2026-08-15
Three fixes to the standalone service (**kept**), plus a gateway enforcement experiment that was
**reverted the same day** — it made the whole gateway slow. The limiter stays **standalone/advisory**
(called explicitly via `/check`), *not* wired into the request path.

**Fixes (rate-limiting-service) — KEPT:**
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

**❌ Gateway enforcement — REVERTED (2026-08-15).** Briefly added a reactive `RateLimitGlobalFilter`
in the gateway (`com.example.springcloud.gateway.ratelimit`) + a `RateLimitClient` (load-balanced
WebClient) + an unauthenticated `InternalProtectionController` (`POST /internal/protection/check`) so
the gateway consulted the limiter on every request. **Problem:** it put a **synchronous per-request
hop** on the hot path; with `rate-limiting-service` **not running**, every request waited for a
connection failure before failing open → the gateway + all services became very slow (login felt
slow too, via the post-login data calls). First tried a mitigation (default OFF + 300 ms timeout),
then **removed it entirely** at the user's request. Deleted: the gateway `ratelimit` package, the
`protection.enforcement` block in `application.yml`, `InternalProtectionController`, and the
`/internal/**` permit in the limiter's `SecurityConfig`. Gateway is back to plain routing + JWT.
**Lesson:** don't add a synchronous call to a maybe-down service on the gateway hot path (see the
retired **ADR-11**). If revisited: make it opt-in/off-by-default, fast-timeout + fail-open, or better
run the token bucket *inside* the gateway against Redis (no extra hop).

**Still open:** persist `BlockEvent`s for the dashboard; Role B attach-flood detection tied to
[[Roaming-Analysis-Service]].

**Frontend:** a **Rate Limiting** page (security-analyst) drives `/stats` + policy CRUD (write UI
gated on `detection-rules:write`) + a decision tester — see [[Frontend-Components]]. Unaffected by the
revert (it calls the standalone service directly).

## Related notes
- [[Backend-and-Infra]] · [[Ports-and-URLs]] · [[Architecture-Decisions]] · [[Diagrams]] · [[Next-Steps]] · [[Session-Log]] · [[Roaming-Analysis-Service]]
