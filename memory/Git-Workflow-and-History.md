---
title: Git Workflow and History
tags: [git, workflow, important]
updated: 2026-08-07
---

# Git Workflow and History

## ⚠️ Golden rule
**The user commits and pushes themselves.** Do NOT run `git commit` or `git push` unless
they explicitly ask. When work is ready, **give them the exact commands** to run.
Staging (e.g. `git checkout <branch> -- <path>`, `git rm`) is fine *when requested*, but
stop short of committing.

## Branches
- `main` — default / integration branch.
- `fix/ci-trivy-tag-and-code-scanning` — where the frontend was originally built; also has
  CI/Trivy changes.

## What happened this session (see [[Session-Log]] for detail)
1. Deleted all unit tests (only `GatewayServiceApplicationTests.java` existed) and later
   `Frontend/src/app/app.spec.ts`.
2. Deleted `.github/workflows/` (GitHub Actions) on the fix branch. Kept `.github/dependabot.yml`
   (Dependabot is not an Action).
3. Built the whole [[Frontend-Architecture|Angular console]] — this got committed on the
   fix branch.
4. User switched to `main`; `Frontend/src` wasn't there (frontend only existed on fix).
   **No data lost** — it was committed on `fix/ci-trivy-tag-and-code-scanning`.
5. Brought the frontend onto `main` with `git checkout fix/ci-trivy-tag-and-code-scanning -- Frontend/`
   → files are **staged but NOT committed** (user commits themselves).
6. On `main`, the user is removing `.github/workflows/` themselves (command given, not run).
7. Built `roaming-analysis-service` on `main` (new files + edits to root `pom.xml` and
   gateway `application.yml`) — all **uncommitted**, waiting for the user to commit.
   See [[Roaming-Analysis-Service]].

## Uncommitted work currently on `main` (for the user to commit)
- `Frontend/` — the whole Angular console (staged earlier).
- `memory/` + `PROJECT_MEMORY.md` — this vault.
- `microservices/roaming-analysis-service/` + edits to `pom.xml` and
  `spring-cloud/gateway-service/.../application.yml`.
- Deletion of `.github/workflows/` (once the user runs it).

## Handy commands to hand the user
```bash
# See state
git status
git diff --cached

# Commit staged frontend (example)
git commit -m "feat(frontend): add role-based 5GC console UI"

# Remove GitHub Actions
git rm -r .github/workflows

# Unstage but keep files
git restore --staged Frontend/
```

## Commit message convention
Conventional commits (`feat(...)`, `chore(ci): ...`, `fix(...)`). Co-author trailer used
when Claude authors commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Related notes
- [[Session-Log]]
- [[Next-Steps]]
