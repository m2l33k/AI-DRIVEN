---
title: 5GC Core — free5GC integration
tags: [5g, core, free5gc, ueransim, architecture]
updated: 2026-08-15
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

## Integration checklist (proposed, not yet started)
- [ ] Provision an **Ubuntu VM/WSL2** with `gtp5g` (kernel headers → build/insmod). Verify `lsmod`.
- [ ] Clone `free5gc-compose`; bring up core + MongoDB + WebConsole; register a UERANSIM gNB/UE;
      confirm a successful **Initial Registration + PDU session** (baseline before we add anything).
- [ ] Point **Prometheus** at free5GC NF metrics endpoints; add Grafana NF-KPI panels.
- [ ] Wire the operator **Network Functions** page (currently mock AMF/SMF/UPF/AUSF/UDM) to real NF
      status (via NRF `/nnrf-nfm/v1/nf-instances` or a small Java facade `/api/nf/*`).
- [ ] Enable **SBI TLS + NRF OAuth2** in free5GC config; demo SEC-01/SEC-02.
- [ ] Mesh/Cilium mTLS + NetworkPolicies between NF containers (Layer 01 contribution).
- [ ] Stream NF signalling into anomaly-detection-service; craft UERANSIM attack scripts (Layer 02).
- [ ] Scenario runner + fault-injection for Layer 03.

## Notes / gotchas
- free5GC and this Spring platform are **separate runtimes** — the harness consumes free5GC's
  APIs/metrics/logs; it does not embed it. Keep them in sibling folders / a sub-repo, not the Maven build.
- Don't pin a free5GC version here — check the current stable tag + its matching `gtp5g` version
  (they must agree with the running kernel).
- The Java **`anomaly-detection-service`** (9003) stops being a placeholder once it consumes real
  free5GC signals — see [[Platform-Services]].

## Related notes
- [[Proposal-Internship]] · [[Architecture-Decisions]] (ADR-13) · [[Platform-Services]] ·
  [[Roaming-Analysis-Service]] · [[Backend-and-Infra]] · [[Next-Steps]] · [[Glossary]]
