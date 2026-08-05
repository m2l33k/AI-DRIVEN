# Noted — Documentation Set

Complete documentation for the **Auth Management System** Spring Cloud microservices starter.

## Contents

| Path | What it is |
|------|-----------|
| [`README.md`](README.md) | **Deep-dive documentation** — architecture, modules, full auth/RBAC workflow, running the platform, end-to-end curl walkthrough, and how to extend it |
| [`uml/`](uml/) | **UML diagrams** (PlantUML `.puml` + a GitHub-renderable Mermaid mirror) |
| [`uml/README.md`](uml/README.md) | Index of the diagrams and how to render them |
| [`uml/diagrams.mermaid.md`](uml/diagrams.mermaid.md) | All diagrams in Mermaid — renders inline on GitHub |
| [`report/report.md`](report/report.md) | **Project report** with the **"Starter"** chapter (objectives, design, decisions, trade-offs) |

## Suggested reading order

1. `report/report.md` → *Chapter 1 — Starter* for the why and the design.
2. `README.md` for the concrete how (endpoints, config, running).
3. `uml/` for the visual model.

## The system in one paragraph

A Spring Boot 4 / Spring Cloud starter that stands up service discovery (Eureka), a single
secured API gateway (Spring Cloud Gateway), Keycloak-backed OAuth2/OIDC authentication, and a
**permission-based RBAC** model enforced on `PERM_*` authorities at the edge and inside
services. A working **auth-service** demonstrates the pattern (login + user management via the
Keycloak Admin API), and the whole platform is instrumented with Prometheus, Grafana, Loki,
Tempo, and OpenTelemetry, runnable via Docker Compose or Kubernetes/Tilt.
