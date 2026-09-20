# Jenkins CI/CD Pipeline — 5G Telecom Security Platform

## Overview

A full declarative Jenkins pipeline that compiles, tests, scans, and packages the entire 5G Telecom Security Platform. The pipeline covers 11 Spring Boot microservices, an Angular 22 frontend, and a Django ML service.

---

## Pipeline Architecture

```
Checkout → Compile (parallel) → Verify (parallel) → OWASP DC Scan → Integration Tests → Archive → Docker (main only)
```

### Stage 1 — Checkout & Metadata
- Checks out the code from GitHub (`https://github.com/m2l33k/AI-DRIVEN.git`)
- Computes `GIT_SHORT` (7-char commit hash) and `BUILD_VERSION` (`<branch>-<hash>-<build#>`)
- `BRANCH_CLEAN` strips the `origin/` prefix from `GIT_BRANCH` (regular Pipeline jobs set `GIT_BRANCH`, not `BRANCH_NAME`)

### Stage 2 — Compile (parallel)
| Sub-stage | What it does |
|---|---|
| Backend — Compile | `mvn clean package -DskipTests -T 4` across all 11 modules |
| Frontend — Install | `npm ci` + TypeScript check (`npx tsc --noEmit`) in Angular workspace |

### Stage 3 — Verify (parallel)
| Sub-stage | What it does |
|---|---|
| Backend — Unit Tests | `mvn test -T 4`; JUnit results from `surefire-reports` |
| Frontend — Build & Test | `ng build --configuration production`; `ng test --watch=false` |
| ML — Tests | `pytest ml-service/tests/` with JUnit XML output |
| Security — Trivy | Filesystem scan (CRITICAL + HIGH only, unfixed ignored) |

### Stage 4 — OWASP Dependency-Check
Runs only when `SKIP_SECURITY` is false (default). Skipped on the `SKIP_SECURITY` parameter.

- Executes `dependency-check:aggregate` across all 11 Maven modules in a single pass
- Downloads / updates the **NVD CVE database** on first run (3–10 min); cached in `~/.m2` for subsequent runs (~30 s)
- Requires the Jenkins secret **`nvd-api-key`** (secret text) — without it the NVD download is heavily rate-limited and takes hours
- Output formats: HTML, XML, JSON — archived to `reports/owasp/`
- **Build behaviour:**
  - CVSS ≥ 9 (CRITICAL) → build **FAILURE**
  - HIGH count > 10 → build **UNSTABLE** (via `dependencyCheckPublisher`)
  - `failOnError=false` so network/DB errors degrade gracefully to UNSTABLE, never block the pipeline
- The `owasp-suppressions.xml` at repo root is used to suppress accepted risks / false-positives

#### NVD API Key setup
1. Register free at `https://nvd.nist.gov/developers/request-an-api-key` (email confirmation, instant)
2. Jenkins → Manage Jenkins → Credentials → Global → **Add Credential**
   - Kind: `Secret text`
   - Secret: the key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - ID: `nvd-api-key`

#### Jenkins Plugin required
**OWASP Dependency-Check** plugin must be installed for `dependencyCheckPublisher()` trend graphs.
Manage Jenkins → Plugins → Available → search "OWASP Dependency-Check" → install → restart.
Without the plugin the stage still runs and the HTML/XML report is still archived.

#### Suppressing false-positives
Edit `owasp-suppressions.xml` at repo root:
```xml
<suppress>
    <notes>Accepted risk: not reachable externally</notes>
    <cve>CVE-2026-XXXXX</cve>
</suppress>
```

---

### Stage 5 — Backend Integration Tests
- Runs `*IT.java` classes via Maven Failsafe plugin
- Testcontainers spins up real **PostgreSQL 16** and **Redis 7** containers via the host Docker socket (`/var/run/docker.sock`)
- `TESTCONTAINERS_RYUK_DISABLED=true` required for Docker socket setup in Jenkins
- Three services have integration tests:
  - `AuditServiceIT` — health, log entry append/query, stats (in-memory store, no containers)
  - `AnomalyServiceIT` — health, event injection, clear events (in-memory, no containers)
  - `ProtectionControllerIT` — full token-bucket lifecycle with real PostgreSQL + Redis; 7 test scenarios including 429 blocking

### Stage 6 — Archive
- Archives all `*.jar` files from `target/` directories
- Stashes JARs for downstream Docker stages

### Stage 7 — Docker (main branch / version tags only)
Runs only when `BRANCH_CLEAN == 'main'` or a `v*.*.*` tag is pushed, and `SKIP_DOCKER` is false.

| Sub-stage | What it does |
|---|---|
| Docker — Spring Boot Services | Parallel builds for all 11 services; tags as `:<version>` and `:latest` |
| Docker — ML Service | Builds `ml-service` Django image |
| Docker — Trivy Image Scan | Scans `auth-service`, `anomaly-detection-service`, `gateway-service`, `audit-service` images |
| Docker — Push | Logs in to GHCR (`ghcr.io/m2l33k`) and pushes all 12 images |

---

## Key Configuration Decisions

### Branch Detection
Regular Pipeline jobs (non-Multibranch) do not set `BRANCH_NAME`. Instead `GIT_BRANCH` is set to `origin/main`. The pipeline strips the prefix:
```groovy
def rawBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
env.BRANCH_CLEAN = rawBranch.replaceAll('^origin/', '')
```

### Testcontainers in Jenkins
The Jenkins container mounts the host Docker socket:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```
Testcontainers uses this socket to start PostgreSQL and Redis containers. `TESTCONTAINERS_RYUK_DISABLED=true` prevents Ryuk (the container reaper) from failing due to missing privileges.

### Docker Base Images
Docker Hub (`registry-1.docker.io`) has TLS connectivity issues on the university network. All Spring Boot Dockerfiles use:
```
mcr.microsoft.com/openjdk/jdk:17-ubuntu   (Microsoft Container Registry — accessible)
```
The ML service Dockerfile uses:
```
public.ecr.aws/docker/library/python:3.11-slim   (Amazon ECR Public mirror — accessible)
```

### Legacy Docker Builder
`DOCKER_BUILDKIT=0` is set for all `docker build` commands to avoid BuildKit's pre-flight metadata check against Docker Hub (which would TLS-timeout before the build even starts).

### Angular CSS Budget
`angular.json` component style budgets raised to `25 kB` warning / `30 kB` error to accommodate `vm-desktop.ts` (23 kB CSS).

---

## Jenkins Container Setup

The Jenkins container (`docker/jenkins/Dockerfile`) was extended with:

| Tool | Version | Purpose |
|---|---|---|
| Maven | 3.9.9 | Backend build |
| Node.js | 22.x | Angular 22 frontend (requires Node 22+) |
| Angular CLI | latest | `ng build`, `ng test` |
| Python 3 | system | ML service tests |
| pytest + deps | latest | `pytest`, `numpy`, `pandas`, `scipy`, `statsmodels` |
| Docker CLI (`docker.io`) | 26.x | Build images via host socket |
| Trivy | 0.74.0 | Vulnerability scanning |

> **Note:** The Jenkins image could not be rebuilt via `docker compose build` during setup due to Docker Hub TLS timeouts. All tools above were installed directly into the running container using `docker exec -u root jenkins`.

### Docker Socket Permissions
The socket `/var/run/docker.sock` is owned by GID 0 on the host. Fixed with:
```
docker exec -u root jenkins chmod 666 /var/run/docker.sock
```
This needs to be re-applied after a Docker Desktop restart.

---

## Pipeline Parameters

| Parameter | Default | Description |
|---|---|---|
| `SKIP_DOCKER` | `false` | Skip the Docker Build & Push stage even on main |
| `SKIP_SECURITY` | `false` | Skip both Trivy scans **and** OWASP Dependency-Check |

---

## Required Jenkins Plugins

| Plugin | Purpose |
|---|---|
| Pipeline | Core declarative pipeline support |
| Pipeline Stage View | Stage visualisation in Jenkins UI |
| JUnit | `junit()` step — publishes Surefire/Failsafe/pytest results |
| Git | Source checkout |
| OWASP Dependency-Check | `dependencyCheckPublisher()` step — trend graphs and thresholds |

> `cleanWs` (Workspace Cleanup plugin) is **not** installed; the pipeline uses `deleteDir()` in the `cleanup` post block instead.

---

## GHCR Credentials Setup

The Docker — Push stage requires a Jenkins credential to authenticate with GitHub Container Registry.

### 1. Create a GitHub Personal Access Token (PAT)
1. Go to `https://github.com/settings/tokens/new`
2. Note: `jenkins-ghcr-push`
3. Expiration: 90 days (or no expiration)
4. Scope: check **`write:packages`** (auto-checks `read:packages`)
5. Click **Generate token** — copy the `ghp_...` value immediately (shown only once)

### 2. Add the credential to Jenkins
Navigate to: `http://localhost:8090/manage/credentials/store/system/domain/_/newCredentials`

| Field | Value |
|---|---|
| Kind | `Username with password` |
| Username | `m2l33k` |
| Password | the `ghp_...` token |
| ID | `ghcr-credentials` ← must match exactly |

> **Not SSH.** GHCR uses token-based HTTP authentication. The PAT acts as the password for `docker login ghcr.io`.

### 3. What gets pushed
After a successful build on `main`, all 12 images are pushed:
```
docker push ghcr.io/m2l33k/<service>:<branch>-<commit>-<build#>
docker push ghcr.io/m2l33k/<service>:latest
```
Images are visible at `https://github.com/m2l33k?tab=packages`.

---

## Integration Test Classes

| Class | Service | Containers Used |
|---|---|---|
| `AuditServiceIT` | audit-service | none (in-memory) |
| `AnomalyServiceIT` | anomaly-detection-service | none (in-memory) |
| `ProtectionControllerIT` | rate-limiting-service | PostgreSQL 16-alpine + Redis 7-alpine |

All IT classes use `@ActiveProfiles("test")` which disables Eureka discovery and sets test-specific properties. OAuth2/Keycloak is bypassed using `SecurityMockMvcRequestPostProcessors.jwt()`.

---

## Docker Images Produced

All images are tagged `ghcr.io/m2l33k/<service>:<branch>-<commit>-<build#>` and `ghcr.io/m2l33k/<service>:latest`.

| Image | Port |
|---|---|
| auth-service | 9001 |
| roaming-analysis-service | — |
| anomaly-detection-service | — |
| rate-limiting-service | — |
| audit-service | 9009 |
| messaging-service | — |
| fivegc-service | — |
| distributed-tracing-service | — |
| fault-injection-service | — |
| gateway-service | — |
| eureka-server | — |
| ml-service | 8000 |
