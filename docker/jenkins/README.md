# Jenkins CI — Full Setup Guide

Jenkins runs on **port 8090** in Docker alongside the platform infra stack.
Three pipelines cover the full CI/CD lifecycle.

---

## Pipelines

| Pipeline file | Trigger | Purpose |
|--------------|---------|---------|
| `Jenkinsfile` | Every commit / PR | Compile → Test → Security scan → Docker (main only) |
| `jenkins/Jenkinsfile.docker` | Manual / main branch | Build all 12 images and push to GHCR |
| `jenkins/Jenkinsfile.release` | Manual with version input | Full release: test → build → push → git tag → release notes |

---

## Quick Start

### 1. Start the infra network

Jenkins joins `telecom-shared-network`. Start the infra stack first:

```bash
docker compose -f docker/docker-compose-infra.yml up -d
```

### 2. Build and start Jenkins

```bash
docker compose -f docker/docker-compose-jenkins.yml up --build -d
```

First build: **8–12 minutes** (downloads Jenkins LTS + Maven + Node + Python + Docker CLI + Trivy).

```bash
# Watch the build log
docker compose -f docker/docker-compose-jenkins.yml logs -f jenkins
```

### 3. Open Jenkins

```
http://localhost:8090
```

Get the initial admin password:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 4. Install plugins

When Jenkins asks, click **Install suggested plugins**. Wait ~2 minutes.

Then install these additional plugins manually
(**Manage Jenkins → Plugins → Available plugins**):

| Plugin | Purpose |
|--------|---------|
| **Pipeline** | Core declarative pipeline support |
| **Pipeline: Stage View** | Visual pipeline progress |
| **AnsiColor** | Coloured console output |
| **Workspace Cleanup** | `cleanWs()` step |
| **JUnit** | Test result publishing |
| **HTML Publisher** | Coverage report hosting |
| **Docker Pipeline** | `docker.build()` / `docker.push()` helpers |

### 5. Add credentials

**Manage Jenkins → Credentials → System → Global → Add Credentials**

| ID | Type | Value |
|----|------|-------|
| `ghcr-credentials` | Username/Password | GitHub username + Personal Access Token with `write:packages` |
| `github-pat` | Username/Password | GitHub username + PAT with `repo` scope (for git tag push) |

---

## Creating the Pipeline Jobs

### Main CI Pipeline

1. **New Item** → name: `5g-platform-ci` → **Pipeline** → OK
2. **Build Triggers**: check *GitHub hook trigger for GITScm polling*
3. **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: Git
   - Repository URL: your repo URL
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
4. Save → **Build Now**

### Docker Pipeline

1. **New Item** → name: `5g-docker-build` → **Pipeline** → OK
2. **This project is parameterized**: yes
3. **Pipeline** section:
   - Script Path: `jenkins/Jenkinsfile.docker`
4. Save

### Release Pipeline

1. **New Item** → name: `5g-release` → **Pipeline** → OK
2. **This project is parameterized**: yes
3. **Pipeline** section:
   - Script Path: `jenkins/Jenkinsfile.release`
4. Save

---

## Main CI Pipeline — Stage Map

```
Checkout
    │
    ├── Compile (parallel)
    │     ├── Backend  — mvn clean package -DskipTests -T4
    │     └── Frontend — npm ci + tsc --noEmit
    │
    ├── Verify (parallel)
    │     ├── Backend Tests  — mvn test -T4          → JUnit report
    │     ├── Frontend Tests — ng build + ng test    → JUnit report
    │     ├── ML Tests       — pytest tests/         → JUnit report
    │     └── Security Scan  — trivy fs .            → archived report
    │
    ├── Archive
    │     └── stash JARs, archive microservices/*/target/*.jar
    │
    └── Docker (main branch only)
          ├── Build 11 Spring Boot images (parallel)
          ├── Build ML image
          ├── Trivy scan key images (parallel)
          └── Push to GHCR (parallel)
```

---

## Test Coverage

| Service | Test class | Tests |
|---------|-----------|-------|
| `anomaly-detection-service` | `SlidingWindowTest` | 6 |
| `anomaly-detection-service` | `ZScoreEngineTest` | 5 |
| `anomaly-detection-service` | `AnomalyStoreTest` | 6 |
| `anomaly-detection-service` | `RuleStoreTest` | 10 |
| `audit-service` | `AuditStoreTest` | 9 |
| `fivegc-service` | `NfStatusServiceTest` | 4 |
| `roaming-analysis-service` | `KpiCalculatorTest` | 5 |
| `ml-service` | `test_ensemble.py` | 8 |
| `ml-service` | `test_trainer_state.py` | 9 |

---

## Release Workflow

```bash
# Trigger the release pipeline with version 1.2.0 (dry run first)
# In Jenkins UI: 5g-release → Build with Parameters
#   RELEASE_VERSION = 1.2.0
#   DRY_RUN         = true      ← test run, no push, no tag

# If dry run passes, re-run with DRY_RUN = false to publish
```

Release pipeline creates:
- Docker images tagged `v1.2.0` and `latest` pushed to GHCR
- Git tag `v1.2.0` pushed to GitHub
- `RELEASE_NOTES.md` archived as a build artifact

---

## Useful Commands

```bash
# View logs
docker logs jenkins -f

# Restart Jenkins (after plugin install)
docker compose -f docker/docker-compose-jenkins.yml restart jenkins

# Stop (keeps data)
docker compose -f docker/docker-compose-jenkins.yml down

# Wipe everything (including jobs and plugins)
docker compose -f docker/docker-compose-jenkins.yml down -v

# Open Jenkins shell (debugging)
docker exec -it jenkins bash

# Check Trivy is available
docker exec jenkins trivy --version

# Check Docker CLI is available
docker exec jenkins docker version
```

---

## Ports

| Service | Port |
|---------|------|
| Jenkins UI | http://localhost:8090 |
| Jenkins agent | 50000 |
