---
title: Git Workflow and History
tags: [git, workflow, important]
updated: 2026-08-14
---

# Git Workflow and History

## ⚠️ Golden rule
**The user commits and pushes themselves.** Do NOT run `git commit` or `git push` unless
they explicitly ask. When work is ready, **give them the exact commands** to run.
Staging (e.g. `git checkout <branch> -- <path>`, `git rm`) is fine *when requested*, but
stop short of committing.

## Branches
- `main` — default / integration branch (tracks `origin/main`). **All work below is committed here.**
- `fix/ci-trivy-tag-and-code-scanning` — legacy branch where the frontend was first built; also
  had CI/Trivy changes. Its content is now on `main`; kept for history.

## Current state (2026-08-14)
Working tree is **clean** except two **untracked personal files** the user dropped in:
`Noted/Assets/Ahmed HASSAYOUN.jpeg` and `Noted/Assets/CV_Ahmed_Hassayoun_Modern_Word_V2.docx`
(a CV — **not** project artefacts). Everything the earlier notes listed as "uncommitted" is now
committed. Consider `.gitignore`-ing or removing those two CV files rather than committing them.

## What's been committed (recent history, newest first)
```
8cf3206  feat: update the keycloak scripts to keep data (export/import realm)
ca7671f  fix: add the missing communication ports for the databases
0770071  feat: add the database for the new services (per-service Postgres/Redis)
116ca4a  docs: update the memory folder
4df1d76  feat: add the 4 placeholder services (health-check only, 9003–9006)
c2288ab  docs: update the readme file
0525b09  docs: update the memory doc + Noted/diagram for new services
9d66fb3  feat: add the roaming service + endpoints (9002)
ad9b01d  Frontend: metrics overview + endpoint fix
4121be3  feat: new endpoint to get metrics (gateway /api/metrics/overview)
...       (earlier: glassmorphism sidebar, roles matrix, dashboard, auth flows)
```
So on `main` today: the whole Angular console, `auth-service`, `roaming-analysis-service` + MySQL,
the four placeholder services + their per-service Postgres/Redis, Keycloak-on-Postgres + realm
export/import scripts, the gateway metrics endpoint, and this `memory/` vault — **all committed**.
See [[Session-Log]] for the per-feature detail.

## Historical note (2026-08-07 → 08-10, resolved)
The frontend was originally built on `fix/ci-trivy-tag-and-code-scanning`, then brought onto `main`
via `git checkout fix/... -- Frontend/` and later committed. `.github/workflows/` (GitHub Actions)
was removed; `.github/dependabot.yml` kept. Unit tests were removed project-wide (only
`GatewayServiceApplicationTests.java` + `Frontend/src/app/app.spec.ts` existed). None of this is
pending anymore — it's all in the history above.

## Handy commands to hand the user
```bash
git status
git diff --cached

# If they want to stop tracking the personal CV files
echo "Noted/Assets/CV_*" >> .gitignore
echo "Noted/Assets/Ahmed*.jpeg" >> .gitignore

# Example feature commit
git commit -m "docs(memory): refresh vault + add Scripts-and-Tooling note"
```

## Commit message convention
Conventional commits (`feat(...)`, `docs(...)`, `fix(...)`, `chore(ci): ...`). The repo's own
history uses a terse `type:message` style (e.g. `feat:add the database...`). Co-author trailer
when Claude authors a commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Related notes
- [[Session-Log]]
- [[Next-Steps]]
