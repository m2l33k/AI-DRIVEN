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
- **Status:** ✅ compiles. **Persisted in MySQL** (JPA/Hibernate `ddl-auto=update`), seeded on first
  start. Now has real-time monitoring, anomaly detection, forecasting, QoS/experience, and
  commercial (agreement/cost/revenue) analytics.

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
| GET | `/live?windowMinutes=` | ✅ Real-time monitor: active events/subs/rate/risk/revenue + recent |
| GET | `/anomalies` | ✅ Anomaly detection: flagged events + reasons + severity |
| GET | `/forecast?hoursAhead=` | ✅ Predict traffic: linear-regression forecast of subs/hour |
| GET | `/experience` | ✅ Customer experience: per-partner QoS experience score (worst first) |
| GET | `/qos` | ✅ QoS overview: avg latency/throughput/drop + score + worst partners |
| GET | `/optimization` | ✅ Optimize agreements + cut costs: per-partner margin + recommendation |
| GET | `/revenue` | ✅ Increase revenue: revenue/cost/margin/ARPU + top partners |

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

## Persistence (MySQL)
- `RoamingEvent` is now a JPA `@Entity` (table `roaming_events`) with record-style accessors; extra
  columns: `data_volume_gb`, `avg_latency_ms`, `throughput_mbps`, `dropped_session_ratio`,
  `revenue_eur`, `cost_eur`. `RoamingEventRepository extends JpaRepository`. `RoamingDataSeeder`
  (`CommandLineRunner`) seeds ~12 events (QoS/commercial derived from signals) when the table is empty.
- Config `spring.datasource` → **MySQL**; local `jdbc:mysql://localhost:3307/roaming_db` (user/pass
  `roaming`/`roaming`), docker profile → `roaming-mysql:3306`. `ddl-auto=update`.
- **Docker:** `roaming-mysql` (mysql:8.4) added to `docker-compose-infra.yml`, host port **3307**,
  named volume `roaming-mysql-data`. Deps added: `spring-boot-starter-data-jpa` + `mysql-connector-j`.
- New analytics live in `service/RoamingInsightsService` (+ `web/dto/*Dto`); heuristic/statistical,
  explainable — placeholder for real ML.

## TODO / next
- Wire the frontend Roaming Events page + Security dashboard to `/api/roaming/*` (esp. `/live`,
  `/anomalies`, `/forecast`, `/optimization`).
- Swap heuristics for real ML models (forecast, anomaly detection) when ready.
- Tests were intentionally omitted (project currently has no tests).

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Frontend-Components]] · [[Next-Steps]]
