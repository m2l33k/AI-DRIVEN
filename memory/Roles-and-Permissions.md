---
title: Roles and Permissions
tags: [roles, keycloak, security]
updated: 2026-08-07
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

## Full permission set (client `platform-client`)
`users:read/write`, `roles:read/write`, `platform-config:read/write`, `nf:read/restart`,
`core-config:read/write`, `security-alerts:read`, `roaming-events:read`,
`detection-rules:read/write`, `audit:read/delete`.

## Demo users
All have password `password`. `admin-user` → PLATFORM_ADMIN, plus one user per other role.

## Related notes
- [[Frontend-Components]] — each role's pages map to these permissions
- [[Project-Overview]]
