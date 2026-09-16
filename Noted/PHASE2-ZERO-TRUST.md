# Phase 2 — Zero-Trust Security & Certification

> **Scope:** Layer 01 of the 5G Core security harness — mutual TLS on the 5G SBI, NRF OAuth2 scoped tokens, and mTLS/NetworkPolicy enforcement between NF containers.
> **Platform phases:** Phase 0 (baseline) ✅ · Phase 1 (observe) ✅ · **Phase 2 (zero-trust)** ⬇️ · Phase 3 (anomaly) ✅ · Phase 4/5 (conformance + package) 🔜

---

## Status Summary

| Sub-task | Status | Notes |
|---|---|---|
| Platform RBAC (Keycloak JWT + gateway enforcement) | ✅ **Done** | All 4 roles, `PERM_*` authorities, gateway `SecurityConfig` |
| Audit logging (AuditGatewayFilter + audit-service) | ✅ **Done** | Every write action captured in real time |
| Detection Rules backend + UI | ✅ **Done** | `RuleStore`, `RuleController`, Angular CRUD |
| Anomaly detection engine (z-score, rule-based) | ✅ **Done** | Registration flood, IMSI enum, auth failure |
| Rate limiting (Redis token bucket) | ✅ **Done** | `rate-limiting-service`, policy CRUD, stats |
| UERANSIM attack scripts (ATK-01, ATK-02) | ✅ **Done** | `scripts/attack-reg-flood.sh`, `attack-imsi-enum.sh` |
| free5GC SBI TLS (TS 33.501 §13) | 🔲 **Planned** | Requires Linux host with `gtp5g` module |
| NRF OAuth2 scoped tokens (SEC-01 / SEC-02) | 🔲 **Planned** | free5GC NRF as OAuth2 AS |
| mTLS between NF containers (service mesh) | 🔲 **Planned** | Istio / Linkerd / Cilium eBPF |
| NetworkPolicy (AMF ↛ UPF direct) | 🔲 **Planned** | Cilium or kube-network-policy |
| Grafana D5 (zero-trust handshake/cert dashboard) | 🔲 **Planned** | Depends on SBI TLS being active |
| PKI (cert-manager / CFSSL / Vault) | 🔲 **Planned** | Choose PKI tooling first |

---

## Architecture — Two Token Planes

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │  PLANE A — Platform / Operator console (Spring + Keycloak)               │
 │                                                                           │
 │  Browser → Angular :4200 → Gateway :9000 → microservices :9001-9009      │
 │                    Bearer JWT (Keycloak, realm auth-management)           │
 │                    PERM_* authorities, RBAC at gateway                    │
 └───────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────────────────────────────────────────────────────┐
 │  PLANE B — 5G SBI (free5GC, Go NFs)                           PLANNED    │
 │                                                                           │
 │  AMF → NRF (register) → AMF ← NRF (scoped OAuth2 access_token)          │
 │  AMF → SMF (namf-comm scope, mTLS client cert)                           │
 │  SMF → UDM (nsmf-pdusession scope, mTLS)                                 │
 │  NRF = OAuth2 AS (TS 33.501 §13 SBI-TLS + NRF-OAuth)                    │
 └───────────────────────────────────────────────────────────────────────────┘
```

The two planes are intentionally separate:
- **Plane A** secures the *operator console* (who can view/change what via the dashboard).
- **Plane B** secures *NF-to-NF communication* (which NF may call which API on another NF).

---

## Part 1 — Platform-Level Zero Trust (Done ✅)

### 1.1 Authentication — Keycloak OIDC

All API calls pass through the gateway (`http://localhost:9000`). The gateway validates the Bearer JWT against Keycloak's JWK set:

```
POST http://localhost:8081/realms/auth-management/protocol/openid-connect/token
  grant_type=password
  client_id=platform-client
  client_secret=platform-client-secret
  username=analyst-user
  password=password
  scope=openid profile email roles
```

JWT claims used by the gateway:
- `realm_access.roles` → `ROLE_SECURITY_ANALYST`, `ROLE_AUDITOR`, …
- `resource_access.platform-client.roles` → `PERM_detection-rules:write`, `PERM_audit:read`, …

### 1.2 RBAC — Permission-Based (Not Role-Based)

Services authorize on **fine-grained permissions** (`PERM_*`), not on roles. Roles are Keycloak composite realm roles that aggregate permissions. This allows re-slicing permissions without code changes.

| Role | Key permissions |
|---|---|
| PLATFORM_ADMIN | `users:read/write`, `roles:read/write`, `platform-config:read/write` |
| NETWORK_OPERATOR | `nf:read`, `nf:restart`, `core-config:read/write` |
| SECURITY_ANALYST | `security-alerts:read`, `roaming-events:read`, `detection-rules:read/write` |
| AUDITOR | `users:read`, `nf:read`, `core-config:read`, `security-alerts:read`, `audit:read` |

`audit:delete` is defined but **granted to no role** — audit logs are append-only by design.

### 1.3 Audit Trail — AuditGatewayFilter

Every non-GET request through the gateway is captured by `AuditGatewayFilter` (Spring Cloud Gateway `GlobalFilter`) and shipped to `audit-service` (:9009).

- **Source:** `spring-cloud/gateway-service/.../filter/AuditGatewayFilter.java`
- **Pattern:** fire-and-forget WebClient POST; never blocks the original request
- **Fields captured:** actor (JWT `preferred_username`), role, action (`detection-rules:write`), resource, outcome (HTTP status), IP, timestamp

### 1.4 Rate Limiting — Redis Token Bucket

All signalling keys (IMSI, operator, IP) are subject to configurable token-bucket limits stored in Postgres and enforced in Redis.

- **Service:** `rate-limiting-service` (:9004)
- **Endpoint:** `POST /api/protection/check {keyType, key, tokens}`
- **Policy CRUD:** `PUT /api/protection/policies/{keyType}` (requires `detection-rules:write`)
- **Fail-open:** missing/disabled policy or Redis error → allowed (limiter never takes the platform down)

### 1.5 Anomaly Detection — Rule-Based + Z-Score

The `anomaly-detection-service` (:9003) monitors signalling patterns and fires alerts:

| Rule | Algorithm | Severity |
|---|---|---|
| DR-001 Registration Flood | rate > 20/s | HIGH |
| DR-002 IMSI Enumeration | sequential pattern, ≥5 in row, gap ≤2 | CRITICAL |
| DR-003 Auth Failure Spike | z-score > threshold | HIGH |
| DR-004 Roaming Velocity Anomaly | z-score | MEDIUM |
| DR-005 Repeated Auth Failure | rate > 5/s | MEDIUM |

### 1.6 Demo Users

| User | Password | Role |
|---|---|---|
| `admin-user` | `password` | PLATFORM_ADMIN |
| `operator-user` | `password` | NETWORK_OPERATOR |
| `analyst-user` | `password` | SECURITY_ANALYST |
| `auditor-user` | `password` | AUDITOR |

---

## Part 2 — 5GC SBI Zero Trust (Planned 🔲)

> **Prerequisite:** Linux host with `gtp5g` kernel module (Ubuntu 22.04 VM or WSL2 + custom kernel). This does **not** run on bare Windows Docker.

### 2.1 SBI TLS (SEC-01)

Enable TLS on all free5GC NF SBI interfaces. Each NF is issued a certificate by the platform PKI. Without a valid certificate, the SBI HTTP/2 handshake is rejected at the TLS layer.

**Demo scenario SEC-01:** Start AMF without its certificate → SMF `POST /namf-comm/v1/ue-contexts` returns a TLS handshake error. Grafana D5 panel "SBI TLS Handshake Failures" increments.

**Configuration files to patch** (in `E:/My-project/free5gc-compose/config/`):
```yaml
# amfcfg.yaml
sbi:
  scheme: https               # was: http
  tls:
    pem: /etc/free5gc/cert/amf.pem
    key: /etc/free5gc/cert/amf.key
```

Same pattern for NRF, SMF, AUSF, UDM, UDR, PCF, NSSF.

### 2.2 NRF OAuth2 — Scoped Tokens (SEC-02)

Enable NRF as the OAuth2 Authorization Server (TS 33.501 §13). Each NF registers with NRF and receives a scoped `access_token` to call other NFs.

**Token scopes (examples):**
- AMF → SMF: `namf-comm` scope
- SMF → UDM: `nsmf-pdusession` scope
- SMF → PCF: `npcf-smpolicycontrol` scope

**Demo scenario SEC-02:** AMF requests a `nsmf-pdusession` token (wrong scope for SMF comm) → SMF NRF token introspection returns 403. Grafana D5 "Token Scope Rejections" counter increments.

**Configuration:**
```yaml
# nrfcfg.yaml
nrf:
  oauth: true
```

### 2.3 mTLS Between NF Containers

Each NF container is issued a client certificate (from the same platform PKI). NF-to-NF SBI calls require the caller to present its certificate (mutual TLS). NetworkPolicy (Cilium or kube-network-policy) forbids direct container paths (e.g. AMF ↛ UPF directly, must go via SMF's PFCP path).

**Service mesh options:**
- **Istio:** sidecar injection on each NF container; Istio CA issues workload certs; `PeerAuthentication` `STRICT` mTLS.
- **Linkerd:** lighter alternative; `AnnotatedServiceProfile`; automatic mTLS.
- **Cilium/eBPF:** L3/L4 NetworkPolicy + Wireguard-based mTLS; no sidecar overhead.

### 2.4 PKI Options

| Tool | Pros | Cons |
|---|---|---|
| `cert-manager` (k8s) | Auto-rotation, ACME/self-signed CA, native k8s | Needs k8s cluster |
| **CFSSL** (CloudFlare) | Simple CLI, outputs PEM bundles, easy for Docker Compose | Manual rotation |
| HashiCorp Vault | PKI secrets engine, dynamic certs, full audit | Heavy for a dev environment |

Recommended for dev/demo: **CFSSL** to generate a self-signed CA + per-NF leaf certs, mounted into each NF container as volumes.

### 2.5 Grafana Dashboard D5 — Zero-Trust Visibility

Planned panels:
- SBI TLS Handshake Failures (Prometheus counter from NF metrics)
- NRF Token Rejections (scope mismatch count)
- mTLS Peer Certificate Errors
- NetworkPolicy Denied Flows (Cilium Hubble metrics)
- Certificate Expiry Countdown (days remaining, alert <7d)

---

## Part 3 — How to Run (Platform-Level)

### Prerequisites

```bash
# Start infrastructure
./infra.sh up

# Start microservices (in separate terminals or via run.sh)
java -jar spring-cloud/eureka-server/target/*.jar
java -jar spring-cloud/gateway-service/target/*.jar
java -jar microservices/auth-service/target/*.jar
java -jar microservices/anomaly-detection-service/target/*.jar
java -jar microservices/rate-limiting-service/target/*.jar
java -jar microservices/audit-service/target/*.jar

# Start Angular
cd Frontend && npm start
```

### Verify Zero-Trust Platform Layer

```bash
# 1. Login as analyst
TOKEN=$(curl -s -X POST http://localhost:8081/realms/auth-management/protocol/openid-connect/token \
  -d grant_type=password -d client_id=platform-client -d client_secret=platform-client-secret \
  -d username=analyst-user -d password=password -d scope="openid roles" \
  | jq -r .access_token)

# 2. Check rate-limit policy (should succeed — analyst has roaming-events:read)
curl -H "Authorization: Bearer $TOKEN" http://localhost:9000/api/protection/policies

# 3. Try to list users (should get 403 — analyst does NOT have users:read)
curl -H "Authorization: Bearer $TOKEN" http://localhost:9000/api/users
# Expected: 403 Forbidden

# 4. Check audit log shows the denied attempt
curl -H "Authorization: Bearer $TOKEN" \
  -H "Authorization: Bearer $(get auditor token)" \
  http://localhost:9000/api/audit/logs?outcome=Denied

# 5. Trigger anomaly simulation
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/anomaly/simulate/registration-flood
# Expected: anomaly events appear on http://localhost:4200/security/dashboard
```

### UERANSIM Attack Simulation (Requires Linux + UERANSIM installed)

```bash
# ATK-01 — Registration Flood (DoS on AMF)
./scripts/attack-reg-flood.sh 15 60
# → watch http://localhost:4200/security/dashboard for CRITICAL alerts

# ATK-02 — IMSI Enumeration
./scripts/attack-imsi-enum.sh 1 100
# → watch http://localhost:4200/security/alerts for HIGH IMSI_ENUMERATION alerts
```

---

## Part 4 — File Map

```
microservices/
  anomaly-detection-service/          Port 9003 — anomaly engine
    model/   AnomalyEvent.java · Severity.java
    engine/  AnomalyEngine.java (z-score, rule-based)
    store/   AnomalyStore.java (ConcurrentLinkedDeque)
    ingest/  AnomalyIngestService.java
    web/     AnomalyController.java · RuleController.java
  rate-limiting-service/               Port 9004 — Redis token bucket
    domain/  RateLimitPolicy.java · RateLimitAction.java
    ratelimit/ TokenBucketService.java + token_bucket.lua
    web/     ProtectionController.java · dto/
  audit-service/                       Port 9009 — immutable audit trail
    model/   AuditEntry.java · AuditStats.java
    store/   AuditStore.java (no seed, purely real)
    web/     AuditController.java

spring-cloud/
  gateway-service/
    config/  SecurityConfig.java (RBAC rules)
    filter/  AuditGatewayFilter.java (GlobalFilter, fire-and-forget)
  
scripts/
  attack-reg-flood.sh     ATK-01 — UERANSIM registration flood
  attack-imsi-enum.sh     ATK-02 — UERANSIM IMSI enumeration

config/
  ueransim/
    free5gc-gnb.yaml      gNB config (MCC/MNC 001/01, TAC 1)
    free5gc-ue-flood.yaml UE template (attack scripts substitute supi)

grafana-dashboard/
  security-anomaly.json   D4 — anomaly/signalling dashboard (Loki + Prometheus)

Frontend/src/app/roles/
  security-analyst/
    dashboard/           security-dashboard.ts (threat level, simulate, drilldown)
    security-alerts/     security-alerts.ts (tab coloring, z-score bar, export)
    detection-rules/     detection-rules.ts (CRUD, toggle, drilldown)
    rate-limiting/       rate-limiting.ts (toggle, bar chart, sparkline)
  auditor/
    dashboard/           auditor-dashboard.ts (7-day stats, top actors)
    audit-logs/          audit-logs.ts (pagination, search, export)
  shared/
    anomaly/             anomaly.service.ts (HTTP polling)
    audit/               audit.service.ts (stats$, logs())
```

---

## Related

- [`memory/5GC-Core.md`](../memory/5GC-Core.md) — full free5GC integration plan
- [`memory/anomaly-detection-phase3.md`](../memory/anomaly-detection-phase3.md)
- [`memory/audit-service.md`](../memory/audit-service.md)
- [`memory/detection-rules.md`](../memory/detection-rules.md)
- [`memory/rate-limiting-ui.md`](../memory/rate-limiting-ui.md)
- [`Noted/diagram/new-sequence/`](./diagram/new-sequence/) — PlantUML sequence diagrams
- [`SECURITY.md`](../SECURITY.md) — permission catalogue
