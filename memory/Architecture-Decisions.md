---
title: Architecture Decisions
tags: [adr, architecture, rationale]
updated: 2026-08-10
---

# Architecture Decisions

The **why** behind the design — the non-obvious choices, and their trade-offs. Read this before
proposing a change so you don't undo a deliberate decision. Newest first.

## ADR-08 · Empty placeholder services carry no security/JPA
**Decision:** the four new [[Platform-Services|placeholder services]] (anomaly, rate-limiting,
tracing, fault-injection) ship with only web + eureka + actuator + springdoc; health paths are
public at the gateway.
**Why:** they have no protected data yet — a JWT gate on a liveness probe adds friction for zero
value. **Trade-off:** when real endpoints arrive, add `SecurityConfig` (copy the roaming service's)
and move the routes off the public whitelist.

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
