---
title: Auth Service
tags: [backend, microservice, auth, keycloak, security]
updated: 2026-08-15
---

# Auth Service

Keycloak-backed authentication + user management API. The backend is a **thin layer** in front
of Keycloak — Keycloak stays the source of truth for passwords, policies, email verification,
required actions, sessions, and tokens. See [[Backend-and-Infra]] · [[Roles-and-Permissions]].

> **✅ Full audit 2026-08-15** — re-read every auth-service class + the frontend `core/` and `auth/`
> screens against this note. **It matches the code** (endpoints, state-aware login, create-user
> `[VERIFY_EMAIL, UPDATE_PASSWORD]`, own email-verify flow, OTP reset, in-memory token services,
> username-or-email resolution). Verified extras worth noting: `updatePassword` checks the current
> password by **attempting a login** (throws "Current password is incorrect" on failure);
> `resetForgottenPassword` sets only `UPDATE_PASSWORD`; admin token = master-realm **`admin-cli`**
> password grant (`KeycloakProperties.admin*`). Quick token for testing: the **Bruno `AccessToken`**
> request (see [[Scripts-and-Tooling]]). The frontend wiring TODO is **done** (see [[Next-Steps]]).

- **Module:** `microservices/auth-service` · package `io.javatab.microservices.auth`
- **Port:** `9001` (gateway `9000`, eureka `8761`, roaming `9002`)
- Talks to Keycloak via the token endpoint (end-user password grant on `platform-client`) and the
  Admin REST API (master-realm `admin-cli` token) — wrapped by `keycloak/KeycloakService`.

## Endpoints (`/api/auth` + `/api/users`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | public | State-aware login — returns a `status`, see below |
| POST | `/api/auth/first-login/change-password` | public | Redeem first-login token → set password, clears `UPDATE_PASSWORD` |
| POST | `/api/auth/forgot-password` | public | Email a 6-digit OTP if the email maps to a user (no enumeration) |
| POST | `/api/auth/verify-otp` | public | Verify OTP → returns a single-use `resetToken` |
| POST | `/api/auth/reset-password` | public | Redeem `resetToken` + `newPassword` (permanent) |
| GET | `/api/auth/verify-email?token=` | public | Our own verify link → marks email verified in Keycloak + HTML page |
| PUT | `/api/auth/password` | bearer | Change own password (verifies current) |
| GET | `/api/users` | `PERM_users:read` | List realm users |
| POST | `/api/users` | `PERM_users:write` | Create user + emailed temp password (see below) |
| POST | `/api/users/{username}/reset-password` | `PERM_users:write` | Admin direct reset → temp password |
| DELETE | `/api/users/{username}` | `PERM_users:write` | Delete user |

**Both** the gateway (`gateway-service/config/SecurityConfig`, WebFlux) and auth-service
(`config/SecurityConfig`, servlet) must whitelist a public path — the gateway is the common gotcha
(returns 401 `Bearer` before reaching the service if a path isn't permitted, or if a stale bearer
token is sent to a permitAll path).

## State-aware login (the key design)
`POST /api/auth/login` sends credentials to Keycloak, then interprets the result:

- **SUCCESS** → `{status, accessToken, refreshToken, expiresIn}`
- **EMAIL_VERIFICATION_REQUIRED** → `{status, message}` (no tokens)
- **PASSWORD_CHANGE_REQUIRED** → `{status, message, firstLoginToken}`

Mechanism: Keycloak's password grant returns `invalid_grant` / **"Account is not fully set up"**
only *after* the password is accepted (so valid credentials are implied). `AuthService` catches
that, inspects the account via Admin API (`UserState` = emailVerified + requiredActions), and maps:
`VERIFY_EMAIL`/unverified → email case; else `UPDATE_PASSWORD` → password case (issues a
`firstLoginToken`). Any other error (bad credentials) is surfaced as-is (401). `LoginResponse` uses
`@JsonInclude(NON_NULL)` so each case only carries relevant fields.

## Account creation flow
`KeycloakService.createUser`: creates the user with `emailVerified=false`, sets a **temporary**
password, adds required actions `[VERIFY_EMAIL, UPDATE_PASSWORD]`, assigns the realm role, returns
the temp password. `UserController` then sends **two emails via our own `MailService`**: the temp
password, and a verification link (`EmailVerificationService`). Login drives: verify email → change
password → normal login.

## Email verification — our own flow (no Keycloak UI)
Keycloak's `send-verify-email` shows Keycloak's themed pages, so we don't use it. Instead:
`EmailVerificationService.sendVerificationEmail` issues a 24h single-use token
(`EmailVerificationTokenService`) and emails `${app.verify-email-url}?token=...` (default
`http://localhost:9000/api/auth/verify-email`). `GET /api/auth/verify-email` consumes the token,
calls `KeycloakService.markEmailVerified` (Admin API sets `emailVerified=true` + drops
`VERIFY_EMAIL`), and renders our own confirmation page. **Keycloak realm SMTP is now unused** for
this (we send it) — it's still configured but only matters if you later use Keycloak-native emails.

## Self-service reset (OTP) flow
1. `/forgot-password` {email} → `OtpService` (in-memory, 6-digit, 10-min TTL, ≤5 attempts) + email.
2. `/verify-otp` {email, otp} → issues single-use `resetToken` (`ResetTokenService`, 10-min).
3. `/reset-password` {resetToken, newPassword} → sets a **permanent** password.

## Tokens/helpers (all in-memory — swap for Redis to survive restarts / scale)
- `otp/OtpService` — OTP codes keyed by email.
- `otp/ResetTokenService` — reset tokens → email (single-use).
- `otp/FirstLoginTokenService` — first-login tokens → username (single-use).
- `otp/EmailVerificationTokenService` — email-verify tokens → username (24h, single-use).

## Misc backend notes
- **Login scope** is `openid profile email roles`, so the JWT carries `name` + `email` (the frontend
  shell shows them). Realm role names → `ROLE_*`, `platform-client` perms → `PERM_*`.
- **`listUsers`** maps Keycloak's `createdTimestamp` into `UserSummary` (used by the admin dashboard's
  user-growth curve). Brief representation includes it.

## Keycloak persistence (added 2026-08-10)
Keycloak is now backed by a **dedicated Postgres** (`keycloak-postgres`, host 5437, DB
`keycloak_db`) with a named volume — **not** the old ephemeral embedded H2. So users + realm
changes survive `infra.sh down` (only `down -v` wipes them). See ADR-10 in [[Architecture-Decisions]].
**Config-as-code:** run `keycloak/export-realm.{ps1,sh}` after realm changes to dump the realm
(incl. users) into `platform-realm.json` (re-imported on a fresh DB). Caveat: restore the
`${KC_SMTP_*}` placeholders after export before committing. See [[Ports-and-URLs]].

## Email (our SMTP, separate from Keycloak's)
- `spring-boot-starter-mail` + `mail/MailService` (`sendOtp`, `sendTemporaryPassword`).
- Config in `application.yml` `spring.mail.*` reading `MAIL_USERNAME` / `MAIL_PASSWORD` (Gmail App
  Password) from env. Repo-root `.env` (gitignored) is loaded by `run.sh` for local + docker;
  compose passes the vars through to the container. **App password must have no spaces.**
- Both account-creation emails (temp password + verification link) are sent by **our** SMTP.
- Keycloak realm SMTP was wired to the same Gmail (`platform-realm.json` `smtpServer` placeholders +
  `docker-compose-infra.yml` `KC_SMTP_*` + `keycloak/configure-smtp.{ps1,sh}`), but is **no longer
  required** now that we own the verification flow — keep it only for future Keycloak-native emails.

## Gotchas learned
- **Login accepts username *or* email** (email login enabled), so `KeycloakService.userId()` resolves
  by username first, then falls back to email — otherwise state/first-login lookups threw
  "User not found" for users who logged in with their email.
- Temp/required-action accounts **cannot** use the direct password grant until cleared — that's the
  "Account is not fully set up" the login flow now translates instead of erroring.
- In Swagger, an old **Authorize** token is sent to public endpoints and causes 401 — log out first.

## TODO / next
- Move in-memory OTP/token stores to Redis if multi-instance.
- Optional: a `GET /api/roles` (or per-role user counts) so the dashboard/roles UI can be live
  rather than a static mirror; and roles in `UserSummary` for a real "Users by role" chart.
- ✅ Angular login / first-login / reset / users / dashboard wired (see [[Frontend-Architecture]]).

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Roaming-Analysis-Service]] · [[Next-Steps]] · [[Session-Log]]
