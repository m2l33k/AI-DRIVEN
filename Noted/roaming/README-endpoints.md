# Roaming Analysis Service — Endpoint Guide

Practical reference for **every** endpoint in `roaming-analysis-service`: what it does, how to
call it, a realistic usage scenario, and whether it is backed by **real dataset data** or
**mock/synthetic data** (see the data-source note at the bottom).

- **Service:** `microservices/roaming-analysis-service`
- **Port:** `9002` (direct) — also reachable via the API gateway on `9000` at the same paths
- **Base path:** `/api/roaming`
- **Auth:** every endpoint requires a valid Keycloak JWT **and** the authority
  `PERM_roaming-events:read` (held by roles **SECURITY_ANALYST** and **AUDITOR**)
- **Docs:** Swagger UI at `http://localhost:9002/swagger-ui.html`; OpenAPI at
  `/v3/api-docs` (aggregated at the gateway under `/roaming-analysis-service/v3/api-docs`)

## How to authenticate (all examples)

Get a token from Keycloak (realm `auth-management`, client `platform-client`) and send it as a
bearer token:

```bash
TOKEN="<paste-access-token>"
BASE="http://localhost:9002/api/roaming"      # or http://localhost:9000/api/roaming via gateway
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/summary" | jq
```

A missing/invalid token → **401**; a valid token without `roaming-events:read` → **403**.

---

## Data-source legend

| Badge | Meaning |
|-------|---------|
| 🟢 **REAL** | Computed from the ingested `Data/Data/*.csv` dataset (~39k rows across 6 tables) |
| 🔴 **MOCK** | (legacy) Was computed from 12 hand-written synthetic rows — **now migrated to real data** |
| 🟡 **SYNTHETIC BY DESIGN** | Random / user-supplied input — not meant to reflect the dataset |

> **Status (updated):** the classic analytics endpoints (`/events`, `/summary`, `/partners`,
> `/live`, `/anomalies`, `/forecast`, `/experience`, `/qos`, `/optimization`, `/revenue`) now run
> on the **real** dataset via `RoamingEventProjection`, which aggregates `roaming_cdrs` +
> `session_qos` + `attach_events` + `network_cells` into **partner × hour** aggregates. The
> synthetic 12-row seeder (`RoamingDataSeeder`) is **disabled**. Only `/upload`, `/simulate` and
> `/test-calls/run` remain synthetic by design.

---

# 1. Roaming Analytics

## 1.1 `GET /events` 🔴 MOCK
List roaming events, newest first.

- **Query params:** `direction` (`INBOUND`|`OUTBOUND`), `partnerPlmn` (partial match),
  `riskLevel` (`LOW`|`MEDIUM`|`HIGH`) — all optional.
- **Scenario:** A security analyst opens the *Roaming → Events* page and filters to
  `riskLevel=HIGH` inbound traffic to triage suspicious partners first.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/events?direction=INBOUND&riskLevel=HIGH" | jq
```

## 1.2 `GET /events/{id}` 🔴 MOCK
Return a single event by id. **404** if it does not exist.

- **Scenario:** From the events table the analyst clicks a row (`RE-1002`) to inspect the raw
  signals (signalling errors, impossible-travel flag, new-device ratio) behind its risk score.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/events/RE-1002" | jq
```

## 1.3 `GET /summary` 🔴 MOCK
Dashboard aggregates: totals, inbound/outbound split, risk breakdown, hourly volume series.

- **Scenario:** The Roaming dashboard landing page loads its top KPI cards and the
  subscribers-per-hour chart in one call.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/summary" | jq
```

## 1.4 `GET /partners` 🔴 MOCK
Per-partner-PLMN roll-up ordered by **average risk** (highest first).

- **Scenario:** The analyst wants a ranked list of which partner networks carry the most risk to
  decide where to focus fraud monitoring.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/partners" | jq
```

## 1.5 `GET /live` 🔴 MOCK
Real-time monitor snapshot over a recent window: active events, subscribers, rate/min, avg risk,
high-risk count, revenue, plus the most recent events.

- **Query params:** `windowMinutes` (default `60`).
- **Scenario:** A NOC wall-board polls this every 30s to watch live roaming volume and catch a
  sudden spike in high-risk events.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/live?windowMinutes=30" | jq
```

## 1.6 `GET /anomalies` 🔴 MOCK (algorithm real, data synthetic)
Events flagged by the statistical + rule detector: composite `anomalyScore` (0–100), baseline
deviation (max |z|), severity and human-readable reasons.

- **Scenario:** The analyst reviews the anomaly feed to see *why* an event was flagged
  ("Latency 3.1σ above baseline", "impossible travel") before escalating.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/anomalies" | jq
```

## 1.7 `GET /forecast` 🔴 MOCK
Linear-trend forecast of subscribers/hour for the next N hours, with the history it fit on.

- **Query params:** `hoursAhead` (default `6`).
- **Scenario:** Capacity planning — predict the next 12 hours of roaming subscriber load to
  pre-warm resources.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/forecast?hoursAhead=12" | jq
```

## 1.8 `GET /experience` 🔴 MOCK
Per-partner customer-experience (QoS) score, **worst first**, with rating (Excellent/Good/Fair/Poor).

- **Scenario:** The analyst identifies which roaming partners give our subscribers the worst
  experience abroad to raise a QoS complaint.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/experience" | jq
```

## 1.9 `GET /qos` 🔴 MOCK
Platform-wide QoS overview: avg latency, throughput, drop rate, composite score, and the 3 weakest
partners.

- **Scenario:** Weekly QoS review — a single summary of overall roaming quality plus the biggest
  offenders.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/qos" | jq
```

## 1.10 `GET /optimization` 🔴 MOCK
Per-partner revenue / cost / margin / risk / experience with an **agreement recommendation**
(`RENEGOTIATE`, `MONITOR`, `IMPROVE_QOS`, `PREFERRED`, `STEADY`).

- **Scenario:** A roaming-commercial manager reviews which agreements to renegotiate (loss-making)
  vs. promote (high-margin, low-risk).

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/optimization" | jq
```

## 1.11 `GET /revenue` 🔴 MOCK
Roaming revenue, cost, margin, margin %, ARPU (per subscriber), inbound vs outbound split, and top
5 partners by revenue.

- **Scenario:** Monthly finance report on roaming profitability and the top revenue partners.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/revenue" | jq
```

## 1.12 `POST /upload` 🟡 SYNTHETIC BY DESIGN (analyses your file)
Upload a roaming-events CSV (multipart `file`) → returns an aggregated summary, detected anomalies
and a forecast over the uploaded rows. **Nothing is persisted.**

- **Query params:** `hoursAhead` (default `6`).
- **Body:** multipart form field `file` = a CSV. A minimal file (`direction, partner_plmn, country,
  subscribers, signaling_errors, new_device_ratio, impossible_travel`) is enough — missing
  QoS/commercial columns are derived. Headers may be snake_case or camelCase.
- **Scenario:** An analyst exports a batch of events from another system and drops the CSV in to
  get an instant risk/anomaly read without importing it into the platform.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  -F "file=@events.csv" \
  "$BASE/upload?hoursAhead=6" | jq
```

## 1.13 `POST /simulate` 🟡 SYNTHETIC BY DESIGN
Generate synthetic roaming events over a recent window (**persisted** with `SIM-` ids, ~18%
injected anomalies) and return a live-monitor snapshot so the real-time monitor and anomaly feed
can be seen reacting.

- **Query params:** `count` (default `20`, max 500), `minutesSpread` (default `60`),
  `windowMinutes` (default `60`).
- **Scenario:** Demo / testing — inject a burst of traffic (including fraud patterns) to show the
  `/live` and `/anomalies` views light up in real time.

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE/simulate?count=50&minutesSpread=30&windowMinutes=60" | jq
```

> ⚠️ This writes `SIM-` prefixed rows to the database. Use only in demo/test environments.

---

# 2. Performance Assurance Engine (§5.2)

Backed by the **real** ingested dataset (`roaming_cdrs`, `attach_events`, `session_qos`) and
`roaming_agreements`. Because the dataset is historical, "now" = the most recent event timestamp
in the loaded data.

## 2.1 `GET /kpis` 🟢 REAL
KPI set for the latest completed aggregation window: registration success %, ASR, NER, ACD, session
setup success %, latency P50/P95/P99, drop rate %, throughput Mbps (+ attach/voice/session counts).

- **Query params:** `partner` (visited-operator id, optional → all partners),
  `window` (`FIVE_MIN`|`HOUR`|`DAY`|`MONTH`, default `DAY`).
- **Scenario:** An analyst checks yesterday's roaming KPIs for a specific partner operator against
  what the SLA promised.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/kpis?partner=OPRGBEE&window=DAY" | jq
```

## 2.2 `GET /kpis/timeseries` 🟢 REAL
The KPI set across the last N consecutive windows (oldest → newest), for trend charts and reporting.

- **Query params:** `partner` (optional), `window` (default `DAY`), `count` (default `12`, max 240).
- **Scenario:** Build a "Latency P95 over the last 12 days" trend line for a partner performance
  report.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/kpis/timeseries?partner=OPRGBEE&window=DAY&count=12" | jq
```

## 2.3 `GET /agreements` 🟢 REAL partners / 🟡 mock thresholds
Per-partner roaming agreements: SLA thresholds, rolling performance score and steering tier.

- **Note:** partner ids come from the real dataset, but the SLA thresholds and partner *names*
  (`"Partner <id>"`, `"IR21-<id>"`) are seeded defaults/placeholders.
- **Scenario:** Review the SLA thresholds and current steering tier (PREFERRED/STANDARD/PROBATION/
  RESTRICTED) agreed with each partner.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/agreements" | jq
```

## 2.4 `GET /sla` 🟢 REAL
Evaluate each agreement's latest window against its SLA thresholds: breached KPIs,
consecutive-breach count, alarm flag, rolling score and tier — **worst first**. Read-only (never
mutates state).

- **Query params:** `window` (default `DAY`).
- **Scenario:** The assurance dashboard shows which partners are breaching SLA and which have
  tripped the consecutive-window alarm, ordered by who is worst.

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/sla?window=DAY" | jq
```

## 2.5 `POST /test-calls/run` 🟡 SYNTHETIC BY DESIGN
Execute IREG-style synthetic test transactions (REGISTRATION, MO_CALL, MT_CALL, SMS, DATA_SESSION)
against each active agreement. Results are flagged `Synthetic_Test`, pass/fail is randomised
(biased by the agreement's current health) and are **excluded from live KPI denominators**.

- **Scenario:** Proactive assurance — fire synthetic probes at every partner to detect a broken
  roaming setup before real subscribers hit it.

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$BASE/test-calls/run" | jq
```

---

# 3. Infrastructure endpoints (public — no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/actuator/health` | Liveness/health (details shown) |
| GET | `/actuator/info` | Build/info |
| GET | `/actuator/metrics` | Micrometer metrics |
| GET | `/actuator/prometheus` | Prometheus scrape endpoint |
| GET | `/v3/api-docs` | OpenAPI JSON |
| GET | `/swagger-ui.html` | Swagger UI |

```bash
curl -s http://localhost:9002/actuator/health | jq
```

---

# 4. Quick reference table

| # | Method | Path | Data |
|---|--------|------|------|
| 1 | GET | `/api/roaming/events` | 🟢 real |
| 2 | GET | `/api/roaming/events/{id}` | 🟢 real |
| 3 | GET | `/api/roaming/summary` | 🟢 real |
| 4 | GET | `/api/roaming/partners` | 🟢 real |
| 5 | GET | `/api/roaming/live` | 🟢 real |
| 6 | GET | `/api/roaming/anomalies` | 🟢 real |
| 7 | GET | `/api/roaming/forecast` | 🟢 real |
| 8 | GET | `/api/roaming/experience` | 🟢 real |
| 9 | GET | `/api/roaming/qos` | 🟢 real |
| 10 | GET | `/api/roaming/optimization` | 🟢 real |
| 11 | GET | `/api/roaming/revenue` | 🟢 real |
| 12 | POST | `/api/roaming/upload` | 🟡 user CSV |
| 13 | POST | `/api/roaming/simulate` | 🟡 synthetic |
| 14 | GET | `/api/roaming/kpis` | 🟢 real |
| 15 | GET | `/api/roaming/kpis/timeseries` | 🟢 real |
| 16 | GET | `/api/roaming/agreements` | 🟢 real (mock thresholds) |
| 17 | GET | `/api/roaming/sla` | 🟢 real |
| 18 | POST | `/api/roaming/test-calls/run` | 🟡 synthetic |

## Related docs
- [`4.1-architecture-overview.md`](4.1-architecture-overview.md)
- [`5.2-performance-assurance-engine.md`](5.2-performance-assurance-engine.md)
- `roaming-architecture.puml`
