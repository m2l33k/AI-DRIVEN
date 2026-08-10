---
title: Architecture Decisions
tags: [adr, architecture, rationale]
updated: 2026-08-10
---

# Architecture Decisions

The **why** behind the design — the non-obvious choices, and their trade-offs. Read this before
proposing a change so you don't undo a deliberate decision. Newest first.

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
