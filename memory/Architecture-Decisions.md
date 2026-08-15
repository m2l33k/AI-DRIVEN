---
title: Architecture Decisions
tags: [adr, architecture, rationale]
updated: 2026-08-15
---

# Architecture Decisions

The **why** behind the design — the non-obvious choices, and their trade-offs. Read this before
proposing a change so you don't undo a deliberate decision. Newest first.

## ADR-14 · Real-time notifications = native WebSocket with token-query-param auth (no STOMP/SockJS)
**Decision:** live notifications use a **native WebSocket** endpoint (`/ws/notifications` in
messaging-service), not STOMP/SockJS. The handshake authenticates via a **`?token=<JWT>`** query
param (validated by the same `JwtDecoder` as REST), because browsers can't set an `Authorization`
header on a WebSocket. The gateway proxies it via a `lb:ws://messaging-service` route; `/ws/**` is
permitted at both the gateway and the service (the handshake self-authenticates).
**Why:** avoids adding STOMP/SockJS libs on both ends (no `@stomp/stompjs`, no npm churn); the browser
`WebSocket` API + a `TextWebSocketHandler` is enough for per-user push. Query-param token is the
standard workaround for the missing header.
**Trade-offs:** the JWT appears in the WS URL (acceptable for this platform; could move to a
short-lived ticket later); manual session bookkeeping (`Map<user, sessions>`) instead of STOMP's
user destinations; no built-in message ack/broker. **Dev:** the ng-serve proxy points `/ws` straight
at messaging-service :9007 for reliability; prod goes through the gateway. See [[Messaging-Service]].

## ADR-13 · Use free5GC as the 5G Core substrate; this repo is the harness (don't build NFs from scratch)
**Decision (2026-08-15):** adopt **free5GC** (open-source, Go) as the actual 5G Core (NRF/AMF/SMF/
UPF/AUSF/UDM/UDR/PCF/NSSF) driven by **UERANSIM** (gNB/UE sim). We do **not** hand-build the NFs.
This Java/Spring platform stays the **security + observability + test harness** *around* free5GC.
**Why:** the proposal itself (§2.2) says a vanilla core has diminishing value — the contribution is
the three added layers (zero-trust, anomaly detection, conformance). free5GC gives real
NGAP/NAS/PFCP/GTP-U + 5G-AKA + a Mongo subscriber store we can't build in Java, removes the biggest
risk (AMF/NGAP complexity), and matches the proposal's Go preference. **free5GC over open5GS**
because it has **NRF-as-OAuth2 + SBI TLS (TS 33.501 §13)** we can exercise for the zero-trust SBI
token work (SEC-02) — closer to Layer 01. See [[5GC-Core]].
**How the contributions land:** Layer 01 (zero-trust) = enable free5GC SBI TLS/OAuth2 **+** service
mesh / Cilium mTLS + NetworkPolicies between NF containers (integration/ops, not NF code). Layer 02
(anomaly) = our `AnomalyDetector` / anomaly-detection-service consume free5GC signalling metrics/logs.
Layer 03 (conformance) = a scenario runner + fault-injection-service drive UERANSIM call flows.
**⚠️ Constraint:** free5GC's UPF needs the **`gtp5g` Linux kernel module** — it does **not** run on
bare Windows/macOS Docker. Needs Ubuntu (VM) or WSL2 with a `gtp5g`-built kernel (the proposal §7
already targets "Ubuntu 22.04 LTS (VM/WSL2), kernel GTP module"). Standard path:
`free5gc/free5gc-compose`. **Trade-off:** the core runs as a separate Linux runtime alongside this
repo (consumes its APIs/metrics), not inside it; "build the core" is reframed as
**"integrate, harden, observe, and test a real core."**

## ADR-12 · API DTOs are separate records; JPA entities are never the wire contract
**Decision:** controllers accept/return **DTO records**, not JPA entities. Concretely, the
rate-limiting `PUT /policies` uses `RateLimitPolicyDto` (not the `RateLimitPolicy` entity), and the
roaming DTOs are all records.
**Why:** the entities use **record-style accessors** (`capacity()`, not `getCapacity()`) with no
setters, which Jackson can neither deserialize (→ 400 on write) nor serialize (→ empty `{}` on read).
A validated DTO is the wire contract; the entity stays a persistence detail. Discovered via a real
`PUT` 400 bug (2026-08-15). **Trade-off:** a small mapping layer (`Dto.from(entity)`), worth it for
validation + a stable contract.

## ADR-11 · ~~Gateway GlobalFilter calls the limiter to enforce rate limits~~ — RETIRED (reverted 2026-08-15)
**Status: RETIRED — reverted the same day it was added.** The idea: a reactive
`RateLimitGlobalFilter` in the gateway calls the limiter's internal `POST /internal/protection/check`
before forwarding and returns **429** on deny (keeping the Postgres policy table as the single source
of truth, vs Gateway's built-in `RedisRateLimiter`).
**Why reverted:** it added a **synchronous per-request hop to a service that may be down**. With
`rate-limiting-service` not running, every request waited for a connection failure before failing
open → the whole gateway + services became slow (login included, via post-login calls). All the
pieces were deleted (gateway `ratelimit` package, `InternalProtectionController`,
`protection.enforcement` config, `/internal/**` permit). The limiter stays **standalone/advisory**
(`POST /check`), driven by the frontend Rate Limiting page.
**Lesson / if revisited:** never put a blocking call to a maybe-down dependency on the gateway hot
path. Do it **opt-in (off by default) + short timeout + fail-open**, or better **run the token bucket
inside the gateway against Redis** (no extra service hop). See [[Platform-Services]].

## ADR-10 · Keycloak persisted to its own Postgres (not H2)
**Decision:** Keycloak runs `start-dev` but with `KC_DB=postgres` pointing at a dedicated
`keycloak-postgres` container (host 5437, DB `keycloak_db`, named volume `keycloak-postgres-data`).
Added `depends_on: keycloak-postgres (healthy)`.
**Why:** `start-dev` defaults to **embedded H2 inside the container** — so users and runtime realm
changes were lost on `infra.sh down` (the container has no data volume). Postgres + volume makes
that data survive restarts and `down` (only wiped by `down -v`), consistent with ADR-09.
**Config-as-code safety net:** `keycloak/export-realm.{ps1,sh}` exports the running realm (incl.
users) to `keycloak/platform-realm.json`, which is re-imported on a fresh DB (`--import-realm`) —
so realm structure survives even `down -v` / fresh clones. **Caveat:** the export hardcodes SMTP
values; restore the `${KC_SMTP_*}` placeholders before committing (don't commit secrets).
**Trade-off:** one more container; realm-config is code but runtime *users* still depend on the
Postgres volume unless also captured in the realm JSON.

## ADR-09 · Database-per-service (dedicated Postgres; Redis where needed)
**Decision:** each of the four [[Platform-Services|placeholder services]] owns a **dedicated
Postgres container** (`anomaly/ratelimit/tracing/fault-postgres`, host ports 5433–5436). Redis is
added **only** to anomaly (real-time windows) and rate-limiting (counters) — separate containers
(6380 / 6379). All live in `docker-compose-infra.yml`.
**Why:** follows the existing `roaming-mysql` precedent and the textbook microservices pattern —
no shared schema, independent scaling/ownership. Redis is need-based, not blanket.
**Trade-offs:** more containers (~256m each) — heavier on a dev laptop; could collapse to one
Postgres instance with 4 DBs if resources bite. **Cross-file `depends_on` is not used** (DBs are
in infra compose, services in base compose, brought up separately via `./infra.sh` then
`run.sh docker`) — so start infra first. Postgres is required at startup; Redis is lazy (Lettuce).
Not yet wired for Kubernetes.

## ADR-08 · Empty placeholder services carry no security/JPA
**Decision:** the four new [[Platform-Services|placeholder services]] (anomaly, rate-limiting,
tracing, fault-injection) ship with only web + eureka + actuator + springdoc; health paths are
public at the gateway.
**Why:** they have no protected data yet — a JWT gate on a liveness probe adds friction for zero
value. **Trade-off:** when real endpoints arrive, add `SecurityConfig` (copy the roaming service's)
and move the routes off the public whitelist.

> ⚠️ ADR-08 is now partially superseded by **ADR-09**: the services *do* carry JPA + a Postgres DB
> (and Redis for two of them). They still carry **no security** — health remains public.

## ADR-07 · Permission-based RBAC, enforced at the edge *and* in services
**Decision:** authorize on `PERM_*` authorities (Keycloak client roles on `platform-client`),
not on role names. Enforced at the gateway (`SecurityConfig`, WebFlux) and again inside services
(`@PreAuthorize`). Realm roles → `ROLE_*`, client perms → `PERM_*`.
**Why:** roles can be re-sliced in Keycloak without code changes; defence in depth. See
[[Roles-and-Permissions]].
**Gotcha:** a public path must be permitted at **both** the gateway and the service, or the
gateway 401s first. A stale Swagger bearer token also 401s permitAll paths — log out first.

## ADR-06 · auth-service is a thin layer over Keycloak
**Decision:** Keycloak stays the source of truth for passwords, sessions, tokens, required
actions. auth-service wraps the token endpoint (password grant) + Admin REST API.
**Why:** don't reimplement IAM. **Trade-off:** some flows depend on Keycloak quirks (see ADR-05).
Detail: [[Auth-Service]].

## ADR-05 · State-aware login instead of surfacing Keycloak errors
**Decision:** `/api/auth/login` returns a `status` (`SUCCESS` / `EMAIL_VERIFICATION_REQUIRED` /
`PASSWORD_CHANGE_REQUIRED`) rather than a raw grant error.
**Why:** Keycloak returns `invalid_grant` "Account is not fully set up" *after* accepting the
password, so valid creds are implied; we inspect the account via Admin API and drive the UI. See
[[Auth-Service]].

## ADR-04 · Our own email-verification flow (not Keycloak's UI)
**Decision:** issue our own 24h verify token + email the link; `GET /api/auth/verify-email` marks
`emailVerified=true` via Admin API and renders our page. Keycloak realm SMTP kept but unused.
**Why:** avoid Keycloak's themed pages; own the UX. **Trade-off:** we now own token lifecycle.

## ADR-03 · In-memory token/OTP stores (for now)
**Decision:** OTP, reset-token, first-login-token, email-verify-token stores are in-memory.
**Why:** simplest thing that works for a single instance. **Trade-off:** don't survive restarts
and break under multi-instance — **swap for Redis** before scaling. Tracked in [[Next-Steps]].

## ADR-02 · Roaming risk scoring is a heuristic, not ML
**Decision:** `RiskAnalyzer` is an additive, explainable 0–100 heuristic; analytics
(forecast/anomaly) are statistical.
**Why:** explainable placeholder that ships now; swap for real ML later. Detail:
[[Roaming-Analysis-Service]].

## ADR-01 · Tracing backend is Tempo; Jaeger is a placeholder
**Decision:** the OTLP trace sink is **Tempo** (`docker-compose-observability.yml`); gateway
exports via the OTel agent. The new `distributed-tracing-service` is a **Jaeger facade
placeholder** with no backend yet.
**Why:** Tempo is already wired to Grafana. **Open question:** add a real Jaeger container, or
keep Tempo and drop the placeholder? Decide before building tracing logic. See [[Platform-Services]].

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Auth-Service]] · [[Roaming-Analysis-Service]] · [[Platform-Services]]
