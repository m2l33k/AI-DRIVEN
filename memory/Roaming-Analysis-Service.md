---
title: Roaming Analysis Service
tags: [backend, microservice, roaming, security]
updated: 2026-08-15
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
| GET | `/anomalies` | ✅ Anomaly detection: statistical + rule composite score (see AnomalyDetector) |
| GET | `/forecast?hoursAhead=` | ✅ Predict traffic: linear-regression forecast of subs/hour |
| GET | `/experience` | ✅ Customer experience: per-partner QoS experience score (worst first) |
| GET | `/qos` | ✅ QoS overview: avg latency/throughput/drop + score + worst partners |
| GET | `/optimization` | ✅ Optimize agreements + cut costs: per-partner margin + recommendation |
| GET | `/revenue` | ✅ Increase revenue: revenue/cost/margin/ARPU + top partners |
| POST | `/upload` | ✅ Analyse an uploaded CSV (multipart `file`, `?hoursAhead=`) → summary + anomalies + forecast; **not persisted** |
| POST | `/simulate` | ✅ Generate synthetic events (`?count=&minutesSpread=&windowMinutes=`) → persisted (`SIM-` ids) + live snapshot |

Reachable via gateway at the same paths; Swagger aggregated under
`/roaming-analysis-service/v3/api-docs`. **All 13 endpoints are wired into the frontend** — the
Security-Analyst **Roaming** sidebar group (Overview/Events/Anomalies/Partners/QoS/Revenue/Tools),
see [[Frontend-Components]].

## 2026-08-15 — CSV analysis, simulation & stronger anomaly detection
New code on the existing (still synthetic `RoamingEvent`) analytics — all additive, build green:
- **`analysis/AnomalyDetector`** (`@Component`) — the powered-up `/anomalies`. Composite
  **`anomalyScore` 0-100** = ½ `RiskAnalyzer` score + capped **population z-score deviations**
  (per-metric mean/σ over the same list: latency, drop ratio, signalling errors, new-device ratio,
  low throughput, unusual subscriber volume) + `+25` for impossible travel. Emits per-metric σ
  reasons ("Latency 3.1σ above baseline …") alongside the fixed thresholds; severity by composite
  (CRITICAL/WARNING/INFO). `AnomalyDto` gained `anomalyScore` + `baselineDeviation` (max |z|).
  Reusable over **any** `List<RoamingEvent>` (DB / uploaded CSV / simulated batch).
- **`ingest/RoamingEventCsvParser`** — parses an uploaded multipart CSV into in-memory events
  (never persisted). Lenient: snake_case **or** camelCase headers via alias lookup, blank→default;
  **derives** missing QoS/commercial columns from the raw signals (same formulas as the seeder), so
  a minimal file works. Returns `CsvParseResult(fileName, events, parsed, skipped, columns)`.
- **`service/RoamingSimulator`** (`@Component`) — generates realistic events over the last
  `minutesSpread` minutes (≈18% injected anomalies: high-risk PLMNs, impossible travel, signalling
  storms), **persisted** with `SIM-` id prefix so `/live` + `/anomalies` react. Capped at 500/run.
- **Orchestration in `RoamingInsightsService`:** `analyzeCsv(file, hoursAhead)` → `CsvAnalysisDto`
  (fileName, rowsParsed/Skipped, columns, summary, anomalies, forecast); `simulate(count, spread,
  window)` → `SimulationResultDto` (generated, monitor `LiveMonitorDto`, sample). Anomalies now
  delegate to `AnomalyDetector`.
- **Refactors:** `RoamingAnalysisService.summary(List)` and `RoamingInsightsService.forecast(int,
  List)` overloads (no-arg versions call them with `repository.findAll()`), so summary/forecast run
  over an arbitrary event set (DB or CSV). `application.yml` → `spring.servlet.multipart` 25 MB.
- New DTOs: `CsvAnalysisDto`, `SimulationResultDto` (+ `AnomalyDto` extended).

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

## 🔧 REDESIGN — build on the real `Data/Data/` dataset (planned)

**Motivation.** The current model is synthetic: one flat aggregate `RoamingEvent` with hand-derived
QoS/commercial numbers and 12 seeded rows. `Data/Data/` gives us a **real, relational roaming
dataset (~39k rows)** that we should model faithfully and drive all analytics from. This also feeds
the internship proposal deliverables (anomaly detection D4, conformance/data-driven KPIs) — see
[[Proposal-Internship]].

### Source data (`Data/Data/*.csv`)
| File | Rows | Grain | Key columns |
|------|------|-------|-------------|
| `devices.csv` | 328 | device catalog | `device_id`, `imei_tac`, manufacturer, model, os, `lte_category`, `volte_supported`, `five_g_supported` |
| `network_cells.csv` | 253 | cell topology | `cell_id`, `country_code`, `city`, `operator_id`, `tracking_area_code`, `latitude`, `longitude`, `cell_type` |
| `roaming-cdr-...csv` | 10 000 | **CDR / TAP-RAP fact** | `cdr_id`, `tap_file_id`, `tap_file_type` (TAP/NRTRDE), `home_operator_id`, `visited_operator_id`, `subscriber_imsi`, `msisdn`, `device_id`, `serving_cell_id`, `call_type` (voice/sms/data), start/end, `duration_seconds`, `data_volume_mb`, `charged_amount`, `wholesale_cost`, `currency`, `iot_tariff_id`, **`fraud_flag`**, **`fraud_detection_reason`**, `settlement_status`, `settlement_date`, `nrtrde_flag` |
| `attach_events.csv` | 13 455 | attach/registration | `attach_id`, `subscriber_imsi`, operators, `cell_id`, datetime, `attach_status`, `reject_cause`, **`auth_failure_flag`**, `registration_delay_ms` |
| `session_qos.csv` | 5 035 | per-session QoS | `session_id`, `cdr_id`, imsi, operators, cell, start/end, `download_mb`, `upload_mb`, `avg_throughput_mbps`, `latency_ms`, `packet_loss_pct`, `session_status`, `drop_reason` |
| `handover_events.csv` | 10 591 | mobility | `handover_id`, imsi, `visited_operator_id`, `source_cell_id`, `target_cell_id`, datetime, `event_type`, `handover_status`, `failure_cause` |

Join keys: CDR↔QoS on `cdr_id`; everything↔`subscriber_imsi`; cell refs↔`network_cells.cell_id`;
device↔`devices.device_id`. **Partner = operator** (`OPRDEO2D`, `OPRGBEE`…), *not* MCC-MNC PLMN —
direction is derived from a configured **home operator set** (`home_operator_id ∈ HOME ⇒ OUTBOUND`,
`visited_operator_id ∈ HOME ⇒ INBOUND`).

### New domain model (replace the single aggregate entity)
`domain/` gets six JPA entities mirroring the CSVs: `Device`, `NetworkCell`, `RoamingCdr`,
`AttachEvent`, `SessionQos`, `HandoverEvent` (+ enums `CallType`, `TapFileType`, `AttachStatus`,
`SessionStatus`, `HandoverStatus`, `SettlementStatus`). Keep `Direction`/`RiskLevel`. The old flat
`RoamingEvent` becomes a **derived view** (a `PartnerWindow` projection), not the table of record.

### Ingestion
Add a `ingest/CsvDataLoader` (`CommandLineRunner`, guarded by empty-table check, like the current
seeder) using **OpenCSV** (or Spring Batch for the 10k+ files). Load order: devices, cells → CDRs →
attach, qos, handovers. Source path configurable (`roaming.data-dir`, default the repo `Data/Data`);
package a trimmed copy under `src/main/resources/seed/` for docker. Idempotent per table.

### Analytics — recompute every endpoint from real fields
- **Fraud / anomaly** (`/anomalies`, new `/fraud`): drive from real `fraud_flag` +
  `fraud_detection_reason`; `auth_failure_flag` bursts per IMSI/cell (IMSI-catcher / rogue-UE);
  `reject_cause` clustering; `nrtrde_flag` near-real-time exposure; **impossible travel** computed
  from consecutive attaches on cells whose lat/lon distance ÷ Δt exceeds a speed threshold.
- **QoS / experience** (`/qos`, `/experience`): aggregate `session_qos` (throughput, `latency_ms`,
  `packet_loss_pct`, `drop_reason`) per visited operator; worst-first.
- **Mobility** (new `/handovers`): handover failure ratio per cell/operator + top `failure_cause`.
- **Registration health** (new `/attach` or fold into `/live`): attach success ratio +
  `registration_delay_ms` p50/p95 per partner.
- **Revenue / settlement** (`/revenue`, `/optimization`, new `/settlement`): margin =
  `charged_amount − wholesale_cost` per partner/`call_type`; unsettled exposure by
  `settlement_status`; multi-currency aware.
- **Live / forecast** (`/live`, `/forecast`): time-bucket CDRs/attaches over their real timestamps.

### Wiring / infra changes
- Same MySQL (`roaming-mysql` :3307); `ddl-auto=update` creates the six tables.
- Add `opencsv` (+ optional `spring-boot-starter-batch`) to `pom.xml`.
- Keep JWT `PERM_roaming-events:read` on every endpoint; add read scopes for the new paths.
- Frontend Roaming Events page then binds to the real `/api/roaming/*`.

### Action checklist (what to do)
- [ ] Add the six JPA entities + enums; delete/retire the synthetic `RoamingEvent` seeder.
- [ ] Add `opencsv` dep + `ingest/CsvDataLoader`; make `roaming.data-dir` configurable; bundle a docker seed copy.
- [ ] Add repositories (`JpaRepository` + custom aggregate queries / JPQL projections) per entity.
- [ ] Rewrite `RiskAnalyzer` to score from real signals (fraud_flag, auth-failure rate, impossible travel, QoS drop, reject_cause).
- [ ] Re-point every controller endpoint to real aggregates; add `/fraud`, `/handovers`, `/settlement`, `/attach`.
- [ ] Update gateway routes only if new sub-paths need explicit rules (wildcard already covers `/api/roaming/**`).
- [ ] Update this note + [[Session-Log]] + [[Next-Steps]] when landed; wire the frontend page.

## TODO / next
- [x] Wire the frontend to `/api/roaming/*` — done 2026-08-15 (Roaming sidebar group, 7 sub-pages,
  all 13 endpoints incl. `/upload` + `/simulate`). See [[Frontend-Components]].
- Swap heuristics for real ML models (forecast, anomaly detection) when ready — `AnomalyDetector`
  is the clean seam (population z-scores today → model scores later).
- REDESIGN Phase 2/3 still open: re-point endpoints onto the 6 real `Data/Data` entities and delete
  the synthetic `RoamingEvent`/seeder (see the Redesign section + [[Next-Steps]]).
- Tests were intentionally omitted (project currently has no tests).

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Frontend-Components]] · [[Next-Steps]]
