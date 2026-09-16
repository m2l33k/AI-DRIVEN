# Jenkins CI — Setup Guide

Jenkins is hosted in Docker alongside the platform infrastructure.
It runs on **port 8090** and executes unit tests for all Spring Boot services,
the Angular frontend, and the ML service.

---

## Quick Start

### 1. Start the infra network (if not already running)

Jenkins joins `telecom-shared-network`. Start the infra stack first so the network exists:

```bash
docker compose -f docker/docker-compose-infra.yml up -d
```

### 2. Build and start Jenkins

```bash
docker compose -f docker/docker-compose-jenkins.yml up --build -d
```

First build takes **5–8 minutes** (downloads Jenkins LTS + Maven + Node 20).

### 3. Open Jenkins

```
http://localhost:8090
```

Default credentials (setup wizard disabled):
- Username: `admin`
- Password: check `docker logs jenkins` for the initial password line, or run:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 4. Install suggested plugins

On first login Jenkins will ask to install plugins — click **Install suggested plugins**.
Wait ~2 minutes for installation to complete.

### 5. Create the pipeline job

1. Click **New Item**
2. Enter name: `5g-platform-ci`
3. Select **Pipeline** → OK
4. Under **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: your repo URL (or use `file:///workspace` for the mounted repo)
   - Script Path: `Jenkinsfile`
5. Save → **Build Now**

---

## Pipeline Stages

| Stage | What it does |
|-------|-------------|
| **Checkout** | Prints branch name and workspace path |
| **Build — Spring Boot** | `mvn clean package -DskipTests -T4` across all modules |
| **Unit Tests — Spring Boot** | `mvn test` — runs all JUnit 5 tests, publishes XML reports |
| **Install — Frontend** | `npm ci` inside `Frontend/` |
| **Lint — Frontend** | `ng lint` (non-blocking) |
| **Build — Frontend** | `ng build --configuration production` |
| **Unit Tests — Frontend** | `ng test --watch=false --browsers=ChromeHeadless` |
| **Test — ML Service** | `pytest forecasting/` with JUnit XML output |

Test results are published as JUnit reports visible in the Jenkins UI per build.

---

## Test Coverage

### Spring Boot Unit Tests

| Service | Test class | What is tested |
|---------|-----------|----------------|
| `anomaly-detection-service` | `SlidingWindowTest` | Mean, stddev, eviction, z-score spike |
| `anomaly-detection-service` | `ZScoreEngineTest` | Alert firing, dedup cooldown, zero-stddev guard |
| `anomaly-detection-service` | `AnomalyStoreTest` | Ring buffer cap (500), newest-first, getRecent limit |
| `anomaly-detection-service` | `RuleStoreTest` | 5 seeded rules, toggle, save, delete, createdAt preserved |
| `audit-service` | `AuditStoreTest` | Append, query filters, ring buffer cap (10k), stats |
| `fivegc-service` | `NfStatusServiceTest` | NF up/down derivation from Docker container list |
| `roaming-analysis-service` | `KpiCalculatorTest` | ASR, NER, ACD, session success, latency percentiles |

### Frontend
Angular Karma tests run in headless Chrome. Results published as JUnit XML.

### ML Service
Python pytest tests in `ml-service/forecasting/`. Results published as JUnit XML.

---

## Stopping Jenkins

```bash
docker compose -f docker/docker-compose-jenkins.yml down
```

Data (jobs, configuration, plugins) is persisted in the `jenkins-home` named volume.
To wipe everything: `docker compose -f docker/docker-compose-jenkins.yml down -v`

---

## Ports

| Service | Port |
|---------|------|
| Jenkins UI | http://localhost:8090 |
| Jenkins agent | 50000 |
