---
title: All API Endpoints
tags: [reference, api, endpoints]
updated: 2026-09-15
---

# All API Endpoints

Complete catalogue of every REST endpoint in the platform, grouped by service.
All paths are relative to the gateway base `http://localhost:9000` (or proxied through Angular at `:4200/api/...`).

## Auth Service (`/api/auth/**`, `/api/users/**`) — port 9001

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login. Returns `{status, token, refreshToken, role}`. Status: `SUCCESS`, `PASSWORD_CHANGE_REQUIRED`, `EMAIL_VERIFICATION_REQUIRED` |
| POST | `/api/auth/first-login/change-password` | Public | Force-change password on first login |
| POST | `/api/auth/forgot-password` | Public | Send OTP to email |
| POST | `/api/auth/verify-otp` | Public | Verify OTP code |
| POST | `/api/auth/reset-password` | Public | Set new password after OTP |
| PUT | `/api/auth/password` | Bearer | Change own password (from profile menu) |
| POST | `/api/auth/verify-email` | Public (GET) | Email verification landing |

### User Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | `PERM_users:read` | List all users |
| GET | `/api/users/directory` | Authenticated | User directory for messaging (name + id only) |
| POST | `/api/users` | `PERM_users:write` | Create user |
| DELETE | `/api/users/{id}` | `PERM_users:write` | Delete user |
| POST | `/api/users/{id}/reset-password` | `PERM_users:write` | Admin-reset password (sends temp password email) |

---

## Roaming Analysis Service (`/api/roaming/**`) — port 9002

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/roaming/overview` | `PERM_roaming-events:read` | Summary stats (volume, risk, direction) |
| GET | `/api/roaming/events` | `PERM_roaming-events:read` | Paginated events list (filter: direction, risk, PLMN) |
| GET | `/api/roaming/events/{id}` | `PERM_roaming-events:read` | Event detail |
| GET | `/api/roaming/anomalies` | `PERM_roaming-events:read` | Anomaly list (z-score, severity, reasons) |
| GET | `/api/roaming/partners` | `PERM_roaming-events:read` | Partner stats (avg-risk, peak-risk per PLMN) |
| GET | `/api/roaming/qos` | `PERM_roaming-events:read` | QoS + experience stats |
| GET | `/api/roaming/kpis` | `PERM_roaming-events:read` | KPI + SLA metrics |
| GET | `/api/roaming/revenue` | `PERM_roaming-events:read` | Revenue, margin, settlement stats |
| GET | `/api/roaming/forecast` | `PERM_roaming-events:read` | LSTM/Prophet/ARIMA/Ensemble forecast |
| GET | `/api/roaming/live` | `PERM_roaming-events:read` | Real-time snapshot |
| GET | `/api/roaming/ireg-tests` | `PERM_roaming-events:read` | IREG synthetic test results |
| POST | `/api/roaming/upload` | `PERM_roaming-events:read` | Upload CSV → parse + return forecast |
| POST | `/api/roaming/simulate` | `PERM_roaming-events:read` | Generate simulated roaming snapshot |

---

## Rate Limiting Service (`/api/protection/**`) — port 9004

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/protection/health` | Public | Liveness check |
| GET | `/api/protection/stats` | `PERM_roaming-events:read` | Current counters (total req, blocked, rate, top offenders) |
| GET | `/api/protection/policies` | `PERM_roaming-events:read` | List all rate-limit policies |
| POST | `/api/protection/policies` | `PERM_detection-rules:write` | Create policy |
| PUT | `/api/protection/policies/{id}` | `PERM_detection-rules:write` | Update policy |
| DELETE | `/api/protection/policies/{id}` | `PERM_detection-rules:write` | Delete policy |
| POST | `/api/protection/check` | `PERM_roaming-events:read` | Test a request against active policies |

---

## Messaging Service (`/api/messages/**`, `/ws/**`) — port 9007

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages/conversations` | Authenticated | List conversations |
| GET | `/api/messages/conversations/{peerId}` | Authenticated | Thread with a user |
| POST | `/api/messages/send` | Authenticated | Send a message |
| POST | `/api/messages/mark-read/{peerId}` | Authenticated | Mark thread as read |
| GET | `/api/messages/unread-count` | Authenticated | Unread message count |
| WS | `/ws/notifications?token=<jwt>` | JWT query param | WebSocket — push notifications (unread count, alerts) |

---

## fivegc-service (`/api/5gc/**`, `/api/vm/**`) — port 9008

### 5GC NF Facade (proxies to free5GC WebConsole at port 5000)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/5gc/nf-status` | Authenticated | All registered NF instances + UP/DOWN status |
| GET | `/api/5gc/subscribers` | Authenticated | All provisioned subscribers (IMSI, PLMN, GPSI) |
| GET | `/api/5gc/ue-contexts` | Authenticated | Active UE contexts (SUPI, GUTI, access type) |
| GET | `/api/5gc/network-config` | Authenticated | Network config derived from UDR: slices (S-NSSAI), QoS profiles (5QI + AMBR), PLMN/MCC/MNC |
| PUT | `/api/5gc/network-config` | `ROLE_NETWORK_OPERATOR` | Apply QoS/AMBR changes back to each subscriber via UDR PUT. Returns 207 on partial success. |

### VM MongoDB Console
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vm/mongo/dbs` | Authenticated | List non-internal databases (excludes `local`) |
| GET | `/api/vm/mongo/{db}/collections` | Authenticated | Collections in a DB with `estimatedDocumentCount` |
| GET | `/api/vm/mongo/{db}/{col}/documents` | Authenticated | Paginated document list. Params: `filter` (JSON), `limit` (default 20), `skip` |
| POST | `/api/vm/mongo/{db}/{col}/query` | Authenticated | Custom find with JSON body `{filter, limit, skip}` |
| POST | `/api/vm/mongo/{db}/{col}` | `ROLE_NETWORK_OPERATOR` or `ROLE_PLATFORM_ADMIN` | Insert document (JSON body = BSON doc) |
| DELETE | `/api/vm/mongo/{db}/{col}/{id}` | `ROLE_NETWORK_OPERATOR` or `ROLE_PLATFORM_ADMIN` | Delete document by ObjectId or string id |
| GET | `/api/vm/mongo/stats` | Authenticated | MongoDB server version + database count |

---

## Gateway — own controllers (`/api/metrics/**`) — port 9000

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/metrics/overview` | `PERM_platform-config:read` | Prometheus-backed request + JVM metrics: total req, RPS, 2xx%, 5xx%, exceptions, top endpoints by requests + avg duration |

---

## ML Service (`/api/...`) — port 8000 (Django, Docker only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/` | Public | Service health + model status |
| POST | `/api/forecast/` | None (internal) | Generate LSTM/Prophet/ARIMA/Ensemble forecast from input series |
| POST | `/api/train/` | None (internal) | Trigger background model training |
| GET | `/api/train/` | None (internal) | Training status + metrics (MAE, RMSE, AIC, final_loss) |

ML service is called by `roaming-analysis-service` via `RestTemplate` (requires `Content-Type: application/json` on POST — Spring Boot 4 requirement).

---

## Per-service Actuator (every Spring Boot service)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/actuator/health` | Health (UP/DOWN per component) |
| GET | `/actuator/info` | Build info |
| GET | `/actuator/metrics/{name}` | Named metric |
| GET | `/actuator/prometheus` | Prometheus scrape endpoint |

Gateway Swagger aggregates all downstream docs at:
- `http://localhost:9000/swagger-ui.html` → select service from dropdown
- `http://localhost:9000/<service-id>/v3/api-docs` for raw OpenAPI JSON

---

## Notes
- All `/api/**` paths go through the gateway (port 9000); Angular dev proxy forwards `:4200/api/**` → `:9000`
- JWT Bearer token required on all non-public endpoints; token from Keycloak `POST .../token`
- `PERM_*` authorities come from `platform-client` roles in Keycloak; `ROLE_*` from realm roles
- fivegc-service connects to MongoDB at `mongodb://localhost:27017` (host) or `mongodb://mongodb:27017` (Docker profile)
- free5GC WebConsole at `http://localhost:5000` (credentials: admin/free5gc)

## Related notes
- [[Ports-and-URLs]] · [[Backend-and-Infra]] · [[Auth-Service]] · [[Roaming-Analysis-Service]]
