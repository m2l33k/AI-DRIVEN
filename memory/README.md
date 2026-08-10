---
title: Memory Vault — Home
tags: [index, moc]
updated: 2026-08-10
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
- [[Frontend-Architecture]] — Angular app: stack, structure, routing, design system
- [[Frontend-Components]] — detailed, file-by-file breakdown of every UI component

**Backend & infra**
- [[Backend-and-Infra]] — microservices, Keycloak, observability, infra tooling
- [[Ports-and-URLs]] — quick reference: every port, URL, and key endpoint
  - [[Auth-Service]] — login state machine, first-login, OTP reset, user mgmt (port 9001)
  - [[Roaming-Analysis-Service]] — roaming events + risk scoring API (port 9002)
  - [[Platform-Services]] — 4 new placeholder services: anomaly/rate-limit/tracing/fault (9003–9006)

**Process**
- [[Git-Workflow-and-History]] — branches, what was deleted, commit rules ⚠️
- [[Session-Log]] — chronological log of what we did each session
- [[Next-Steps]] — open threads and the backlog

## ⚠️ Golden rules

1. **The user commits/pushes themselves.** Never run `git commit` / `git push` unless
   explicitly asked — give the commands instead. See [[Git-Workflow-and-History]].
2. Read [[Project-Overview]] + [[Frontend-Architecture]] before touching code.
3. When you finish a change, update the matching note and add an entry to [[Session-Log]].
