---
title: Next Steps
tags: [todo, backlog]
updated: 2026-08-08
---

# Next Steps

Open threads and backlog. Check items off / move them to [[Session-Log]] when done.

## Immediate (user's hands)
- [x] Commit the staged `Frontend/` on `main` (user commits themselves — see [[Git-Workflow-and-History]]).
- [x] Remove `.github/workflows/` on `main` (`git rm -r .github/workflows`), then commit.

## Frontend — integration (currently UI-only)
- [ ] Replace the login demo role picker with **real Keycloak auth** (OIDC / `keycloak-js`
      or `angular-oauth2-oidc`).
- [ ] Add **per-role route guards** (map realm roles → `/admin`, `/operator`, `/security`, `/audit`).
- [ ] Wire pages to **real APIs** via the Spring Cloud Gateway.
- [ ] Global HTTP error handling → route to `/error/500`; 404 already handled by `**`.
- [ ] Decide: keep inline templates/styles or split into `.html`/`.css` files.

## Frontend — polish (optional)
- [ ] Responsive pass on tables for small screens.
- [ ] Loading / empty / error states once data is real.
- [ ] i18n (login already hints at en/fr/ar).

## Auth Service (see [[Auth-Service]])
- [x] Wire **Keycloak realm SMTP** to the same Gmail (realm JSON `smtpServer` + compose `KC_SMTP_*`
      + `keycloak/configure-smtp.ps1` for live instances). ← still: run it + test delivery.
- [ ] Move in-memory OTP / reset-token / first-login-token stores to **Redis** if multi-instance.
- [ ] Wire the Angular **login / reset-password / first-login** screens to the new endpoints
      (handle the 3 `LoginResponse.status` cases).
- [ ] Decide whether created users verify email via Keycloak's link or a custom flow.

## Roaming Analysis Service (see [[Roaming-Analysis-Service]])
- [ ] Replace in-memory repo with JPA + Postgres (or a streaming/event source).
- [ ] Wire the frontend Roaming Events page to `/api/roaming/*`.
- [ ] Add integration tests once the project reintroduces a test strategy.

## Docs / memory
- [ ] Flesh out [[Backend-and-Infra]] once we explore the microservices.

## Related notes
- [[Frontend-Architecture]]
- [[Session-Log]]
