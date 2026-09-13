---
title: 5GC Core — free5GC integration
tags: [5g, core, free5gc, ueransim, architecture]
updated: 2026-09-10
---

# 5GC Core — free5GC (open-source substrate)

**Decision:** use **free5GC** as the real 5G Core, **UERANSIM** as the RAN/UE simulator; this Spring
platform is the **harness** around it (ADR-13 in [[Architecture-Decisions]]). We integrate + harden +
observe + test a real core rather than reimplementing NFs. Maps to [[Proposal-Internship]] layers.

## What free5GC provides (Go NFs, SBA over HTTP/2 SBI)
| NF | Role | Notes |
|----|------|-------|
| **NRF** | NF registry & discovery + **OAuth2 authz server** (TS 33.501 §13) | issues scoped SBI tokens (`namf-comm`, `nsmf-pdusession`…) → SEC-02 |
| **AMF** | Access & Mobility Mgmt | SCTP/NGAP ⇄ gNB (UERANSIM) |
| **SMF** | Session Mgmt | PDU session lifecycle; PFCP ⇄ UPF |
| **UPF** | User-plane forwarding | GTP-U; **needs `gtp5g` kernel module** |
| **AUSF** | Authentication server | 5G-AKA / EAP-AKA' |
| **UDM / UDR** | Unified Data Mgmt / Repository | subscriber profiles + auth vectors (MongoDB) |
| **PCF / NSSF** | Policy / Slice selection | stretch NFs |
| **WebConsole** | subscriber provisioning UI + REST API | Mongo-backed; how you add IMSIs/slices |

Backing store: **MongoDB** (subscribers, NF context). SBI = HTTP/2 REST; **TLS + NRF-OAuth2 are
configurable** (the hook for the zero-trust Layer-01 work).

## Topology (free5GC + UERANSIM + this harness)
```
UERANSIM gNB/UE ──NGAP/NAS(SCTP)──▶ AMF ─┐
                                          ├─ SBI (HTTP/2) ─ NRF · AUSF · UDM/UDR · SMF · PCF · NSSF
        GTP-U (user plane) ────────▶ UPF ─┘                         │ MongoDB
                                                                    │ metrics / logs
   ── this repo = HARNESS ─────────────────────────────────────────▼──────────────────────
   Prometheus/Grafana · anomaly-detection-service (9003) + roaming AnomalyDetector ·
   rate-limiting (DoS on AMF) · security dashboard (Angular) · conformance runner (Layer 03)
```

## ⚠️ Environment constraint (read first)
- **UPF requires the `gtp5g` out-of-tree kernel module** → free5GC does **not** run on bare
  Windows/macOS Docker. Host must be **Linux with matching kernel headers**.
- Host here is **Windows 11** → use **Ubuntu 22.04 in a VM** (most reliable) or **WSL2 with a
  custom kernel that has `gtp5g` built** (finicky). Proposal §7 already targets this.
- Standard deployment: **`github.com/free5gc/free5gc-compose`** — docker-compose for all NFs +
  MongoDB (+ a UERANSIM container); its README has the `gtp5g` build/insmod steps. ≥16 GB RAM / 8
  cores recommended.

## How it plugs into the proposal's three layers
- **Layer 01 — Zero-Trust (§4.2):** enable free5GC **SBI TLS + NRF OAuth2** (scoped tokens →
  401/403 on missing/wrong scope = SEC-01/02); add **mTLS + NetworkPolicy between NF containers** via
  a service mesh (Istio/Linkerd) or **Cilium/eBPF** (§4.2.3). This is config/ops, not NF code.
- **Layer 02 — Anomaly detection (§4.3):** feed free5GC **signalling metrics/logs** (registration
  bursts, auth failures, NAS anomalies) into the **anomaly-detection-service (9003)** + reuse the
  roaming **`AnomalyDetector`** (z-score/IQR). UERANSIM scripts generate rogue-UE / IMSI-enumeration
  traffic to validate (SEC-03).
- **Layer 03 — Conformance/test (§5):** a scenario runner drives UERANSIM through TC-01→PERF-02
  (registration, 5G-AKA, PDU session), asserts SBI responses; **fault-injection-service (9006)** does
  NF-crash / cert-expiry / partition cases.

## How each existing service plugs into the 5GC harness
The Java platform doesn't disappear — each service takes a defined role *around* free5GC:

| Existing piece | Role in the 5GC design | Work needed |
|----------------|------------------------|-------------|
| **gateway-service** (9000) | North-bound API + **NF facade** (`/api/nf/*` over NRF `nf-instances`) for the operator console; single auth choke point | add `NfController` (WebClient → NRF), route/secure `/api/nf/**` (`PERM_nf:read`) |
| **eureka-server** (8761) | *Java-side* discovery only — **NRF is free5GC's registry** for NFs; keep the two separate | none (don't try to register NFs in Eureka) |
| **auth-service** + **Keycloak** | Operator/analyst **console** RBAC (`PERM_*`); **distinct** from free5GC's **NRF-OAuth2** which secures SBI between NFs | keep as-is; document the two token planes |
| **roaming-analysis-service** (9002) | **Layer 02** analytics engine — its `AnomalyDetector` (z-scores) is reused on roaming/attach data; `/anomalies`,`/qos`,`/revenue` feed Grafana D4/D7 | point at real `Data/Data` + (later) free5GC attach signals |
| **anomaly-detection-service** (9003) | **Layer 02** real-time engine over **free5GC signalling** (registration bursts, auth failures, NAS anomalies) → alerts to security dashboard | stop being a placeholder: consume free5GC metrics/Loki logs; rule-based (P1) → z-score/IQR (P2) |
| **rate-limiting-service** (9004) | **DoS-on-AMF** mitigation (proposal §4.3) + abuse protection; advisory now (ADR-11 retired) | optionally sidecar/limit at the AMF ingress later |
| **distributed-tracing-service** (9005) | Trace facade over **Tempo/Jaeger** for SBI call-flow traces (registration→AUSF→UDM) | decide Tempo vs Jaeger (ADR-01); instrument or scrape |
| **fault-injection-service** (9006) | **Layer 03** chaos: NF crash / cert-expiry / DB-503 / UPF partition (proposal §5.3) | scenario hooks that kill/poison free5GC NFs + assert recovery |
| **observability** (Prometheus/Grafana/Loki/Tempo) | **D6** dashboards — see [[Grafana-Dashboards]] | add free5GC scrape/exporters + Loki log shipping |
| **Frontend** (Angular) | Operator **Network Functions** (→ real `/api/nf/*`), Security dashboards (anomaly/limiter/roaming) | wire NF page; add a 5GC/security overview |

## Phased integration plan (detailed) — proposal §6 mapped to *this* repo

> **Windows-mode status (2026-09-10):** Phases 0–1 are now complete in Windows/no-UPF mode.
> UPF still requires a Linux host with `gtp5g`. All control-plane NFs are running and observed.

**Phase 0 — Host & baseline.**
- [x] **Cloned** `github.com/free5gc/free5gc-compose` to `E:/My-project/free5gc-compose` (shallow, v4.2.3).
- [x] `docker/docker-compose-5gc.yml` — 8 control-plane NFs + WebConsole + MongoDB on Windows (`--scale free5gc-upf=0`).
- [x] `docker/.env`: `F5GC_DIR=E:/My-project/free5gc-compose`, `F5GC_TAG=v4.2.3`.
- [x] `infra.sh` updated: `./infra.sh up --5gc`, `./infra.sh 5gc up/down/status`.
- [ ] Provision a subscriber in **WebConsole** (IMSI, key/OPc, slice/S-NSSAI, DNN) — still TODO.
- [ ] Full UERANSIM test (needs Linux + UPF) — still TODO.

**Phase 1 — Observe (D2/D3 foundation).**
- [x] **free5GC metric endpoints** added to `docker/prometheus/prometheus.yml` (NRF=19001…NSSF=19008); labels `nf:` + `free5gc: "true"`.
- [x] NF configs patched (`enable: true`, `bindingIPv4: 0.0.0.0`) in `E:/My-project/free5gc-compose/config/`.
- [x] **Grafana dashboard** `grafana-dashboard/free5gc-5g-core.json` — NF health stats, SBI traffic, latency P95/P50, error rate, Loki log stream.
- [x] **Backend proxy** `Free5gcService` + `Free5gcController` in `roaming-analysis-service` — `/api/5gc/nf-status`, `/api/5gc/subscribers`, `/api/5gc/ue-contexts`.
- [x] **Angular pages** — Security Analyst `/security/5gc` (fivegc-dashboard.ts) + Network Operator `/operator/network-functions` rewritten.
- [x] **NF log shipping** via fluentd driver in `docker-compose-5gc.yml` (`free5gc.amf` etc. → Fluent Bit → Loki).
- [ ] Add **cAdvisor + node-exporter** for container CPU/mem/net (still TODO).
- [ ] Wire NF facade to real NRF (`nnrf-nfm/v1/nf-instances`) instead of WebConsole-reachability proxy (still TODO — current impl checks WebConsole only).

**Phase 2 — Zero-Trust (Layer 01 / SEC-01/02).**
- [ ] Turn on free5GC **SBI TLS** + **NRF OAuth2** (scoped tokens `namf-comm`/`nsmf-pdusession`);
      demo **SEC-01** (no cert → handshake reject) + **SEC-02** (wrong scope → 403).
- [ ] Add **mTLS + NetworkPolicies between NF containers** via a **service mesh (Istio/Linkerd)** or
      **Cilium/eBPF** (§4.2.3: forbid AMF↛UPF direct). Build **Grafana D5** (handshake fails, token
      rejects, cert-expiry, mesh denials). PKI via cert-manager/CFSSL or Vault.

**Phase 3 — Anomaly detection (Layer 02 / D4 / SEC-03).**
- [ ] **anomaly-detection-service** consumes free5GC signalling (metrics + Loki): **P1 rule-based**
      (registration-flood, auth-failure burst) → **P2 statistical** (z-score/IQR, reuse the roaming
      `AnomalyDetector`). Emit alerts → **Grafana D4** + the frontend security view.
- [ ] **UERANSIM attack scripts**: registration flood (DoS-on-AMF), IMSI enumeration (SEC-03 alert
      within ≤10 probes), fake-gNB NAS-sequence anomaly.

**Phase 4 — Conformance & fault (Layer 03 / D3/D5 evidence).**
- [ ] **Scenario runner** driving UERANSIM through **TC-01→PERF-02** (registration, 5G-AKA, PDU,
      dereg, handover; PERF ≥50 concurrent / p95 ≤500 ms), asserting SBI responses + pcap evidence.
- [ ] **fault-injection-service** cases: kill SMF mid-session (NRF heartbeat cleanup), UDM 503,
      cert expiry, isolate UPF↔SMF (PFCP teardown). CI/CD gate (optional).

**Phase 5 — Package & document (D5/D7).**
- [ ] One-command bring-up (compose) for core + sims + harness; K8s+Helm (stretch).
- [ ] Final architecture/deployment/test docs; live demo script.

## Open questions / decisions to make
- free5GC **version pin** + matching `gtp5g` version vs the host kernel (must agree).
- Mesh choice for Layer 01: **Istio vs Linkerd vs Cilium** (Cilium also gives eBPF NetworkPolicy §4.2.3).
- Tracing: **Tempo (current) vs add Jaeger** for the distributed-tracing-service (ADR-01, open).
- Where the NF facade lives: **gateway controller** (simplest, chosen for step) vs a dedicated service.
- Repo layout: free5GC/UERANSIM as a **sibling folder / sub-repo** (NOT in the Maven build).

## Notes / gotchas
- free5GC and this Spring platform are **separate runtimes** — the harness consumes free5GC's
  APIs/metrics/logs; it does not embed it. Keep them in sibling folders / a sub-repo, not the Maven build.
- Don't pin a free5GC version here — check the current stable tag + its matching `gtp5g` version
  (they must agree with the running kernel).
- The Java **`anomaly-detection-service`** (9003) stops being a placeholder once it consumes real
  free5GC signals — see [[Platform-Services]].

## Related notes
- [[Proposal-Internship]] · [[Architecture-Decisions]] (ADR-13) · [[Grafana-Dashboards]] ·
  [[Platform-Services]] · [[Roaming-Analysis-Service]] · [[Backend-and-Infra]] · [[Next-Steps]] ·
  [[Glossary]]
