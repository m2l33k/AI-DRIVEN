---
title: Next Steps
tags: [todo, backlog]
updated: 2026-09-15
---

# Next Steps

Open threads and backlog. Check items off when done.

## Recently completed (2026-09-15)
- [x] **Messages FAB** — converted Messages sidebar item → floating action button (`position: fixed; bottom: 28px; right: 28px`) with unread badge (capped 9+)
- [x] **Core Config live data** — `/operator/core-config` now reads real UDR data via `GET /api/5gc/network-config` (slices, QoS, PLMN derived from subscriber UDR records); writes back via `PUT /api/5gc/network-config` (patches each subscriber's `sessionAmbr` + `5qi`)
- [x] **VM sidebar item** — added to Network Operator + Admin layouts; routes `/operator/vm` and `/admin/vm` → `VmDesktop`
- [x] **Windows XP desktop** (`shared/vm/vm-desktop.ts`) — login → boot → desktop phases, Bliss wallpaper (`wallpaperaccess.com/full/3263236.jpg`), XP taskbar, Start menu, draggable Huawei HLS window
- [x] **Huawei HLS (MongoDB browser)** — DB tree + document panel (filter, paginate, insert, delete), connected to `mongodb://localhost:27017`
- [x] **fivegc-service** (port 9008) created — WebConsole proxy + `VmMongoController` + `spring-boot-starter-data-mongodb`
- [x] **Gateway route** `/api/vm/**` → `fivegc-service` added to both default + docker profiles
- [x] **testdb** created in MongoDB with `users`, `devices`, `network_events` collections (sample telecom data)
- [x] **XP desktop containment fix** — `.content { position: relative }` + `:host { position: absolute; inset: 0 }` prevents overflow into sidebar/navbar
- [x] **YAML duplicate key fix** — fivegc-service `application.yml` had two `spring:` blocks; merged into one
- [x] **Gateway compiled config fix** — vm-service route was missing from `target/classes/application.yml`; fixed by copying source → compiled

---

## Immediate / in-progress

- [ ] **Restart gateway after config copy** — after copying `application.yml` to `target/classes`, restart gateway-service to pick up the `vm-service` route
- [ ] **Verify VM desktop works end-to-end** — login XP screen → boot → desktop → open HLS → Databases ⟳ → should show `testdb` + `admin` + `config` + `free5gc`
- [ ] **free5GC subscriber provisioning** — log into WebConsole (`http://localhost:5000`, admin/free5gc) and create at least one UE subscriber (IMSI, key, OPc) so Network Functions and Core Config pages show real data

---

## Frontend — remaining mock pages to wire up
- [ ] **Security dashboard** (`security/dashboard`) — currently mock; wire to real alert/anomaly data when anomaly-detection-service is ready
- [ ] **Security Alerts** (`security/security-alerts`) — mock; tie to anomaly-detection-service `/api/anomaly/**` events
- [ ] **Detection Rules** (`security/detection-rules`) — mock; needs a backend rules store
- [ ] **Auditor dashboard + logs** (`audit/dashboard`, `audit/audit-logs`) — mock; wire to a proper audit-log backend
- [ ] **Global HTTP error handling** — route to `/error/500` on 5xx from gateway; 404 already handled
- [ ] **Token refresh** — use stored `refresh_token` before expiry (currently user is logged out on 401)

---

## VM Desktop — enhancements
- [ ] **Window minimize/maximize** — minimize collapses to taskbar; maximize uses `deskArea.w/h`
- [ ] **Multiple HLS windows** — allow opening more than one window (currently single `wins.hls`)
- [ ] **Document edit** — add inline JSON edit for existing documents (not just insert new ones)
- [ ] **Collection create/drop** — UI to create new collections or drop existing ones
- [ ] **Query history** — remember last N filter strings per collection
- [ ] **Add VM to Security Analyst layout** — currently only Operator + Admin have the VM nav item

---

## 5GC Core — remaining phases

**Phase 2 — Zero-Trust (SEC-01/02):**
- [ ] Enable free5GC **SBI TLS + NRF OAuth2** (scoped tokens) → demo SEC-01 (no cert) / SEC-02 (403)
- [ ] mTLS + NetworkPolicy between NF containers via service mesh or Cilium/eBPF

**Phase 3 — Anomaly (D4 / SEC-03):**
- [ ] **anomaly-detection-service** (9003) — consume free5GC signalling metrics + Loki: P1 rule-based → P2 z-score
- [ ] UERANSIM attack scripts: registration flood, IMSI enumeration, fake-gNB
- [ ] Wire frontend Security Alerts + Security Dashboard to real anomaly events

**Phase 4 — Conformance & fault:**
- [ ] Scenario runner (UERANSIM TC-01→PERF-02): registration, 5G-AKA, PDU, deregister, handover; ≥50 concurrent / p95 ≤500ms
- [ ] **fault-injection-service** (9006) cases: kill SMF mid-session, UDM 503, cert expiry, UPF↔SMF partition

**Phase 5 — Package & docs:**
- [ ] One-command bring-up (`./infra.sh up --all` or compose)
- [ ] K8s + Helm (stretch)
- [ ] Final PFE docs + demo prep

---

## Backend — remaining work

- [ ] **anomaly-detection-service** (9003) — implement real-time anomaly pipeline (centralises roaming `AnomalyDetector`, ML hooks)
- [ ] **distributed-tracing-service** (9005) — decide: add real Jaeger or remove placeholder
- [ ] **fault-injection-service** (9006) — chaos engineering endpoints
- [ ] **OTP/token stores → Redis** — auth-service in-memory OTP/reset-token stores; move to Redis for multi-instance
- [ ] **Email verification** — decide Keycloak link vs custom flow for new user email verify
- [ ] **Roaming Phase 2/3** — rewrite `RiskAnalyzer` to real aggregates; add `/fraud`, `/handovers`, `/settlement` endpoints

---

## Observability
- [ ] Add rate-limiting (9004) + anomaly (9003) + fivegc-service (9008) to Prometheus scrape targets
- [ ] Stand up **cAdvisor + node-exporter** for free5GC container CPU/mem/net
- [ ] Build remaining Grafana dashboards: D4 Security/Anomaly, D5 Zero-Trust, D6 Rate-Limit, D7 Roaming
- [ ] Alert rules: registration-burst, 5xx spike, cert-expiry <7d, NF heartbeat miss

---

## Scripts / tooling
- [ ] Update `run.sh` to also launch fivegc-service (9008) alongside existing services
- [ ] Update `infra.sh` urls output for fivegc-service + MongoDB VM console URL
- [ ] Add `fivegc-service` to `build-images.sh` and `Tiltfile`

---

## PFE / docs
- [ ] Regenerate `Noted/diagram/` PlantUML to include fivegc-service (9008) and VM MongoDB
- [ ] Update `Noted/diagram/README.md` service table
- [ ] Final report draft — see [[report]]

---

## Related notes
- [[Frontend-Architecture]] · [[Backend-and-Infra]] · [[All-Endpoints]] · [[5GC-Core]]
- [[Scripts-and-Tooling]] · [[Session-Log]]
