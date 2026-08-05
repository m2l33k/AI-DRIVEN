# UML Diagrams (Mermaid)

These mirror the PlantUML files and render directly on GitHub.

## 1. Component / Architecture

```mermaid
flowchart TB
    Client([Client: curl / Bruno / SPA])
    subgraph Platform [Platform - Spring Cloud]
        GW[Gateway Service :9000<br/>Spring Cloud Gateway<br/>OAuth2 RS + RBAC]
        Auth[Auth Service :9001<br/>OAuth2 RS + Keycloak Admin]
        Eureka[(Eureka Server :8761<br/>Service Registry)]
    end
    subgraph Identity
        KC[Keycloak :8081<br/>realm: auth-management<br/>client: platform-client]
    end
    subgraph Observability
        Prom[Prometheus :9090]
        Grafana[Grafana :3000]
        Loki[Loki :3100]
        Tempo[Tempo :4318]
        Fluent[Fluent Bit :24224]
    end

    Client -->|Bearer JWT| GW
    GW -->|lb://auth-service| Auth
    GW -.register/discover.-> Eureka
    Auth -.register.-> Eureka
    GW -->|validate JWT / JWK| KC
    Auth -->|password grant + Admin REST| KC
    GW -.logs.-> Fluent
    Auth -.logs.-> Fluent
    Fluent --> Loki
    GW -->|OTLP traces| Tempo
    Prom -->|scrape| GW
    Prom -->|scrape| Auth
    Prom -->|scrape| Eureka
    Grafana --> Prom
    Grafana --> Loki
    Grafana --> Tempo
```

## 2. Login sequence

```mermaid
sequenceDiagram
    actor Client
    participant GW as Gateway :9000
    participant Auth as Auth Service :9001
    participant KC as Keycloak :8081
    Client->>GW: POST /api/auth/login {email, password}
    Note right of GW: /api/auth/login is permitAll
    GW->>Auth: route lb://auth-service
    Auth->>KC: POST token (password grant, platform-client)
    KC-->>Auth: 200 JWT (realm_access + resource_access roles)
    Auth-->>GW: 200 token
    GW-->>Client: 200 token
```

## 3. Protected request (RBAC)

```mermaid
sequenceDiagram
    actor Client
    participant GW as Gateway :9000
    participant JWK as Keycloak JWK
    participant SVC as Downstream Service
    Client->>GW: POST /api/nf/amf-1/restart (Bearer JWT)
    GW->>JWK: verify signing keys (cached)
    JWK-->>GW: JWK set
    GW->>GW: extract ROLE_* and PERM_* authorities
    alt has PERM_nf:restart
        GW->>SVC: forward (+ Bearer JWT)
        SVC->>SVC: re-validate + @PreAuthorize
        SVC-->>GW: 200 / 204
        GW-->>Client: 200 / 204
    else missing permission
        GW-->>Client: 403 Forbidden
    end
```

## 4. RBAC model

```mermaid
flowchart LR
    subgraph Roles [Realm roles - composite]
        PA[PLATFORM_ADMIN]
        NO[NETWORK_OPERATOR]
        SA[SECURITY_ANALYST]
        AU[AUDITOR]
    end
    subgraph Perms [platform-client permissions]
        uw[users:write]
        ur[users:read]
        pcw[platform-config:write]
        nfr[nf:read]
        nfx[nf:restart]
        ccw[core-config:write]
        sar[security-alerts:read]
        drw[detection-rules:write]
        aur[audit:read]
        aud[audit:delete - no role]
    end
    PA --> uw & ur & pcw
    NO --> nfr & nfx & ccw
    SA --> sar & drw
    AU --> ur & nfr & sar & aur
```

## 5. Deployment (Docker Compose)

```mermaid
flowchart TB
    subgraph net [Docker network: shared-network]
        eureka[eureka-server :8761]
        auth[auth-service :9001]
        gw[gateway-service :9000]
        kc[keycloak :8081]
        prom[prometheus :9090]
        graf[grafana :3000]
        loki[loki :3100]
        tempo[tempo :4318]
        fb[fluent-bit :24224]
    end
    gw --> auth --> eureka
    gw --> eureka
    gw --> kc
    auth --> kc
    gw -.-> fb --> loki
    gw --> tempo
    prom --> gw & auth & eureka
    graf --> prom & loki & tempo
```
