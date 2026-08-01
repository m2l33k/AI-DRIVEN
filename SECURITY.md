# Security & Access Control

This platform uses **Keycloak** (OAuth2/OIDC) for authentication and a **permission-based
RBAC** model for authorization, enforced at the API gateway.

## Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| `PLATFORM_ADMIN` | Manage users, roles, platform config | Operate the 5GC |
| `NETWORK_OPERATOR` | View NF status, restart NFs, apply config to the core | Manage users, delete audit logs |
| `SECURITY_ANALYST` | View security alerts, roaming events, tune detection rules | Change network config |
| `AUDITOR` | Read everything, including audit logs | Write anything, anywhere |

## Permission model

Roles are **not** enforced by name. Each role is a Keycloak *composite* realm role that
aggregates fine-grained **permissions**, defined as client roles on the `platform-client`
client. Services authorize on permissions, so roles can be re-sliced without code changes.

### Permission catalog

| Resource | Permissions |
|----------|-------------|
| IAM — users | `users:read`, `users:write` |
| IAM — roles | `roles:read`, `roles:write` |
| Platform config | `platform-config:read`, `platform-config:write` |
| Network Functions | `nf:read` (status), `nf:restart` (lifecycle) |
| 5GC core config | `core-config:read`, `core-config:write` (apply to core) |
| Security | `security-alerts:read`, `roaming-events:read`, `detection-rules:read`, `detection-rules:write` |
| Audit logs | `audit:read`, `audit:delete` |

### Role → permission mapping

| Permission | PLATFORM_ADMIN | NETWORK_OPERATOR | SECURITY_ANALYST | AUDITOR |
|---|:--:|:--:|:--:|:--:|
| users:read / users:write | ✅ / ✅ | — | — | ✅ / — |
| roles:read / roles:write | ✅ / ✅ | — | — | ✅ / — |
| platform-config:read / write | ✅ / ✅ | — | — | ✅ / — |
| nf:read | — | ✅ | — | ✅ |
| nf:restart | — | ✅ | — | — |
| core-config:read / write | — | ✅ / ✅ | — | ✅ / — |
| security-alerts:read | — | — | ✅ | ✅ |
| roaming-events:read | — | — | ✅ | ✅ |
| detection-rules:read / write | — | — | ✅ / ✅ | ✅ / — |
| audit:read | — | — | — | ✅ |
| audit:delete | — | — | — | — |

**`audit:delete` is granted to no role by design** — audit logs are append-only/tamper-evident.
Retention/purge, if ever needed, must be an out-of-band job (DB TTL/archival), not a UI action.

## How it is enforced

1. **Keycloak** issues a JWT. `realm_access.roles` carries the role (e.g. `AUDITOR`);
   `resource_access.platform-client.roles` carries the effective permissions
   (e.g. `audit:read`) via the composite role.
2. **Gateway** (`SecurityConfig.java`) converts the token to authorities:
   - realm roles → `ROLE_<NAME>` (e.g. `ROLE_AUDITOR`)
   - `platform-client` permissions → `PERM_<permission>` (e.g. `PERM_nf:restart`)
3. Route rules authorize on `PERM_*` authorities, splitting read vs. write by HTTP method.
   Adjust the path matchers as downstream 5GC services are added behind the gateway.

## Realm & test users

Import `keycloak/platform-realm.json` into Keycloak (realm `course-management-realm`).
It defines the four roles, the `platform-client` client (secret `platform-client-secret`),
and one user per role (password `password`):

| User | Role |
|------|------|
| `admin-user` | PLATFORM_ADMIN |
| `operator-user` | NETWORK_OPERATOR |
| `analyst-user` | SECURITY_ANALYST |
| `auditor-user` | AUDITOR |

### Get a token

```bash
curl -X POST http://localhost:8081/realms/course-management-realm/protocol/openid-connect/token \
  -d grant_type=password \
  -d client_id=platform-client \
  -d client_secret=platform-client-secret \
  -d username=operator-user -d password=password \
  -d scope="openid roles"
```

Then call the gateway with `Authorization: Bearer <token>`. For example, `operator-user`
can `POST /api/nf/{id}/restart` but is denied `GET /api/users`; `auditor-user` can
`GET /api/audit` but is denied any write.

> Change the client secret and the default passwords before any non-local use.
