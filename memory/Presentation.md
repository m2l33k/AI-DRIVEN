---
title: Presentation (academic / internship)
tags: [reference, docs, presentation, academic]
updated: 2026-08-14
---

# Presentation

The **academic / internship presentation** for this project lives at **`Noted/PRESENTATION.md`**
(indexed in `Noted/INDEX.md`). It's the full defense outline, grounded in this codebase — not
generic filler.

## What it is
A Huawei internship / academic-defense document framing the platform as a **5G Core (5GC) network
management platform** built in the context of the **Tunisie Telecom (TT)** 5G Core project.

## Structure (8 parts + intro + appendices)
Introduction & Context (Huawei, department, project context, problem statement) → 1. Project
Overview → 2. Existing System Study → 3. Design & Architecture → 4. Implementation → 5. Results &
Evaluation → 6. Contributions → 7. Future Perspectives → 8. Conclusion. **Full-detail edition** —
speaker-note depth with tables, the NF reference + 5GC↔platform mapping, the permission matrix, the
auth state machine, the roaming endpoint table + risk-scoring formula, container/ports estate, and
**appendices** (A glossary · B ports · C ADR index · D references).

## Sourcing / accuracy
Content is drawn from the vault, so keep them in sync if the system changes:
- Architecture / services → [[Project-Overview]] · [[Backend-and-Infra]] · [[Platform-Services]]
- 5GC ↔ platform mapping, technology choices → [[Architecture-Decisions]] (ADRs) · [[Glossary]]
- Roles / auth flows → [[Roles-and-Permissions]] · [[Auth-Service]]
- Roaming analytics → [[Roaming-Analysis-Service]]
- Deploy / scripts → [[Scripts-and-Tooling]] · [[Ports-and-URLs]]
- Diagrams referenced by the deck → [[Diagrams]] (`Noted/diagram/` + `Noted/Assets/`)

## ⚠️ Before submitting
- Fill the **«angle-bracket» placeholders** (name, institution, supervisors, period, real KPI figures).
- The deck references `Noted/diagram/` images that still predate the four placeholder services
  (9003–9006) — regenerate them (tracked in [[Next-Steps]] / [[Diagrams]]).

## Related notes
- [[Diagrams]] · [[Project-Overview]] · [[Architecture-Decisions]] · [[Next-Steps]]
