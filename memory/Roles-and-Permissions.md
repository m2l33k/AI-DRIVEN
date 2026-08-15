---
title: Roles and Permissions
tags: [roles, keycloak, security]
updated: 2026-08-14
---

# Roles and Permissions

**Source of truth:** `keycloak/platform-realm.json` (realm roles + client permissions on
client `platform-client`). These 4 realm roles drive the whole [[Frontend-Architecture|frontend]].

## The 4 roles

### 🔴 PLATFORM_ADMIN
> Manage users, roles, platform config. **Cannot operate the 5GC.**
- `users:read`, `users:write`
- `roles:read`, `roles:write`
- `platform-config:read`, `platform-config:write`
- Frontend accent colour: `#c7000b` (Huawei red)

### 🔵 NETWORK_OPERATOR
> View NF status, restart NFs, apply config to the core. **Cannot manage users or delete audit logs.**
- `nf:read`, `nf:restart`
- `core-config:read`, `core-config:write`
- Frontend accent colour: `#3491fa`

### 🟢 SECURITY_ANALYST
> View security alerts & roaming events, tune detection rules. **Cannot change network config.**
- `security-alerts:read`
- `roaming-events:read`
- `detection-rules:read`, `detection-rules:write`
- Frontend accent colour: `#00a870`

### 🟠 AUDITOR
> Read everything, including audit logs. **Cannot write anything.**
- `users:read`, `roles:read`, `platform-config:read`
- `nf:read`, `core-config:read`
- `security-alerts:read`, `roaming-events:read`, `detection-rules:read`
- `audit:read`
- Frontend accent colour: `#ff8f1f`

## Notable permission
- `audit:delete` — defined but **granted to nobody by design** (audit logs are immutable).
- **`/api/users/directory`** (2026-08-15) — a `{username, name}` directory readable by **any
  authenticated user** (no `users:read`), for the messaging recipient search. `/api/messages/**` is
  likewise open to any authenticated user (sender taken from the JWT). See [[Messaging-Service]].

## Full permission set (client `platform-client`)
`users:read/write`, `roles:read/write`, `platform-config:read/write`, `nf:read/restart`,
`core-config:read/write`, `security-alerts:read`, `roaming-events:read`,
`detection-rules:read/write`, `audit:read/delete`.

## rate-limiting-service reuses existing perms (no realm change — 2026-08-14)
The rate-limiting-service (`/api/protection/*`) deliberately **reuses existing permissions** so the
realm JSON / Keycloak is untouched:
- **reads** (`/check`, GET `/policies`, `/stats`) → **`roaming-events:read`** (SECURITY_ANALYST +
  AUDITOR hold it via realm composites).
- **writes** (`PUT`/`DELETE /policies`) → **`detection-rules:write`** (**SECURITY_ANALYST only**).
So `analyst-user` (SECURITY_ANALYST, pw `password`) can call every protection endpoint incl. writes.
See [[Platform-Services]].

> ⚠️ **PLATFORM_ADMIN cannot manage rate-limit policies** (verified 2026-08-15 via a real 403): the
> admin's `platform-client` roles are only `users:*`, `roles:*`, `platform-config:*` — **not**
> `roaming-events:read` or `detection-rules:write`. Rate limiting is a SECURITY_ANALYST concern by
> design; use `analyst-user` to test. (Realm composite for SECURITY_ANALYST includes
> `security-alerts:read`, `roaming-events:read`, `detection-rules:read`, `detection-rules:write`.)

## Frontend gating + gateway enforcement (2026-08-15)
- **Frontend gating:** `AuthService.hasPermission(p)` decodes the JWT's `platform-client` roles;
  the Rate Limiting page only shows policy **create/edit/delete** when `detection-rules:write` is
  present (defence-in-depth — the backend still enforces; a bypass gets a 403 surfaced in the UI).
- **Gateway rate-limit enforcement:** was briefly added (a `RateLimitGlobalFilter` applying policies
  to all downstream traffic) then **reverted** the same day — it slowed the hot path (ADR-11 retired).
  Rate limiting is now **advisory only** via the standalone service's `/check`; RBAC (`PERM_*`) is
  unchanged and remains the gateway's authorization mechanism.

## Demo users
All have password `password`. `admin-user` → PLATFORM_ADMIN, plus one user per other role.

## Related notes
- [[Frontend-Components]] — each role's pages map to these permissions
- [[Project-Overview]]
