# Nexo Platform — Diagrams (Mermaid mirror)

GitHub renders these inline. They mirror the PlantUML sources in this folder for quick
on-GitHub viewing. For the authoritative, detailed versions render the `.puml` files.

---

## 1. High-level architecture

```mermaid
flowchart TB
  UI["Angular 22 Console (:4200)"]
  subgraph EDGE["Edge (Spring Cloud)"]
    GW["gateway-service :9000<br/>JWT + PERM_* RBAC"]
    EUREKA["eureka-server :8761"]
  end
  subgraph SVC["Business microservices"]
    AUTH["auth-service :9001"]
    ROAM["roaming-analysis :9002"]
    ANOM["anomaly-detection :9003"]
    RL["rate-limiting :9004"]
    TRACE["distributed-tracing :9005"]
    FAULT["fault-injection :9006"]
    MSG["messaging :9007"]
  end
  KC["Keycloak :8081<br/>realm auth-management"]
  subgraph DATA["Data stores"]
    MYSQL[("roaming-mysql :3307")]
    PG[("Postgres ×5")]
    REDIS[("Redis ×2")]
  end
  subgraph OBS["Observability"]
    PROM["Prometheus :9090"]
    GRAF["Grafana :3000"]
    LOKI["Loki :3100"]
    TEMPO["Tempo"]
  end

  UI -->|/api Bearer JWT| GW
  UI -->|/ws token| MSG
  GW --> AUTH & ROAM & ANOM & RL & TRACE & FAULT & MSG
  GW -.discover.-> EUREKA
  GW -->|validate JWT| KC
  AUTH -->|grant + admin| KC
  ROAM --> MYSQL
  RL --> PG & REDIS
  MSG --> PG
  GW & AUTH & ROAM --> LOKI
  PROM --> GW & AUTH & ROAM
  GRAF --> PROM & LOKI & TEMPO
```

---

## 2. RBAC — roles → permissions

```mermaid
flowchart LR
  ADMIN["PLATFORM_ADMIN"] --> users["users:*"] & roles["roles:*"] & cfg["platform-config:*"]
  OPER["NETWORK_OPERATOR"] --> nf["nf:read / nf:restart"] & core["core-config:*"]
  ANALYST["SECURITY_ANALYST"] --> alerts["security-alerts:read"] & roam["roaming-events:read"] & rules["detection-rules:*"]
  AUDIT["AUDITOR"] --> ro["read-only on everything"] & audit["audit:read"]
  del["audit:delete — granted to NO role (append-only)"]
```

---

## 3. Login (state-aware) sequence

```mermaid
sequenceDiagram
  actor U as User (SPA)
  participant GW as gateway :9000
  participant AUTH as auth-service :9001
  participant KC as Keycloak :8081
  U->>GW: POST /api/auth/login {email,password}
  GW->>AUTH: forward (permitAll)
  AUTH->>KC: password grant (platform-client)
  alt account OK
    KC-->>AUTH: JWT
    AUTH-->>U: 200 SUCCESS + access_token
  else not fully set up
    KC-->>AUTH: invalid_grant
    AUTH->>KC: Admin API inspect state
    AUTH-->>U: 200 PASSWORD_CHANGE / EMAIL_VERIFICATION
  else bad creds
    KC-->>AUTH: 401
    AUTH-->>U: 401
  end
```

---

## 4. Protected request (PERM_* authorization)

```mermaid
sequenceDiagram
  actor U as User
  participant GW as gateway :9000
  participant SVC as service (e.g. roaming)
  U->>GW: GET /api/roaming/anomalies (Bearer JWT)
  GW->>GW: validate JWT + map claims → ROLE_*/PERM_*
  alt has PERM_roaming-events:read
    GW->>SVC: forward (JWT)
    SVC->>SVC: @PreAuthorize re-check (defence in depth)
    SVC-->>U: 200 payload
  else missing permission
    GW-->>U: 403
  else no/expired token
    GW-->>U: 401
  end
```

---

## 5. Messaging + WebSocket notification

```mermaid
sequenceDiagram
  actor A as Alice
  actor B as Bob
  participant M as messaging :9007
  participant WS as SocketHandler
  B->>M: WS /ws/notifications?token=JWT
  M->>WS: register session (Map<user,sessions>)
  A->>M: POST /api/messages {recipient:bob,content}
  M->>M: sender = JWT (not body)
  M->>M: INSERT message
  M->>WS: sendToUser(bob, notification)
  WS-->>B: live push (bell + count)
  M-->>A: 201 MessageDto
```

---

## 6. Roaming data model (ER)

```mermaid
erDiagram
  Device ||--o{ RoamingCdr : device_id
  NetworkCell ||--o{ RoamingCdr : serving_cell_id
  NetworkCell ||--o{ AttachEvent : cell_id
  NetworkCell ||--o{ HandoverEvent : "source/target_cell"
  RoamingCdr ||--o| SessionQos : cdr_id
  RoamingCdr { string cdr_id PK
    string subscriber_imsi
    boolean fraud_flag
    decimal charged_amount
    decimal wholesale_cost }
  AttachEvent { string attach_id PK
    boolean auth_failure_flag
    int registration_delay_ms }
  SessionQos { string session_id PK
    float latency_ms
    float packet_loss_pct }
```
