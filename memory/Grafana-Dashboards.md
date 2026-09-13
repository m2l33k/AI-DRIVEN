---
title: Grafana Dashboards (design)
tags: [observability, grafana, prometheus, loki, tempo, 5g, security, design]
updated: 2026-09-10
---

# Grafana Dashboards — detailed design

Design for the **observability + security dashboards** (proposal **D6**) covering both the Java
**harness** (already Prometheus-scraped) and the **[[5GC-Core|free5GC]]** core once it's up. Grafana
:3000 (admin/admin), datasources provisioned, JSON dashboards live in `grafana-dashboard/`. Sources:
**Prometheus** :9090 (metrics), **Loki** :3100 (logs), **Tempo** (traces). See [[Backend-and-Infra]].

## What already exists on disk (updated 2026-09-10)

- ✅ **`grafana-dashboard/free5gc-5g-core.json`** — **custom, built 2026-09-10.** UID `free5gc-5g-core`, title "free5GC — 5G Core Network Functions". 20 panels / 5 rows:
  - **Row 1 — NF Health:** 8 individual stat panels (NRF/AMF/SMF/AUSF/UDM/UDR/PCF/NSSF), each using `up{job="free5gc-<nf>"}`, green=UP / red=DOWN, background colour mode.
  - **Row 2 — SBI Traffic:** SBI inbound request rate per NF (`sum by (job) (rate(free5gc_sbi_inbound_request_total[2m]))`), + request rate broken down by `nf_type/path/method`.
  - **Row 3 — Latency:** P95 + P50 histogram quantile per NF (`histogram_quantile(0.95/0.50, ...free5gc_sbi_inbound_request_duration_seconds_bucket...)`).
  - **Row 4 — Errors:** 4xx/5xx error rate timeseries + donut of request counts by status code.
  - **Row 5 — NF Logs:** Loki log stream panel, query `{job=~"free5gc.*"}`.
  - Template variable `$nf_type`: multi-select from `label_values(up{free5gc="true"}, job)`.
  - Datasources: `prometheus` (UID) + `loki` (UID). No Grafana restart needed — auto-provisioned.

## What already exists on disk (2026-08-15)
- ✅ **`grafana-dashboard/Business Services.json`** — **custom, built 2026-08-15.** Cross-service board
  for **all** business services (uid `business-services`, title "Business Services — 5GC Platform").
  33 panels / 8 rows: Fleet Overview (up, req/s, error%, avg latency, exceptions, error-logs) ·
  per-service **health table** (up/uptime/req-s/error%/avg-ms/CPU%/heap%) · Traffic (rate & 5xx by
  service, status-class donut, top endpoints) · Latency (avg & max by service, slowest endpoints) ·
  JVM (heap, CPU, threads, GC) · Errors & Logs (error/warn `logback_events_total`, exceptions by type)
  · Data layer (HikariCP active/pending/idle) · Business endpoints (auth/users + roaming/protection/…
  by `uri`). Driven by a `$service` template var (`label_values(up, job)`, multi+All). Auto-provisioned
  via the `../grafana-dashboard:/var/lib/grafana/dashboards` mount → Grafana "Spring Boot" folder.
- ✅ **`grafana-dashboard/Redis and Storage.json`** — **custom, built 2026-08-15.** uid
  `redis-and-storage`, 28 panels / 4 rows: **Redis** (both instances via redis_exporter — up, memory,
  clients, ops/s, hit ratio, keys/db, evicted/expired, net I/O) · **PostgreSQL** (keycloak + ratelimit
  via postgres_exporter — backends, commits/rollbacks, tuple throughput, cache hit, DB size) · **MySQL**
  (roaming via mysqld_exporter — threads, queries/slow, net bytes, InnoDB buffer) · **HikariCP** app
  pools (active/idle/pending + acquire/usage time — no exporter needed).
- **Exporters added** (`docker-compose-observability.yml`, brought up by `infra.sh`): `redis-exporter`
  (`oliver006/redis_exporter`, **multi-target** for both Redis), `postgres-exporter-keycloak` +
  `postgres-exporter-ratelimit` (`prometheuscommunity/postgres-exporter:v0.15.0`, per-server
  `DATA_SOURCE_NAME`), `mysqld-exporter-roaming` (`prom/mysqld-exporter:v0.14.0`). Prometheus jobs
  `redis` (multi-target relabel), `postgres-keycloak`, `postgres-ratelimit`, `mysql-roaming` added.
  ⚠️ Best-effort / untested against a live stack — image tags pinned to known-good; the anomaly/
  tracing/fault Postgres + legacy postgres/mongo can be added with the **same pattern**.
- `grafana-dashboard/` also has **community Spring Boot** dashboards (`Spring Boot 3.x Statistics.json`,
  `Spring Boot Observability.json`) + `docker/dashboard-1.yml` (misnamed `.yml`).
- **Prometheus now scrapes all app services** — `docker/prometheus/prometheus.yml` gained anomaly
  (9003), rate-limiting (9004), tracing (9005), fault (9006) alongside gateway/eureka/auth/roaming.
- The **5GC/security boards below (D2–D5, D8) are still planned** — export each to `grafana-dashboard/`.
  D1 Platform + D6 Rate-Limit + D7 Roaming are largely covered by the Business Services board.

## Data-source reality check (read first)
| Layer | What emits metrics | How Grafana gets it |
|-------|--------------------|---------------------|
| Java harness (gateway, auth, roaming, rate-limit, anomaly…) | `/actuator/prometheus` (micrometer) | Prometheus scrapes host via `host.docker.internal` (`docker/prometheus/prometheus.yml`) — **already wired** for gateway/eureka/auth/roaming; **add** rate-limiting/anomaly targets |
| free5GC NFs | **limited native Prometheus** (some NFs expose metrics; not comprehensive) | (a) NF metrics endpoints where available; (b) **cAdvisor + node-exporter** for container CPU/mem/net; (c) **NRF `nnrf-nfm/v1/nf-instances`** for NF up/down; (d) **Loki log-derived** counters (promtail/fluent-bit parse free5GC logs → LogQL) |
| UERANSIM (gNB/UE sim) | logs / exit codes | drives load; assert via the scenario runner (Layer 03), not a live metric |
| Certs / PKI | cert-manager / Vault exporters | Prometheus scrape (when PKI lands) |

> ⚠️ Don't assume free5GC gives you rich Prometheus metrics out of the box. Budget for a **small
> exporter and/or Loki LogQL** to derive registration/auth/PDU counters from NF logs. This is the
> main observability effort of the 5GC integration.

## The dashboards

### D1 · Platform Overview (harness) — **exists, extend**
- **Purpose:** health of the Java control-plane harness (the app services around the core).
- **Panels:** total requests, req/s, %2xx/%5xx, exceptions (from `GET /api/metrics/overview`);
  per-service **JVM** (heap, threads, CPU, uptime), top endpoints by req + slowest endpoints.
- **PromQL:** `sum(rate(http_server_requests_seconds_count[1m]))`,
  `sum(http_server_requests_seconds_count{status=~"5.."})/sum(http_server_requests_seconds_count)`,
  `sum(jvm_memory_used_bytes{area="heap"}) by (application)`, `avg(process_cpu_usage) by (application)`.
- **Note:** the admin **System Health** + **API Metrics** pages already render most of this from the
  gateway `MetricsController`. This Grafana board is the ops-side twin.

### D2 · 5GC NF Health & Topology — **new**
- **Purpose:** which NFs are registered and alive; per-NF resource use; SBA topology.
- **Panels:** NF **up/down** table (NRF `nf-instances` → nfType/nfStatus; or `up{job="free5gc-*"}`);
  per-NF **CPU/MEM/net** (cAdvisor: `container_cpu_usage_seconds_total`,
  `container_memory_working_set_bytes` by container); **AMF connected gNBs / registered UEs**;
  **NRF registrations** over time; heartbeat-miss alerts.
- **Source:** NRF API (via a small `/api/nf/*` gateway facade — see [[5GC-Core]] step 3) + cAdvisor.
- **Maps the operator frontend "Network Functions" page** — same data, ops view.

### D3 · 5GC Signalling & Procedures — **new (core of D6)**
- **Purpose:** the 3GPP call-flow KPIs (proposal PERF-01/02, TS 23.502).
- **Panels:**
  - **Initial Registration** rate + **success ratio** (Accept / Attempt).
  - **5G-AKA authentication** success vs failure (AUSF/UDM) — **auth-failure rate** is also a
    security signal (feeds D4).
  - **PDU Session Establishment** rate + **p50/p95 latency** (PERF-02 ≤500 ms).
  - **Handover** success ratio + top failure causes.
  - **Registration throughput** under load (PERF-01 ≥50 concurrent).
- **Source:** free5GC metrics where present, else **Loki LogQL** over NF logs
  (e.g. `sum(count_over_time({app="amf"} |= "Registration accept" [1m]))`) + a derived exporter.

### D4 · Security & Anomaly Detection — **new (proposal Layer 02 / D4)**
- **Purpose:** fuse signalling with the anomaly/limiter/roaming services — the "security dashboard".
- **Panels:**
  - **Anomaly alerts** feed (from **anomaly-detection-service** :9003 once real) — severity split,
    top offenders, alert timeline; **registration-burst z-score** (SEC-03 IMSI enumeration).
  - **Auth-failure bursts** per IMSI/cell (rogue UE / IMSI-catcher signature).
  - **Roaming risk** — high-risk events + composite anomaly score from
    **roaming-analysis-service `/anomalies`** (the `AnomalyDetector` z-scores).
  - **Rate-limit blocks** — allowed/blocked, block-rate %, top blocked keys from
    **rate-limiting-service `/stats`** (DoS-on-AMF mitigation).
- **Source:** the three Java services' Prometheus/JSON + Loki. This is where the proposal's
  "observability + security fusion" differentiator is visible.

### D5 · Zero-Trust & Certificates — **new (proposal Layer 01 / SEC-01/02)**
- **Purpose:** prove the mTLS + OAuth2 SBI posture.
- **Panels:** **SBI TLS handshake failures** (missing/invalid client cert = SEC-01);
  **OAuth2 token rejections** on SBI (401/403 = SEC-02 wrong scope); **certificate expiry countdown**
  per NF (cert-manager/Vault exporter); **NetworkPolicy / mesh denials** (Cilium/Hubble or Istio
  metrics — blocked NF pairs, e.g. AMF↛UPF direct).
- **Source:** free5GC SBI logs/metrics + service-mesh (Istio/Linkerd) or Cilium/Hubble + cert
  exporter. Mostly lands when the PKI/mesh work starts.

### D6 · Rate Limiting / Abuse Protection — **new (data exists)**
- **Purpose:** the standalone limiter's activity (advisory now; see ADR-11 retired).
- **Panels:** allowed vs blocked (time series), **block-rate %**, **top offenders** ZSET, per-policy
  bucket state, Redis health.
- **Source:** **rate-limiting-service `/stats`** + `ratelimit-redis`. Mirrors the frontend Rate
  Limiting page.

### D7 · Roaming Analytics — **new (data exists)**
- **Purpose:** operator/commercial view of roaming.
- **Panels:** volume/hour, inbound vs outbound, risk mix, QoS (latency/throughput/drop),
  revenue/cost/margin, top partners, forecast.
- **Source:** **roaming-analysis-service** `/summary /qos /revenue /forecast`. Mirrors the frontend
  **Roaming** group.

### D8 · Logs & Traces (correlation) — **new**
- **Purpose:** drill from a metric spike to logs/traces.
- **Panels:** Loki log volume by service/level, error-log stream, **Tempo trace search** + service
  graph; exemplar links from D1/D3 latency panels to traces.
- **Source:** Loki (Fluent Bit/promtail) + Tempo (OTel).

## Provisioning / how to add a dashboard
1. Build/iterate the panels in Grafana UI (:3000), then **Export → Save to file** as JSON into
   `grafana-dashboard/` (so it's provisioned on next `infra.sh up`).
2. Add any new Prometheus scrape targets to `docker/prometheus/prometheus.yml` (host apps via
   `host.docker.internal:<port>/actuator/prometheus`; free5GC via container targets / exporters).
3. For log-derived NF KPIs, add the Loki datasource panels (LogQL) — needs Fluent Bit/promtail
   shipping free5GC container logs.
4. Alerts (proposal §4.3 P1 rule-based): Grafana alert rules or Prometheus `alerting` rules for
   registration-burst, 5xx spike, cert-expiry < 7 d, NF heartbeat miss.

## Proposal mapping (D6 deliverable)
D2+D3 = NF-KPI dashboards · D4 = security dashboard (alerts, anomalies) · D5 = cert-expiry + zero-trust
· D1/D8 = platform + tracing. Together they are proposal **D6 "Observability stack"**.

## TODO (see [[Next-Steps]])
- [x] Add rate-limiting (9004) + anomaly (9003) [+ tracing 9005, fault 9006] to `prometheus.yml` (2026-08-15).
- [x] Cross-service **Business Services** dashboard built (`grafana-dashboard/Business Services.json`).
- [x] **free5GC NF health/traffic/latency/logs** dashboard built (`grafana-dashboard/free5gc-5g-core.json`) — 2026-09-10.
- [x] free5GC NF logs shipped to Loki via fluentd driver (`free5gc.*` tags) — 2026-09-10.
- [x] 8 free5GC Prometheus scrape jobs added (NRF=19001 … NSSF=19008) — 2026-09-10.
- [ ] Stand up **cAdvisor + node-exporter** for free5GC container CPU/mem/net.
- [ ] Build D3 (Signalling/Procedures) once real NRF facade exists (currently WebConsole-reachability proxy only).
- [ ] Build D4 once anomaly-detection-service consumes real free5GC signals.
- [ ] Build D5 when PKI/mesh lands (zero-trust SBI TLS/OAuth2).
- [ ] Export all JSON to `grafana-dashboard/`.

## Related notes
- [[Backend-and-Infra]] · [[5GC-Core]] · [[Platform-Services]] · [[Roaming-Analysis-Service]] ·
  [[Proposal-Internship]] · [[Ports-and-URLs]] · [[Next-Steps]]
