# New Sequence Diagrams — PlantUML

All diagrams for the 5G Security Platform. Generated 2026-09-16.

## Rendering

**CLI** (needs Java + Graphviz):
```bash
plantuml Noted/diagram/new-sequence/*.puml          # → PNG per file
plantuml -tsvg Noted/diagram/new-sequence/*.puml    # → SVG per file
```

**VS Code:** install *PlantUML* extension, open any `.puml`, press `Alt+D`.

**Online:** paste into https://www.plantuml.com/plantuml

---

## Sequence Diagrams

| File | Flow | Services |
|------|------|---------|
| `seq-01-login-state-machine.puml` | Login — SUCCESS / PWD_CHANGE / EMAIL_VERIFY states | Gateway, Auth, Keycloak, Mail |
| `seq-02-rbac-protected-request.puml` | RBAC enforcement — PERM_* at gateway, audit capture | Gateway, SecurityConfig, AuditFilter, Downstream |
| `seq-03-zero-trust-sbi-tls.puml` | **Phase 2** — SEC-01: No cert → TLS handshake rejection | AMF, NRF, SMF, Prometheus, Grafana D5 |
| `seq-04-zero-trust-nrf-oauth2.puml` | **Phase 2** — SEC-02: Wrong OAuth2 scope → 403 | AMF, NRF (OAuth2 AS), SMF, Prometheus |
| `seq-05-zero-trust-mtls-mesh.puml` | **Phase 2** — mTLS + NetworkPolicy (Istio/Cilium) | PKI, NF sidecars, Cilium eBPF |
| `seq-06-anomaly-detection-pipeline.puml` | Anomaly detection — simulate → engine → poll → dashboard | ADS, AnomalyEngine, AnomalyStore, Loki, Grafana |
| `seq-07-attack-reg-flood.puml` | ATK-01 — Registration flood via UERANSIM + detection | UERANSIM, AMF, ADS, Rate Limiting, Dashboard |
| `seq-08-attack-imsi-enum.puml` | ATK-02 — IMSI enumeration probe + sequential detection | UERANSIM, AMF, AUSF, UDM, ADS, Security Alerts |
| `seq-09-rate-limiting-check.puml` | Token bucket check — Redis Lua script, fail-open | RL Service, TokenBucketService, Redis, Postgres |
| `seq-10-audit-gateway-capture.puml` | AuditGatewayFilter — fire-and-forget audit capture | Gateway, GlobalFilter, AuditService, AuditStore |
| `seq-11-detection-rules-crud.puml` | Detection rules — Create / Toggle / Edit / Delete | Gateway, ADS, RuleController, RuleStore |
| `seq-12-password-reset-otp.puml` | OTP password reset — 3-step self-service flow | Gateway, Auth, OtpService, ResetTokenService, KC, Mail |
| `seq-13-user-creation-flow.puml` | Admin creates user — email verify + first-login pwd change | Admin, Gateway, Auth, KeycloakService, KC, Mail |
| `seq-14-roaming-analysis.puml` | Roaming CSV upload → z-score analysis → ML forecast | Gateway, RAS, MySQL, ML Service, AnomalyDetector |
| `seq-15-websocket-notifications.puml` | WebSocket push notifications — JWT query param (ADR-14) | Angular, Gateway, Messaging, WsSessions |
| `seq-16-5gc-nf-status.puml` | 5GC NF status + network config read/write | Gateway, fivegc-service, WebConsole, NRF, UDR |
| `seq-17-vm-mongodb-console.puml` | VM MongoDB document browser — list/query/insert/delete | Gateway, fivegc-service, VmMongoController, MongoDB |
| `seq-18-audit-logs-query.puml` | Audit logs query + client-side pagination (20/page) | Gateway, AuditService, AuditStore, Angular |
| `seq-19-gateway-metrics.puml` | Gateway metrics overview — Prometheus PromQL queries | Admin, Gateway, Prometheus, Grafana |
| `seq-20-protection-stats-sparkline.puml` | Rate limiting stats poll + allow/block sparkline | Angular, Gateway, RL Service, Redis |

## Component Diagrams

| File | Description |
|------|-------------|
| `comp-01-full-platform.puml` | Full platform architecture — all 11 services, 5GC, ML, infra |
| `comp-02-zero-trust-layers.puml` | Zero-trust two-layer model (Platform RBAC ✅ + SBI TLS 🔲) |

---

## Phase 2 Status

| Component | Status |
|---|---|
| Platform RBAC (Keycloak JWT + gateway) | ✅ Done |
| Audit logging (AuditGatewayFilter) | ✅ Done |
| Detection Rules (RuleStore + Angular CRUD) | ✅ Done |
| Anomaly detection (z-score + rule engine) | ✅ Done |
| Rate limiting (Redis token bucket) | ✅ Done |
| UERANSIM attack scripts (ATK-01, ATK-02) | ✅ Done |
| free5GC SBI TLS | 🔲 Planned (needs Linux + gtp5g) |
| NRF OAuth2 scoped tokens | 🔲 Planned |
| mTLS mesh between NF containers | 🔲 Planned |
| Grafana D5 (zero-trust dashboard) | 🔲 Planned |

See [`../../PHASE2-ZERO-TRUST.md`](../../PHASE2-ZERO-TRUST.md) for full documentation.
