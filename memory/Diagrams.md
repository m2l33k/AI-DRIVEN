---
title: Diagrams
tags: [reference, diagrams, architecture]
updated: 2026-08-10
---

# Diagrams

Where the visual model of the system lives, and which is current.

## Current source of truth — `Noted/diagram/`
PlantUML added 2026-08-10, reflects the real `docker/docker-compose-*.yml` + all services:
- `Noted/diagram/infrastructure.puml` — end-to-end deployment topology on the Docker
  `shared-network` (client → gateway → microservices → identity → data stores → observability).
- `Noted/diagram/services.puml` — service catalogue grouped by tier, with ports + source paths.
- `Noted/diagram/README.md` — render instructions + a full service table.
- Rendered images in `Noted/Assets/`: `infra 5GC.png`, `service infra.svg` (embedded in the root
  `README.md` and the diagram README).

> ⚠️ These diagrams currently show the platform **before** the four new placeholder services
> ([[Platform-Services]]) were added. Regenerate/extend them to include anomaly-detection (9003),
> rate-limiting (9004), distributed-tracing (9005), fault-injection (9006).

## Older diagrams — `Noted/uml/`
`deployment.puml`, `component.puml`, plus sequence/class/RBAC diagrams and a Mermaid mirror
(`diagrams.mermaid.md`). These predate the roaming service and MySQL — **auth-service only**.
Keep for the login/RBAC sequences; use `Noted/diagram/` for infra.

## How to render
- VS Code PlantUML extension → `Alt+D`.
- CLI: `plantuml Noted/diagram/*.puml`.
- Online: <https://www.plantuml.com/plantuml>.

## Related notes
- [[Backend-and-Infra]] · [[Platform-Services]] · [[Ports-and-URLs]] · [[Project-Overview]]
