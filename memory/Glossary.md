---
title: Glossary
tags: [reference, glossary, telecom]
updated: 2026-08-10
---

# Glossary

Domain (5G telecom) + platform terms used across the codebase and notes. Keep it short and
practical — enough to read the code without a telecom textbook.

## 5G / telecom domain
- **5GC (5G Core)** — the core network behind a 5G system; a set of **Network Functions**. This
  platform is a management console for it. See [[Project-Overview]].
- **NF (Network Function)** — a 5GC component (e.g. AMF, SMF, UPF). Operators view status and
  restart them (`PERM_nf:read` / `PERM_nf:restart`).
- **PLMN** — Public Land Mobile Network; a mobile operator identified by MCC-MNC (e.g. `310-260`).
  Roaming happens between a home PLMN and partner PLMNs.
- **Roaming** — a subscriber using a *partner* network. The [[Roaming-Analysis-Service]] scores
  partner-PLMN risk from signalling/roaming events.
- **QoS** — Quality of Service (latency, throughput, drop ratio) — roaming analytics dimensions.
- **ARPU** — Average Revenue Per User; commercial roaming metric.
- **Signalling** — control-plane messaging between network elements; anomalies here can indicate
  fraud/attacks (relevant to anomaly-detection).

## Platform / IAM
- **Keycloak** — the OAuth2/OIDC identity provider; source of truth for auth. Realm
  `auth-management`, client `platform-client`. See [[Auth-Service]].
- **Realm role** — coarse role (`PLATFORM_ADMIN`, `NETWORK_OPERATOR`, `SECURITY_ANALYST`,
  `AUDITOR`) → mapped to `ROLE_*` authorities.
- **Client role / permission** — fine-grained perm on `platform-client` → mapped to `PERM_*`
  authorities; authorization keys on these. See [[Roles-and-Permissions]] · [[Architecture-Decisions]].
- **Composite role** — a realm role that aggregates client-role permissions.
- **Password grant** — direct username/password token request; used by auth-service login.
- **Required action** — Keycloak account flag (`VERIFY_EMAIL`, `UPDATE_PASSWORD`) that blocks the
  password grant until cleared; drives the state-aware login.

## Infra / observability
- **Eureka** — service registry; services register and are discovered via `lb://<service-id>`.
- **Gateway** — single secured entry point (Spring Cloud Gateway, WebFlux); routes + RBAC.
- **Prometheus / Grafana / Loki / Tempo / Fluent Bit** — metrics / dashboards / logs / traces /
  log-shipping. See [[Ports-and-URLs]].
- **OTLP** — OpenTelemetry protocol; the gateway exports traces via the OTel agent to Tempo.
- **Actuator** — Spring Boot ops endpoints (`/actuator/health`, `/prometheus`).

## Related notes
- [[Project-Overview]] · [[Roles-and-Permissions]] · [[Backend-and-Infra]] · [[Ports-and-URLs]]
