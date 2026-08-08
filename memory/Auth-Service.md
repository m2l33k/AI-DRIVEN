---
title: Auth Service
tags: [backend, microservice, auth, keycloak, security]
updated: 2026-08-08
---

# Auth Service

Keycloak-backed authentication + user management API. The backend is a **thin layer** in front
of Keycloak — Keycloak stays the source of truth for passwords, policies, email verification,
required actions, sessions, and tokens. See [[Backend-and-Infra]] · [[Roles-and-Permissions]].

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
password, adds required actions `[VERIFY_EMAIL, UPDATE_PASSWORD]`, assigns the realm role, and calls
Admin API `send-verify-email` (non-fatal — logs if realm SMTP is unset). Returns the temp password;
`UserController` emails it via `MailService`. Login then drives: verify email → change password →
normal login.

## Self-service reset (OTP) flow
1. `/forgot-password` {email} → `OtpService` (in-memory, 6-digit, 10-min TTL, ≤5 attempts) + email.
2. `/verify-otp` {email, otp} → issues single-use `resetToken` (`ResetTokenService`, 10-min).
3. `/reset-password` {resetToken, newPassword} → sets a **permanent** password.

## Tokens/helpers (all in-memory — swap for Redis to survive restarts / scale)
- `otp/OtpService` — OTP codes keyed by email.
- `otp/ResetTokenService` — reset tokens → email (single-use).
- `otp/FirstLoginTokenService` — first-login tokens → username (single-use).

## Email (our SMTP, separate from Keycloak's)
- `spring-boot-starter-mail` + `mail/MailService` (`sendOtp`, `sendTemporaryPassword`).
- Config in `application.yml` `spring.mail.*` reading `MAIL_USERNAME` / `MAIL_PASSWORD` (Gmail App
  Password) from env. Repo-root `.env` (gitignored) is loaded by `run.sh` for local + docker;
  compose passes the vars through to the container. **App password must have no spaces.**
- Keycloak's **verify-email** is sent by Keycloak itself via **realm SMTP** — now wired to the
  **same Gmail account**: `platform-realm.json` has an `smtpServer` block with `${KC_SMTP_USER}` /
  `${KC_SMTP_PASSWORD}` placeholders; `docker-compose-infra.yml` passes `KC_SMTP_*` from `MAIL_*`
  and imports the realm (`--import-realm`, fresh instances only). For an **already-running** realm,
  run `keycloak/configure-smtp.ps1` (Windows) or `keycloak/configure-smtp.sh` (WSL/bash, needs
  `jq`) — both set it live via the Admin API, reading `.env`.

## Gotchas learned
- Temp/required-action accounts **cannot** use the direct password grant until cleared — that's the
  "Account is not fully set up" the login flow now translates instead of erroring.
- In Swagger, an old **Authorize** token is sent to public endpoints and causes 401 — log out first.

## TODO / next
- Keycloak realm SMTP is wired (same Gmail); run `keycloak/configure-smtp.ps1` against a
  running instance, then test in Realm settings → Email → Test connection.
- Move in-memory OTP/token stores to Redis if multi-instance.
- Wire the Angular login/reset screens to these endpoints (see [[Next-Steps]]).

## Related notes
- [[Backend-and-Infra]] · [[Roles-and-Permissions]] · [[Roaming-Analysis-Service]] · [[Next-Steps]] · [[Session-Log]]
