---
title: Proposal — Internship (Cloud-Native 5G Core)
tags: [proposal, internship, 5g, security, roadmap]
author: Malek Aziz Hassayoun
institution: ESPRIT
date: June 2026
updated: 2026-08-14
---

# Cloud-Native 5G Core Network — Internship Proposal

> **Author:** Malek Aziz Hassayoun · **ESPRIT — June 2026** · *Confidential*
> Verbatim proposal captured for reference, with links to where each part lands in this repo.
> How this maps to our code: [[Project-Overview]] · [[Backend-and-Infra]] ·
> [[Roaming-Analysis-Service]] · [[Platform-Services]] · [[Roles-and-Permissions]].

## 1. Executive Summary
Design, implementation, security hardening, and validation of a cloud-native **5G Core (5GC)**
network prototype. Beyond a standard educational implementation, it adds three differentiating
layers not found in mainstream open-source 5G cores:

| # | Layer | What it adds |
|---|-------|--------------|
| 01 | **Zero-Trust Security** | Mutual TLS on all SBI interfaces, certificate-based NF identity, network-policy enforcement between micro-services — absent from open5GS/free5GC by default. |
| 02 | **Anomaly Detection Engine** | Lightweight ML/statistical model trained on 5G signalling patterns to flag rogue UEs, IMSI-catcher signatures, and abnormal session-establishment rates in real time. |
| 03 | **Automated Test Framework** | Scenario-driven conformance suite validating call flows against 3GPP TS 23.502, enabling CI/CD-gated regression testing. |

The result is an **engineering platform**: a reproducible, testable, security-aware 5G core
demonstrating skills relevant to telecom R&D, network security, and cloud-native systems.

## 2. Context & Motivation
**2.1 5G Core architecture.** 3GPP Release 15+ replaces the monolithic 4G EPC with a fully
**service-based architecture (SBA)**. Each network function (NF) is an independent micro-service
communicating over HTTP/2 REST APIs on the **Service-Based Interface (SBI)** — bringing
micro-services, containerisation, orchestration, and observability into the mobile core.

**2.2 Why from-scratch has value.** open5GS/free5GC/OAI already implement baseline 3GPP procedures;
another vanilla core has diminishing value. This project is justified by what it *adds*:
- **Security posture** — no major OSS core ships mTLS between NFs, zero-trust policies, or cert
  lifecycle management (a documented gap operators must patch themselves).
- **Testability** — the ecosystem lacks a portable, scenario-driven conformance framework.
- **Observability + security fusion** — correlating Prometheus signalling metrics with anomaly
  detection is unexplored in the OSS 5G space.

The prototype is the *vehicle*; the **security architecture, test framework, and anomaly detection
engine are the contributions.**

## 3. Problem Statement
| #   | Challenge                  | Baseline                            | Extended scope (this project)                                                   |
| --- | -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| P1  | Protocol complexity        | NGAP, NAS, HTTP/2 SBI               | + SCTP over DTLS to RAN, mTLS on all SBI calls                                  |
| P2  | Distributed systems        | NF registration/discovery/state     | + cert-based NF identity (lightweight PKI), token-based SBI authz               |
| P3  | Deployment & observability | Docker Compose, Prometheus, Grafana | + network-policy enforcement (Cilium/eBPF), anomaly sidecar, security dashboard |
| P4  | Standards conformance      | Interop with a RAN simulator        | + CI/CD-integrated conformance suite (TS 23.502 registration + PDU session)     |

## 4. Extended System Architecture
### 4.1 Minimal Viable Core (MVP)
| NF | Scope | Role |
|----|-------|------|
| NRF | Core | Service registry & discovery for all NFs |
| AMF | Core | Access & Mobility Mgmt — SCTP/NGAP to the gNB |
| SMF | Core | Session Mgmt — PDU session lifecycle, user-plane control via PFCP |
| UPF | Core | User-plane forwarding — GTP-U data path |
| AUSF | Core | Authentication server — 5G-AKA / EAP-AKA' |
| UDM | Core | Unified Data Mgmt — subscriber profiles, auth vectors |
| PCF | Stretch | Policy control — QoS/charging |
| NSSF | Stretch | Network slice selection |

### 4.2 Security layer — Zero-Trust
No NF trusts another by default; every inter-NF call is authenticated and authorised.
- **4.2.1 mTLS on SBI** — lightweight internal PKI (Vault or self-hosted CA) issues X.509 per NF;
  all HTTP/2 SBI calls require a client cert; rotation is automated and pipeline-tested.
- **4.2.2 OAuth2 / JWT (TS 33.501 §13)** — NRF acts as OAuth2 authz server issuing scoped tokens;
  AMF/SMF/UDM validate on every inbound request (missing/expired ⇒ 401); scopes map to NF service
  names (`namf-comm`, `nsmf-pdusession`).
- **4.2.3 Network policy** — K8s NetworkPolicies / Cilium L7 restrict permitted NF pairs (AMF ↛ UPF
  directly; all data-plane control via SMF/PFCP), enforced at the network layer; eBPF per-flow
  visibility.
- **4.2.4 Secrets** — DB creds, cert keys, IMSI keys never in env vars / compose; Vault dynamic
  injection; access logged. **Anti-pattern to avoid:** plaintext IMSI/auth vectors — UDM data at
  rest encrypted with **MongoDB CSFLE**.

### 4.3 Anomaly Detection Engine
A lightweight sidecar consumes the Prometheus metrics stream and applies statistical + ML detection.

| Threat | Observable signal | Detection method |
|--------|-------------------|------------------|
| Rogue UE / IMSI enumeration | Registration burst from a single location | Rate threshold + z-score on registration count |
| IMSI catcher (fake gNB) | gNB authenticates then requests identity without AKA | NAS sequence anomaly (HMM / rule-based FSM) |
| Session hijacking | SMF gets *modify session* for unknown session | State correlation across SMF & UDM logs |
| DoS on AMF | Registration flood from a single PLMN/TA | Sliding-window rate limiter + AMF circuit breaker |

**Phases:** P1 Wks 9–10 rule-based (Prometheus alerting) · P2 Wks 11–12 statistical (z-score / IQR)
· P3 *stretch* isolation-forest / LSTM on captured traces. P1+P2 fit the timeline; P3 is stretch.

## 5. Automated Conformance Test Framework
First-class deliverable — validates implementation vs 3GPP, enables CI/CD regression, demonstrates
security posture under adversarial scenarios.

**5.1 Architecture.** Go test runner (shares the core codebase); YAML scenarios (message sequences,
expected responses, timing); Docker Compose brings up core + RAN simulator; runner reports pass/fail
with pcap evidence; **GitHub Actions** runs on every commit, a failing test blocks merge.

**5.2 Conformance cases (TS 23.502).**
| TC | Case | Procedure | Pass criterion |
|----|------|-----------|----------------|
| TC-01 | Initial UE Registration | 4.2.2.2 | Registration Accept within 2 s |
| TC-02 | 5G-AKA Authentication | 4.6.2 | RAND/AUTN sent, RES* verified, SEAF key derived |
| TC-03 | PDU Session Establishment | 4.3.2 | N1 PDU Session Accept, GTP-U tunnel active |
| TC-04 | UE Deregistration | 4.2.2.3 | Sessions released, AMF state cleared |
| TC-05 | Handover (Xn) *(stretch)* | 4.9.1.2 | UE context transferred, GTP-U path switched |
| SEC-01 | mTLS enforcement — no cert | TS 33.501 §13 | SBI call rejected at TLS handshake |
| SEC-02 | Token scope violation | §13.3 | AMF→UDM wrong scope ⇒ HTTP 403 |
| SEC-03 | IMSI enumeration | threat model | Anomaly alert within 10 registration probes |
| PERF-01 | Registration throughput | KPI | ≥50 concurrent registrations, no error |
| PERF-02 | PDU session latency | KPI | p95 establishment ≤500 ms under load |

**5.3 Fault injection.** NF crash recovery (kill SMF mid-session → NRF heartbeat timeout → cleanup);
DB unavailability (UDM returns 503 not hang); certificate expiry (AMF cert expired → calls rejected
until rotated); network partition (isolate UPF from SMF → PFCP keepalive teardown).

## 6. Methodology & Work Plan (4–6 months, 6 phases)
| Phase | Weeks | Title | Activities |
|-------|-------|-------|-----------|
| P1 | 1–2 | State of the art | SBA study (R15/R16); survey open5GS/free5GC/OAI; identify security gaps; define PKI + threat model |
| P2 | 3–4 | Architecture & security design | System arch; SBI API contracts; data models; PKI design; NF identity; CSFLE; Vault plan |
| P3 | 5–10 | Core implementation | Implement NRF/AMF/SMF/UPF/AUSF/UDM in Go; deploy PKI; mTLS + OAuth2 on all SBI; CSFLE subscriber DB |
| P4 | 11–14 | Integration & test framework | RAN/UE simulator; conformance suite (TC-01→PERF-02); rule-based + statistical anomaly detection; CI/CD |
| P5 | 15–18 | Deployment & observability | Docker Compose; optional K8s+Helm; Cilium policies; Prometheus+Grafana; security dashboard |
| P6 | 19–24 | Validation & documentation | Full conformance run; load (PERF-01/02); fault injection; anomaly validation; final report + demo |

## 7. Technical Environment
- **Languages:** Go (NFs, test runner), C (UPF data path / eBPF), Shell, optional TypeScript (dashboard).
- **Protocols:** NGAP, NAS-5GS, PFCP, GTP-U, HTTP/2 (SBI), SCTP over DTLS, OAuth2/JWT, TLS 1.3.
- **Security:** HashiCorp Vault, cert-manager / CFSSL (PKI), Cilium (policy + eBPF), MongoDB CSFLE.
- **Data:** MongoDB 7.x + CSFLE; Redis (session cache).
- **Containers:** Docker, Docker Compose (primary), K8s + Helm (stretch).
- **Observability:** Prometheus, Grafana, Wireshark/tcpdump, Jaeger (stretch).
- **Testing:** Go test runner, YAML scenarios, GitHub Actions, k6 (load).
- **RAN sim:** UERANSIM (primary) or OAI gNB/UE.
- **Platform:** Ubuntu 22.04 LTS (VM/WSL2), kernel GTP module, ≥16 GB RAM / 8 cores.
- **Tooling:** Git/GitHub, Make, VS Code + Go, Protobuf (optional).

## 8. Expected Deliverables
| # | Deliverable | Description |
|---|-------------|-------------|
| D1 | Architecture & API spec | Full diagram, SBI contracts (OpenAPI 3.0), PKI design, threat model |
| D2 | Working 5G Core MVP | NRF/AMF/SMF/UPF/AUSF/UDM in Go with mTLS + OAuth2 + MongoDB CSFLE |
| D3 | Conformance test suite | Go runner + YAML scenarios (TC-01→PERF-02), CI/CD-integrated, all passing |
| D4 | Anomaly detection engine | Rule-based + statistical sidecar, validated vs ≥3 threats (SEC-01→SEC-03) |
| D5 | Containerised deployment | Docker Compose (Vault, PKI, NFs, RAN sim); optional K8s+Helm |
| D6 | Observability stack | Prometheus + Grafana NF-KPI dashboards + security dashboard (alerts, anomalies, cert expiry) |
| D7 | Technical docs & final report | Architecture/deployment guides, test results, security analysis, lessons learned, live demo |

## 9. Skills to Be Developed
5G standards (R15+ SBA, NGAP/NAS/PFCP/GTP-U/SBI, TS 23.502, TS 33.501) · distributed systems (Go
micro-services, discovery, fault tolerance, circuit breakers, tracing) · telecom security (PKI,
mTLS, OAuth2/JWT, zero-trust, 5G-AKA, IMSI protection, threat modelling) · cloud-native ops (Docker,
K8s, Helm, Cilium/eBPF, Vault, CI/CD) · observability & ML (Prometheus, Grafana, anomaly detection,
time-series) · test engineering (conformance testing, scenario framework, fault injection, load,
pcap evidence).

## 10. Feasibility & Scope Justification
**10.1 Achievable** because it is structured around a strict MVP core (P3) that must complete before
extended features; mTLS/OAuth2 are Go stdlib features, not research; the test framework calls the
same NF HTTP endpoints (no second protocol stack).

**10.2 Risk register.**
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| NGAP/NAS complexity blocks AMF | Medium | UERANSIM NGAP lib as reference; +2 days/NF in P3 |
| PKI integration delays core | Low | CFSSL / cert-manager prebuilt image; PKI ≈ 1-day task |
| Anomaly P3 (ML) out of reach | High | P3 explicitly stretch; P1+P2 suffice for deliverable |
| RAN sim compatibility | Low | UERANSIM is most-tested OSS RAN sim; OAI gNB fallback |
| K8s track adds scope | Medium | K8s optional; Docker Compose is primary target |

**10.3 Commercial potential.** Security-hardened 5G core testbed-as-a-service (vendors/MVNOs pay for
on-demand isolated test envs); conformance suite as a standalone product for NF vendors; matured
anomaly engine addresses the 5G security-monitoring market (~$4.5 B by 2028).

---

## How this maps to the current repo
This repo is the **cloud-native / security-and-observability harness** around the proposal, not the
Go NFs themselves (yet):
- **Zero-Trust (Layer 01)** → already partially realised: JWT resource servers on every service via
  Keycloak realm `auth-management`, `PERM_*`/`ROLE_*` mapping — see [[Auth-Service]],
  [[Roles-and-Permissions]]. Next: mTLS/PKI + network policy.
- **Anomaly Detection (Layer 02)** → the [[Roaming-Analysis-Service]] `/anomalies` heuristic +
  placeholder **anomaly-detection-service** (9003) in [[Platform-Services]]; the real
  `Data/Data/` roaming dataset (fraud_flag, auth-failure bursts, impossible travel) is the training/
  validation ground — see the **Redesign** section of [[Roaming-Analysis-Service]].
- **Test framework (Layer 03)** → placeholder **fault-injection-service** (9006) + the CI/CD-gated
  conformance idea; see [[Next-Steps]].
- Rate-limiting (9004) and distributed-tracing (9005) placeholders back the DoS-mitigation and
  observability parts of the proposal.

## Related notes
- [[README]] · [[Project-Overview]] · [[Backend-and-Infra]] · [[Roaming-Analysis-Service]] ·
  [[Platform-Services]] · [[Roles-and-Permissions]] · [[Next-Steps]]
