---
title: Memory Vault — Home
tags: [index, moc]
updated: 2026-09-10
---

# 🗄️ Memory Vault

Open this folder as an **Obsidian vault** (`Open folder as vault` → select `memory/`).
Every note is Markdown with `[[wiki-links]]`, so use the Graph View to navigate.

> Purpose: capture **everything we do** in detail so the codebase never has to be
> re-read from scratch. Update the relevant note whenever something changes.

## 🗺️ Map of content

**Big picture**
- [[Project-Overview]] — what this system is, the big picture
- [[Architecture-Decisions]] — the *why* behind the design (ADRs) — read before changing things
- [[Glossary]] — 5G/telecom + platform terms (PLMN, NF, RBAC, `PERM_*`…)
- [[Diagrams]] — where the visual model lives (`Noted/diagram/`) and which is current

**Roles & frontend**
- [[Roles-and-Permissions]] — the 4 Keycloak roles and what each can do
- [[Frontend-Architecture]] — Angular app: stack, structure, routing, design system (updated 2026-09-15)
- [[Frontend-Components]] — detailed, file-by-file breakdown of every UI component (updated 2026-09-15)

**Backend & infra**
- [[Backend-and-Infra]] — microservices, Keycloak, observability, infra tooling (updated 2026-09-15)
- [[All-Endpoints]] — **complete API endpoint catalogue** for every service (NEW 2026-09-15)
- [[Ports-and-URLs]] — quick reference: every port, URL, and key endpoint (updated 2026-09-15)
- [[Grafana-Dashboards]] — detailed dashboard design (NF KPIs, security/anomaly, zero-trust, D6)
- [[Scripts-and-Tooling]] — every helper script + compose file, and which are stale ⚠️
  - [[Auth-Service]] — login state machine, first-login, OTP reset, user mgmt (port 9001)
  - [[Roaming-Analysis-Service]] — roaming events + risk scoring API (port 9002)
  - [[Platform-Services]] — 4 placeholder services: anomaly/rate-limit/tracing/fault (9003–9006)
  - [[Messaging-Service]] — direct messaging between users (port 9007, `/api/messages`)
  - [[ML-Forecasting-Service]] — Django LSTM+Prophet+ARIMA forecasting service (port 8000, Docker only)
  - [[5GC-Core]] — **free5GC** as the real 5G Core substrate + UERANSIM; this repo = the harness (ADR-13)
  - [[Zero-Trust-Phase2]] — SBI TLS + NRF OAuth2 inside free5GC; SEC-01 / SEC-02 demo scenarios; impact analysis
  - [[Phase3-Attack-Scenarios]] — UERANSIM registration flood (ATK-01) + IMSI enumeration (ATK-02); live anomaly detection; dashboard visuals
  - fivegc-service (port 9008) — 5GC proxy + **VM MongoDB console** (see [[Backend-and-Infra]])

**Docs & process**
- [[Proposal-Internship]] — the full internship proposal (Cloud-Native 5G Core; 3 differentiating layers)
- [[Presentation]] — the academic / internship defense deck (`Noted/PRESENTATION.md`)
- [[Git-Workflow-and-History]] — branches, what was deleted, commit rules ⚠️
- [[Session-Log]] — chronological log of what we did each session
- [[Next-Steps]] — open threads and the backlog (updated 2026-09-15)
- [[report]] — full structured content for drafting the PFE technical report

## ⚠️ Golden rules

1. **The user commits/pushes themselves.** Never run `git commit` / `git push` unless
   explicitly asked — give the commands instead. See [[Git-Workflow-and-History]].
2. Read [[Project-Overview]] + [[Frontend-Architecture]] before touching code.
3. When you finish a change, update the matching note and add an entry to [[Session-Log]].
