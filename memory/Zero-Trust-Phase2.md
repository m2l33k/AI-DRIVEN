---
title: Zero-Trust Phase 2 — SBI TLS + NRF OAuth2
tags: [5gc, security, zero-trust, free5gc, tls, oauth2]
updated: 2026-09-13
---

# Zero-Trust Phase 2 — SBI TLS + NRF OAuth2

## What it is

Enabling mutual TLS (mTLS) on the **Service-Based Interface (SBI)** between free5GC Network Functions,
plus **NRF OAuth2** scoped-token enforcement. This implements 3GPP TS 33.501 §13 zero-trust for NF-to-NF communication.

---

## Architecture context

```
[ Angular ]──▶[ Gateway :9000 ]──▶[ Spring Boot services ]
                                          │
                                    [ fivegc-service :9008 ]──▶[ WebConsole :5000 ]
                                                                        │
                                              ╔══════════════════════════════════╗
                                              ║  free5GC Docker network           ║
                                              ║  (SBI TLS + OAuth2 lives HERE)    ║
                                              ║  NRF ↔ AMF ↔ SMF ↔ UDM ↔ AUSF   ║
                                              ╚══════════════════════════════════╝
```

The TLS / OAuth2 changes are **entirely inside** the free5GC Docker network.
They do **not** cross into the Spring Boot / Angular layer.

---

## Demo scenarios

### SEC-01 — Connection without TLS certificate
A Network Function (or an attacker's curl) tries to reach an NF SBI endpoint **without** a valid client cert.

```bash
# Attempt to call AMF's SBI directly — no cert
curl -k https://localhost:8002/namf-comm/v1/ue-contexts
# Expected: TLS handshake failure (no mutual auth)
```

**What it proves:** unauthenticated NF connections are rejected at the transport layer before any payload is parsed.

---

### SEC-02 — Valid cert but wrong OAuth2 scope → 403 Forbidden
A request carries a valid TLS client cert but its NRF-issued access token has the wrong scope for the target service.

```bash
# Get a token scoped for AMF only
TOKEN=$(curl -s -X POST https://nrf:8000/oauth2/token \
  --cert amf.pem --key amf.key \
  -d "grant_type=client_credentials&nfType=AMF&targetNfType=SMF" | jq -r .access_token)

# Use that token against UDM — wrong scope
curl -k https://udm:8002/nudm-sdm/v1/imsi-001011234567890/sm-data \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden  (scope mismatch)
```

**What it proves:** even with a valid cert, a compromised NF cannot reach services outside its authorized scope.

---

## What changes inside free5GC

| Config file | Change |
|---|---|
| `free5gc-compose/config/nrf/nrf.conf` | Enable TLS, point to cert/key paths |
| `free5gc-compose/config/amf/amf.conf` | Enable SBI TLS client cert |
| `free5gc-compose/config/smf/smf.conf` | Same |
| `free5gc-compose/config/udm/udm.conf` | Same |
| `free5gc-compose/config/webconsole/` | Add cert so WebConsole can still reach NRF |
| `free5gc-compose/certs/` | Generate CA + per-NF certs (script) |

Cert generation (one-time per environment):
```bash
# Generate CA
openssl genrsa -out ca.key 2048
openssl req -x509 -new -key ca.key -days 3650 -out ca.pem -subj "/CN=free5GC-CA"

# Per-NF cert (repeat for amf, smf, udm, ausf, pcf, udr, nrf, webconsole)
openssl genrsa -out amf.key 2048
openssl req -new -key amf.key -out amf.csr -subj "/CN=AMF"
openssl x509 -req -in amf.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out amf.pem -days 365
```

NRF OAuth2 token endpoint (`/oauth2/token`) validates:
- Client cert CN matches the requesting NF type
- `targetNfType` is in the NF's allowed scope list

---

## Impact on existing work

| Component | Affected? | Notes |
|---|---|---|
| Angular frontend | ✅ No | Never talks to SBI |
| Spring Boot gateway (9000) | ✅ No | Not involved |
| fivegc-service (9008) | ⚠️ Possibly | Calls WebConsole :5000 — subscriber CRUD is via MongoDB (safe); NF-status query goes via NRF (may need webconsole cert) |
| Roaming / ML / Auth / Messaging services | ✅ No | No SBI contact |
| Prometheus scraping | ✅ No | Metrics ports are separate from SBI |
| MongoDB VM console (HLS) | ✅ No | Unrelated to SBI |

**The one thing to watch:** if WebConsole can't reach NRF after TLS is enabled, the Angular `/security/5gc` NF-status tiles may go blank.
Fix: add WebConsole cert to `webconsole.conf` (same as any other NF).

---

## Recommended workflow

1. Branch `feat/zero-trust-tls` off `main`
2. Write cert-gen script → `free5gc-compose/certs/gen-certs.sh`
3. Patch NF configs (NRF, AMF, SMF, UDM, AUSF, PCF, UDR, WebConsole)
4. Bring up free5GC, verify WebConsole still shows NFs
5. Record SEC-01 curl (handshake failure)
6. Record SEC-02 curl (403 scope mismatch)
7. Merge to `main`

---

## Related notes

- [[5GC-Core]] — free5GC architecture, Docker compose, UERANSIM
- [[fivegc-platform-integration]] — fivegc-service proxy + Angular page
- [[Next-Steps]] — Phase 2 checklist items
- [[Backend-and-Infra]] — service ports and gateway routes
