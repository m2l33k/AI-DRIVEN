---
title: Roaming Analysis Service
tags: [backend, microservice, roaming, security]
updated: 2026-08-07
---

# Roaming Analysis Service

Backend microservice that analyses 5G roaming events and scores partner-PLMN risk.
Feeds the frontend Security Analyst → Roaming Events page (see [[Frontend-Components]]).

- **Module:** `microservices/roaming-analysis-service`
- **Base package:** `io.javatab.microservices.roaming`
- **Port:** `9002` (eureka 8761, gateway 9000, auth 9001)
- **artifactId:** `roaming-analysis-service`, version `1.0.0-SNAPSHOT`, Java 17, Spring Boot 4.0.3
- **Status:** ✅ compiles (`mvnw -pl microservices/roaming-analysis-service compile`). In-memory data, no DB yet.

## Security
Resource server (JWT via Keycloak realm `auth-management`, client `platform-client`).
Same authority mapping as auth-service: realm roles → `ROLE_*`, client perms → `PERM_*`.
**Every endpoint requires `PERM_roaming-events:read`** → held by SECURITY_ANALYST and AUDITOR
(see [[Roles-and-Permissions]]). Public: `/actuator/**`, swagger/docs.

## API (`/api/roaming`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/events` | List events (newest first). Filters: `direction`, `partnerPlmn` (partial), `riskLevel` |
| GET | `/events/{id}` | Single event (404 if missing) |
| GET | `/summary` | Dashboard aggregates: totals, direction split, risk breakdown, hourly volume series |
| GET | `/partners` | Per-partner-PLMN roll-up, ordered by avg risk |

Reachable via gateway at the same paths; Swagger aggregated under
`/roaming-analysis-service/v3/api-docs`.

## Design / layers
```
domain/     RoamingEvent (record) · Direction · RiskLevel (fromScore: <30 LOW, <60 MED, else HIGH)
repository/ RoamingEventRepository — in-memory, seeded (~12 events), CopyOnWriteArrayList
analysis/   RiskAnalyzer — additive heuristic → 0-100 score (see below)
service/    RoamingAnalysisService — filter, enrich (score+level), summarize, partner roll-ups
web/        RoamingController (@PreAuthorize) · ApiExceptionHandler · dto/*
config/     SecurityConfig · OpenApiConfig
```

### Risk scoring (RiskAnalyzer)
Baseline 5, plus: impossible travel +40; signalling errors ×3 (cap 21); new-device ratio
×25; known-bad PLMN +20 (`310-260`, `404-45`, `621-30`); tiny subscriber count (<20) +8.
Clamped to [0,100]. Deliberately simple/explainable — placeholder for a real rules/ML engine.

## Wiring done
- Registered as a module in root `pom.xml`.
- Gateway routes added (default + `docker` profiles): `/api/roaming/**` → `lb://roaming-analysis-service`,
  plus docs route + Swagger aggregation entry.
- `Dockerfile` (layered, port 9002) + `kubernetes/deployment.yml` & `service.yml`.

## TODO / next
- Replace in-memory repo with JPA + Postgres (or a streaming source).
- Wire the frontend Roaming Events page to `/api/roaming/*`.
- Tests were intentionally omitted (project currently has no tests).

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Frontend-Components]] · [[Next-Steps]]
