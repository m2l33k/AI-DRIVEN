# Nexo — Presentation Deck Blueprint

> **Project:** Cloud-native 5G Core (5GC) management platform — *Nexo*
> **Author:** Malek Aziz Hassayoun · ESPRIT · Huawei / Tunisie Telecom 5G Core context
> **Stack:** Spring Boot 4 microservices · Spring Cloud Gateway · Keycloak (OAuth2/OIDC) ·
> Angular 22 console · Prometheus/Grafana/Loki/Tempo · free5GC + UERANSIM substrate
> **Methodology:** CRISP-DM (for the data / anomaly-detection work)

This file is a **build sheet** for the slides. For every slide you get:
- **Content** — the exact bullets/tables to put on the slide (grounded in this codebase).
- **Design** — layout, visual, and speaker guidance so the slide looks clean and defensible.

Deck length target: **~16–20 slides** across the 12 sections. Keep ≤ 6 bullet lines per slide;
push detail into speaker notes.

---

## 🎨 Global design system (apply to every slide)

- **Palette:** Huawei red `#C7000B` (primary/accent), crimson `#8A0F2A` (deep), canvas `#F2F3F5`,
  cards white `#FFFFFF`, borders `#E5E6EB`, text `#1D2129`. Role accents used as chart colours:
  operator blue `#3491FA`, analyst green `#00A870`, auditor orange `#FF8F1F`, admin red `#C7000B`.
- **Font:** HarmonyOS Sans → Segoe UI fallback (matches the real console).
- **Master layout:** thin red top rule, section number chip top-left, slide title, logo bottom-right,
  page number bottom-right. Lots of white space — one idea per slide.
- **Icon style:** line icons (Feather), not filled glyphs — consistent with the app chrome.
- **Recurring motif:** reuse the **layered architecture diagram** as a mini-map; highlight the layer
  under discussion on each architecture slide so the audience never loses context.

---

## 01 — Introduction & Context

**Slide 1.1 — Title**
- Content: Project title *"Nexo — a Security- & Observability-Hardened Cloud-Native 5G Core"*;
  your name, ESPRIT, supervisors, host company (Huawei), period; date.
- Design: Full-bleed cover. Huawei-red band, 5GC/network hero graphic, minimal text. No bullets.

**Slide 1.2 — Context**
- Content:
  - Host / department and the **Tunisie Telecom 5G Core** project framing.
  - 5G moves the mobile core from monolithic 4G EPC to a **Service-Based Architecture (SBA)** —
    each Network Function (NF) is an independent microservice over HTTP/2 SBI.
  - This makes the telecom core a **cloud-native, DevOps, observability** problem — the exact skills
    this internship targets.
- Design: Left = 2–3 context bullets; right = simple timeline "4G EPC (monolith) → 5G SBA
  (microservices)" arrow graphic. One statistic callout (e.g. 5G security-monitoring market ≈ $4.5 B by 2028).

---

## 02 — Background / OSS vs BSS

**Slide 2.1 — Where this platform sits: OSS vs BSS**
- Content:
  - **OSS (Operations Support Systems):** run and monitor the *network* — fault, config,
    performance, NF lifecycle, service assurance. → *Nexo's operator + observability side.*
  - **BSS (Business Support Systems):** run the *business* — billing, roaming settlement, revenue,
    partner agreements, customer experience. → *Nexo's roaming analytics side (charged amount,
    wholesale cost, margin, settlement).*
  - **Nexo spans both:** operator/security console (OSS) **and** roaming revenue/settlement analytics
    (BSS) on one platform.
- Design: **Two-column comparison** (OSS | BSS) with a Venn/overlap in the middle labelled "Nexo".
  Map each Nexo feature into the correct column with small chips (NF monitoring, anomaly detection →
  OSS; roaming revenue, settlement, ARPU → BSS).

**Slide 2.2 — 5G SBA primer (background)**
- Content: mini NF glossary the audience needs — **NRF** (registry + OAuth2), **AMF** (access/mobility),
  **SMF** (sessions), **UPF** (user plane), **AUSF/UDM** (auth + subscriber data). SBI = HTTP/2 REST.
- Design: One clean **SBA topology diagram** (UE/gNB → AMF → NRF/AUSF/UDM/SMF → UPF). Label the
  SBI bus. Keep it the *canonical* diagram you reuse later.

---

## 03 — Problem Statement

**Slide 3.1 — The problems**
- Content (the four recurring platform pains + the telecom-security gap):
  - **Discovery & routing** — hard-coded service URLs are brittle; need a registry + one front door.
  - **Authentication** — rolling your own IAM is risky; identity must be delegated to a standard OIDC provider.
  - **Authorization** — checking *role names* in code couples policy to the org chart; re-slicing needs a redeploy.
  - **Observability** — without correlated metrics/logs/traces from day one, debugging a distributed
    system is guesswork.
  - **Telecom security gap** — mainstream OSS 5G cores (open5GS/free5GC/OAI) ship **no mTLS between NFs,
    no zero-trust, no anomaly detection, no conformance harness** by default.
- Design: 5-item problem grid, each with a line icon + one-line consequence. Red "pain" accent.
  Speaker note: "each of these becomes a design decision later — keep them in mind."

**Slide 3.2 — Problem framing table (optional, if audience is technical)**
- Content: the P1–P4 table from the proposal — Protocol complexity, Distributed systems,
  Deployment & observability, Standards conformance — *Baseline* vs *Extended scope*.
- Design: 3-column table (Challenge | Baseline | This project adds). Bold the "adds" column in accent.

---

## 04 — Gap Analysis / Existing Solutions

**Slide 4.1 — What already exists, and what's missing**
- Content:
  - **open5GS / free5GC / OAI** already implement baseline 3GPP procedures → *another vanilla core has
    diminishing value.*
  - Documented gaps operators must patch themselves:
    - No **mTLS / zero-trust** between NFs (SBI security is off by default).
    - No portable, scenario-driven **conformance test** framework.
    - **Observability + security fusion** (Prometheus signalling metrics ↔ anomaly detection) is unexplored.
- Design: **Feature-comparison matrix** — rows = {Baseline call flows, mTLS on SBI, NRF OAuth2 tokens,
  Anomaly detection, Conformance suite, Unified observability}; columns = {open5GS, free5GC, OAI, **Nexo**}.
  ✓ / ✗ / partial cells; the Nexo column is a solid green line of ✓. This slide sells the contribution.

**Slide 4.2 — Positioning statement**
- Content: *"The prototype core is the vehicle; the contribution is the three added layers —
  Zero-Trust security, Anomaly Detection, and a Conformance Test framework — wrapped around a real core."*
- Design: One large quote-style statement, three labelled chips (Layer 01 / 02 / 03). No clutter.

---

## 05 — Proposed Solution & Architecture

**Slide 5.1 — Solution in one line**
- Content: *Nexo = a security- & observability-hardened cloud-native harness around a real 5G Core
  (free5GC), with a role-based Angular console.* Three differentiating layers: **Zero-Trust,
  Anomaly Detection, Conformance/Fault testing.**
- Design: Single hero sentence + the three-layer chip strip. Set the frame before the diagram.

**Slide 5.2 — System architecture (the money slide)**
- Content — layered diagram:
  - **Clients** (Angular console / Swagger / Bruno) → bearer JWT.
  - **Gateway (:9000)** — Spring Cloud Gateway (WebFlux), OAuth2 resource server, `PERM_*` RBAC per route,
    Eureka discovery locator.
  - **Business services:** auth (9001), roaming-analysis (9002), anomaly-detection (9003),
    rate-limiting (9004), distributed-tracing (9005), fault-injection (9006), messaging (9007).
  - **Platform services:** Eureka (8761) discovery; Keycloak (8081) identity.
  - **5GC substrate (separate Linux runtime):** free5GC NFs + UERANSIM — consumed via APIs/metrics/logs.
  - **Observability side-channel:** Prometheus (9090) scrape · Fluent Bit→Loki (logs) · OTel→Tempo (traces)
    · Grafana (3000).
- Design: The full block diagram (reuse the ASCII architecture from `Noted/README.md` §2, redrawn cleanly).
  Colour-band the three tiers (edge / services / infra). Dotted "observability" side-channel. Put a small
  legend. This is the slide you spend the most time on.

**Slide 5.3 — Request & auth flow**
- Content (numbered):
  1. Login → gateway (public) → auth-service → Keycloak **password grant** → JWT returned.
  2. JWT carries `realm_access.roles` (role) + `resource_access.platform-client.roles` (permissions).
  3. Protected call → gateway validates JWT signature (Keycloak JWK) → maps claims to
     `ROLE_*` / `PERM_*` authorities → authorizes the route **on the permission** → forwards to service →
     service re-checks with `@PreAuthorize` (defence in depth).
- Design: Horizontal **sequence diagram** (Client → Gateway → Auth/Service → Keycloak). Animate 1→3 on
  clicks. Callout box: *"Authorize on PERM_*, never on role names."*

---

## 06 — Methodology (CRISP-DM)

**Slide 6.1 — Why CRISP-DM**
- Content: the anomaly-detection / roaming-analytics work is a **data-mining problem**, so it follows
  **CRISP-DM** — the standard iterative cycle for data projects. (The software side follows an
  incremental/iterative build; CRISP-DM governs the analytics.)
- Design: The classic **CRISP-DM circular diagram** (6 phases, arrows, central "Data"). Highlight it's iterative.

**Slide 6.2 — CRISP-DM mapped to this project**
- Content — map each phase to concrete work:
  1. **Business Understanding** — detect roaming fraud / signalling threats (rogue UE, IMSI-catcher,
     auth-failure bursts, DoS on AMF); reduce revenue leakage via settlement analytics.
  2. **Data Understanding** — the real `Data/Data/` roaming dataset (~39k rows): CDR/TAP-RAP (10k),
     attach events (13.4k), session QoS (5k), handovers (10.6k), devices (328), cells (253); key
     signals `fraud_flag`, `auth_failure_flag`, `reject_cause`, `packet_loss_pct`.
  3. **Data Preparation** — CSV ingestion (OpenCSV), join on `subscriber_imsi` / `cdr_id` / `cell_id`,
     derive direction from a home-operator set, compute impossible-travel from cell lat/lon ÷ Δt.
  4. **Modeling** — additive explainable **RiskAnalyzer** (0–100) → **AnomalyDetector** (population
     z-score / IQR composite score); roadmap to isolation-forest / LSTM.
  5. **Evaluation** — validate against real `fraud_flag`; benchmark detection vs threat scenarios
     (SEC-01→SEC-03), latency/throughput KPIs (PERF-01/02).
  6. **Deployment** — served via `roaming-analysis-service` + `anomaly-detection-service` APIs,
     surfaced in the Angular Security-Analyst dashboards + Grafana.
- Design: **Two-column** — left the 6-phase wheel (small), right a numbered list mapping each phase.
  Or a 6-row table (Phase | What we did | Artifact). Use dataset row-counts as concrete proof.

---

## 07 — Functional & Non-Functional Requirements

**Slide 7.1 — Functional requirements**
- Content (grouped by actor — ties to the 4 Keycloak roles):
  - **Platform Admin** — manage users & roles, view platform config, system health / API metrics.
  - **Network Operator** — view NF status, restart NFs, apply core config.
  - **Security Analyst** — roaming analytics (events, anomalies, partners, QoS, revenue), detection-rule
    tuning, rate-limiting policies.
  - **Auditor** — read-only across everything incl. append-only audit logs.
  - **All users** — 1:1 messaging + real-time notifications.
- Design: **Actor → capability** table or a 4-lane swimlane (one lane per role, role accent colour).
  Small role avatars. Mirrors the real product, which is persuasive.

**Slide 7.2 — Non-functional requirements**
- Content:
  - **Security** — OAuth2/OIDC, permission-based RBAC (defence in depth), append-only audit
    (`audit:delete` granted to nobody), zero-trust roadmap (mTLS/PKI).
  - **Observability** — metrics + logs + traces correlated via `trace_id`/`span_id` MDC.
  - **Scalability / resilience** — stateless services, service discovery, database-per-service,
    fail-open rate limiter, circuit-breaking roadmap.
  - **Performance** — reactive gateway; anomaly detection near real-time; KPI targets (≥50 concurrent
    registrations, p95 ≤ 500 ms).
  - **Maintainability / portability** — Docker Compose + Kubernetes/Tilt; config-as-code Keycloak realm.
- Design: **5 NFR pillars** as icon cards (Security / Observability / Scalability / Performance /
  Maintainability), one metric or mechanism under each. Keep it scannable.

---

## 08 — Used Technologies

**Slide 8.1 — Technology stack**
- Content — grouped:
  - **Backend:** Java 17, Spring Boot 4.0.3, Spring Cloud 2025.x, Spring Cloud Gateway (WebFlux),
    Spring Security OAuth2 Resource Server, Netflix Eureka, Spring Data JPA.
  - **Identity:** Keycloak (realm `auth-management`, client `platform-client`).
  - **Data:** MySQL (roaming), Postgres (per-service, incl. Keycloak), Redis (rate-limit / anomaly windows),
    MongoDB (free5GC subscriber store).
  - **Frontend:** Angular 22 (standalone, signals, lazy routes), custom dependency-free SVG charts.
  - **Observability:** Prometheus, Grafana, Loki, Tempo, Fluent Bit, OpenTelemetry.
  - **5GC substrate:** free5GC (Go NFs), UERANSIM (RAN/UE sim).
  - **Ops / tooling:** Docker, Docker Compose, Kubernetes, Tilt, Git, Bruno, springdoc/Swagger.
- Design: **Logo wall** grouped into labelled buckets (Backend / Identity / Data / Frontend /
  Observability / 5GC / Ops). Grid of official logos — visually rich, low text. Speaker note explains "why"
  for the 2–3 non-obvious choices (Keycloak, free5GC, WebFlux gateway).

**Slide 8.2 — Key design decisions (ADR highlights) — optional**
- Content: 3 defensible choices with one-line rationale:
  - **Permission-based RBAC** — re-slice roles in Keycloak with zero code change.
  - **free5GC as substrate, this repo as harness** — a vanilla core has diminishing value; contribute
    the three layers instead.
  - **DTOs ≠ JPA entities** on the wire; **rate limiter stays advisory** (a blocking hop on the gateway
    hot path was tried and reverted).
- Design: 3 "decision cards" — *Decision · Why · Trade-off*. Signals engineering maturity to a jury.

---

## 09 — The Nexo Platform (live product walkthrough)

**Slide 9.1 — Service catalogue**
- Content: table of the **9 Maven modules** + ports:
  | Service | Port | Role |
  |---|---|---|
  | eureka-server | 8761 | Discovery |
  | gateway-service | 9000 | Edge + RBAC |
  | auth-service | 9001 | Login + user mgmt (Keycloak) |
  | roaming-analysis-service | 9002 | Roaming analytics + risk scoring |
  | anomaly-detection-service | 9003 | Real-time anomaly (roadmap) |
  | rate-limiting-service | 9004 | Redis token-bucket limiter |
  | distributed-tracing-service | 9005 | Trace facade (roadmap) |
  | fault-injection-service | 9006 | Chaos/resilience (roadmap) |
  | messaging-service | 9007 | 1:1 DM + WebSocket notifications |
- Design: Clean table; tag each row **Done ✅ / Roadmap 🚧** so the jury sees what's real vs planned. Honesty scores.

**Slide 9.2 — Console screenshots (demo proxy)**
- Content: 3–4 real screenshots — Admin **System Health / API Metrics** (live JVM + Prometheus),
  Security-Analyst **Roaming** dashboards (charts, anomalies, revenue/settlement), **Rate Limiting**
  page (policy CRUD + decision tester), **Messaging** (chat + live bell notification).
- Design: Device/browser frame mockups, 2×2 grid. Caption each with the capability shown. This is where
  the **Huawei-red console look** pays off visually. Keep a live demo ready as backup.

**Slide 9.3 — Security & RBAC model**
- Content: 4 roles → composite permissions; claims→authorities mapping
  (`realm_access.roles` → `ROLE_*`, `platform-client` roles → `PERM_*`); note `audit:delete` = no role
  (append-only). 16×4 permission matrix reference.
- Design: **Role → permission matrix** heatmap (roles as columns, resources as rows, ✓ cells in role
  accent colour). One callout arrow on the append-only audit cell.

**Slide 9.4 — Roaming analytics deep-dive (the data story)**
- Content: how a roaming event is scored — RiskAnalyzer additive heuristic (impossible travel +40,
  signalling errors ×3, new-device ratio, known-bad PLMN +20…) → AnomalyDetector composite z-score →
  severity → surfaced in `/anomalies`, `/qos`, `/revenue`, `/optimization`. 13 endpoints, all wired to the UI.
- Design: A **pipeline strip**: Raw CDR/attach/QoS → features → risk/anomaly score → dashboard card.
  Show one worked example ("Latency 3.1σ above baseline + impossible travel → CRITICAL").

---

## 10 — Results & Benchmarks

**Slide 10.1 — What was delivered**
- Content:
  - **9 microservices** on a Spring Cloud backbone; **Angular 22** role-based console (auth, users,
    roaming, rate-limiting, messaging, notifications — **live**; others mocked).
  - **Permission-based RBAC** enforced edge + service; **Keycloak** realm as config-as-code.
  - **Rate limiter** — atomic Redis token bucket, single round-trip Lua, fail-open.
  - **Roaming analytics** over a **~39k-row real dataset**; anomaly detection with explainable scores.
  - **Observability** — metrics/logs/traces correlated; live gateway metrics via Prometheus API.
  - **Real-time** — native WebSocket notifications.
- Design: **Metrics band** — big-number stat cards (9 services · 39k data rows · 4 roles · 16 permissions ·
  13 roaming endpoints). Impact at a glance.

**Slide 10.2 — Benchmarks / KPIs**
- Content (fill with your measured figures before submitting — **⚠️ placeholders**):
  - Registration throughput target **≥ 50 concurrent**, no error (PERF-01).
  - PDU-session establishment **p95 ≤ 500 ms** under load (PERF-02).
  - Anomaly alert within **≤ 10** IMSI-enumeration probes (SEC-03).
  - Rate-limiter decision latency (single Redis round-trip) — measure and report.
  - Gateway request rate / %2xx / %5xx from the live `/api/metrics/overview`.
- Design: **Bar/line charts** (reuse the app's own chart style for consistency). Target vs achieved
  columns. Clearly mark any number you haven't measured yet — don't fabricate.

**Slide 10.3 — Conformance & fault testing (roadmap evidence)**
- Content: TC-01→PERF-02 conformance cases (registration, 5G-AKA, PDU session, dereg, handover) +
  SEC-01/02 (mTLS reject, token scope 403) + fault-injection scenarios (NF crash, cert expiry, UPF partition).
- Design: **Test matrix** (Case | Procedure | Pass criterion | Status). Mark Done/Planned honestly.

---

## 11 — Conclusion & Outlooks

**Slide 11.1 — Conclusion**
- Content:
  - Built a coherent, working **cloud-native harness**: discovery, secured single entry point,
    standards-based auth, decoupled permission RBAC, real business services (auth, roaming, messaging,
    rate-limiting), and end-to-end observability.
  - Turned repetitive platform groundwork into a **solved baseline**; the contribution is the
    **security + observability + analytics** layers around a real 5G core.
- Design: 3–4 takeaway bullets + one summary graphic (the 3-layer chip strip, now all "delivered/started").

**Slide 11.2 — Outlooks / future work**
- Content:
  - **Zero-Trust (Layer 01):** free5GC SBI TLS + NRF OAuth2, mTLS + NetworkPolicies via Cilium/Istio, PKI.
  - **Anomaly (Layer 02):** move anomaly-detection-service onto real free5GC signalling; swap heuristics
    for ML (isolation forest / LSTM).
  - **Conformance (Layer 03):** scenario runner driving UERANSIM, CI/CD-gated regression, fault injection.
  - **Data redesign:** re-point roaming analytics onto the 6 real `Data/Data` entities.
  - **Hardening:** secrets manager, TLS, HA Keycloak/Eureka, Redis-backed token stores, K8s wiring.
- Design: **Roadmap timeline / phase strip** (Phase 0 host → Phase 5 package). Distinguish "done" vs
  "next". End on ambition, grounded in a concrete plan.

---

## 12 — Q&A

**Slide 12.1 — Thank you / Q&A**
- Content: "Thank you — Questions?"; your contact; repo/demo pointer; a compact architecture thumbnail.
- Design: Clean closing slide, Huawei-red, architecture mini-map watermark. Keep an **appendix** behind
  it (ports table, ADR index, glossary, permission matrix, dataset schema) to answer deep questions.

---

## 📎 Appendix slides (keep hidden, pull up on demand)

- **A · Glossary** — 5G/telecom + platform terms (NF, SBI, NRF/AMF/SMF/UPF/AUSF/UDM, PLMN, IMSI,
  TAP/RAP, PERM_*, RBAC).
- **B · Ports & URLs** — full port table (8761/9000/9001–9007, Keycloak 8081, Prometheus 9090,
  Grafana 3000, Loki 3100, Tempo, per-service Postgres 5433–5438, roaming MySQL 3307, Redis 6379/6380).
- **C · ADR index** — ADR-01→ADR-14 one-liners (tracing backend, RBAC, db-per-service, retired gateway
  limiter, WebSocket notifications, free5GC substrate…).
- **D · Dataset schema** — the 6 CSV tables, row counts, join keys.
- **E · References** — 3GPP TS 23.502 / TS 33.501, Spring Cloud, Keycloak, free5GC, UERANSIM, OpenTelemetry.

---

## ✅ Before you submit — checklist
- [ ] Replace **⚠️ placeholder KPI numbers** (Slide 10.2) with real measured figures.
- [ ] Fill the title-slide blanks (supervisors, institution, exact period).
- [ ] Export fresh **screenshots** of the running console (Slide 9.2) and Grafana (Slide 10.x).
- [ ] Regenerate architecture diagrams so they include all **9 services** (`Noted/diagram/` predates
      services 9003–9007).
- [ ] Rehearse the **live demo** as a backup to screenshots (login → roaming anomalies → rate-limit test →
      messaging notification).
- [ ] Tag each feature **Done ✅ / Roadmap 🚧** honestly — a jury respects a clear scope line.
```
