---
title: Session Log
tags: [log, journal]
updated: 2026-08-07
---

# Session Log

Chronological record of what we did. Newest first. Add an entry whenever you finish
something meaningful.

## 2026-08-07

### Roaming Analysis Service (backend)
- Built `microservices/roaming-analysis-service` (port 9002) mirroring `auth-service`
  conventions: resource server, `PERM_roaming-events:read`, actuator/prometheus, eureka,
  springdoc, Dockerfile + k8s manifests.
- Domain/repo/analysis/service/web layers; in-memory seeded events + `RiskAnalyzer` scoring.
- API: `/api/roaming/events`, `/events/{id}`, `/summary`, `/partners`.
- Registered module in root `pom.xml`; added gateway routes (default + docker) + Swagger entry.
- Verified: `mvnw -pl microservices/roaming-analysis-service compile` → success.
- Full detail: [[Roaming-Analysis-Service]].

### Memory vault created
- Created this `memory/` folder as an **Obsidian vault** with detailed notes:
  [[README]], [[Project-Overview]], [[Roles-and-Permissions]], [[Frontend-Architecture]],
  [[Frontend-Components]], [[Backend-and-Infra]], [[Git-Workflow-and-History]],
  [[Session-Log]], [[Next-Steps]].
- (A short root pointer `PROJECT_MEMORY.md` also exists at the repo root.)

### Frontend build — role-based 5GC console
- Discovered the 4 Keycloak roles from `keycloak/platform-realm.json` (see [[Roles-and-Permissions]]).
- Built a Huawei-console-styled Angular 22 app in `Frontend/`:
  design system in `styles.css`; dependency-free SVG charts; reusable `role-shell`;
  shared `auth/` (login + reset-password) and `errors/` (404 + 500); one folder per role
  with layout + dashboard + feature pages. Full detail in [[Frontend-Components]].
- Wired lazy routes in `app.routes.ts`; simplified root `app.ts` to `<router-outlet/>`.
- `npm run build` → clean, ~236 kB initial bundle.

### Git housekeeping
- Removed unit tests + `.github/workflows/` (GitHub Actions). Kept `dependabot.yml`.
- Frontend was committed on `fix/ci-trivy-tag-and-code-scanning`; then staged onto `main`
  via `git checkout fix/... -- Frontend/` (not committed — user commits themselves).
- Added `Frontend/.gitignore` (Angular defaults: node_modules, dist, .angular/cache, …).
- See [[Git-Workflow-and-History]] for the full sequence.

## Related notes
- [[Next-Steps]]
