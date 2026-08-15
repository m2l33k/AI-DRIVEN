---
title: Scripts and Tooling
tags: [infra, scripts, docker, tooling]
updated: 2026-08-14
---

# Scripts & Tooling

Every helper script and orchestration file at the repo root, what it actually does, and the
**gotchas** (several scripts are stale — they only launch the original three services). Ports and
URLs live in [[Ports-and-URLs]]; the *why* behind the infra shape is in [[Architecture-Decisions]].

## Helper scripts (repo root)

| Script | Purpose | Covers |
|--------|---------|--------|
| `run.sh` | Build (Maven) + run the app services | ⚠️ **eureka + gateway + auth only** |
| `infra.sh` | Bring up/down infra + observability containers | all of `docker-compose-infra.yml` + `-observability.yml` |
| `build-images.sh` | Build Docker images into Minikube's daemon | ⚠️ **eureka + gateway + auth only** |
| `create-project.sh` | Scaffold a new Spring Boot module | n/a |
| `Tiltfile` | Local k8s dev loop (Tilt) with live-update | ⚠️ **eureka + gateway + auth only** |

### `run.sh`
- `./run.sh` → `mvnw clean package -DskipTests`, then runs each service's fat JAR locally.
  Frees ports 8761/9000/9001, starts **eureka**, waits 15s, then **auth** + **gateway**.
- `./run.sh docker` → package, then `docker compose -f docker/docker-compose-base.yml up --build`.
- `./run.sh --no-build` → skip Maven, run existing JARs.
- Sources repo-root **`.env`** (with `set -a`) so `MAIL_*` / `KC_SMTP_*` reach both local JARs and
  compose substitution. See [[Auth-Service]] (email) and [[Ports-and-URLs]].
- ⚠️ **Gotcha:** the local-JAR path only launches **eureka + auth + gateway**. It does **not** start
  `roaming-analysis-service` (9002) or the four placeholders (9003–9006). Start those manually
  (`java -jar` / IDE) or via `./run.sh docker` (compose-base includes them). Follow-up in [[Next-Steps]].

### `infra.sh`
- Wraps `docker compose` over **both** `docker/docker-compose-infra.yml` **and**
  `docker/docker-compose-observability.yml`.
- `up` (default) / `down` / `down -v` (wipes volumes) / `status` / `logs [svc]` / `urls`.
- Brings up Keycloak (+`keycloak-postgres`), roaming MySQL, the four per-service Postgres +
  the two Redis, legacy Postgres/Mongo, and the whole observability stack.
- ⚠️ The header comment + `urls` output are **stale** (still say only "Keycloak, PostgreSQL,
  MongoDB" and print the legacy Postgres/Mongo). The compose files it references are current;
  the printed URL list just hasn't been updated for the new DBs — see [[Ports-and-URLs]] for the
  real set.
- **Run `infra.sh up` before `run.sh`** — no cross-file `depends_on` between infra DBs and the
  services (ADR-09 in [[Architecture-Decisions]]).

### `build-images.sh`
- `eval $(minikube docker-env --profile microservice-deployment)` then `docker build` each service
  into Minikube's daemon. ⚠️ Same staleness: **eureka + gateway + auth only** — add roaming +
  9003–9006 before a full k8s deploy.

### `create-project.sh`
- Scaffolds a new Spring Boot module (the [[Backend-and-Infra|service template]]). Use it, then do
  the manual wiring: register in root `pom.xml`, add gateway routes + Swagger entry (both profiles),
  whitelist any public paths at the gateway. See [[Platform-Services]] for the full checklist.

### `Tiltfile`
- Tilt local-k8s dev loop: `k8s_yaml` for infra (keycloak/postgres/mongodb) + observability, then
  `docker_build` + `k8s_resource` with **live-update** (sync `src/` → rebuild) for eureka, auth,
  gateway. ⚠️ Also **only those three** app services + the legacy infra set — not updated for the
  per-service Postgres/Redis/MySQL or the new services (ADR-09 "not yet wired for Kubernetes").

## Docker Compose files (`docker/`)

| File | What it defines |
|------|-----------------|
| `docker-compose-base.yml` | The **app services** (eureka, gateway, auth, roaming, + 9003–9006) on `shared-network`, fluentd logging → Fluent Bit, `depends_on: eureka`. |
| `docker-compose-infra.yml` | **Stateful infra:** Keycloak + `keycloak-postgres`, `roaming-mysql`, the 4 per-service Postgres (5433–5436), 2 Redis (6379/6380), legacy `postgres`/`mongodb`, named volumes. |
| `docker-compose-observability.yml` | Prometheus, Grafana, Loki, Tempo, Fluent Bit. |
| `dashboard-1.yml` | Extra Grafana dashboard definition. |
| `prometheus/`, `grafana/`, `loki/`, `tempo/`, `fluent-bit/`, `postgresql/` | Per-tool config mounted into the containers. `prometheus/prometheus.yml` scrapes host apps via `host.docker.internal` (gateway/eureka/auth/roaming) so metrics flow while services run locally. |

- `infra.sh` = infra + observability compose files together; `run.sh docker` = base compose only.
- Validate a compose file: `docker compose -f docker/<file> config`.
- **Bring up ONE infra container** (e.g. a single new DB) without recreating/removing the rest:
  `docker compose -f docker/docker-compose-infra.yml up -d --no-deps <service>` — `--no-deps` + a
  single service name touches only that container; the running stack is left as-is. (An "orphan
  containers" warning for the observability services is harmless — don't pass `--remove-orphans`.)

## Kubernetes
- Per-service manifests live in each module's `kubernetes/deployment.yml` + `service.yml`
  (ClusterIP `80 → <port>`). Shared infra manifests under `kubernetes/infrastructure/`.
- ⚠️ The new per-service Postgres/Redis (ADR-09) and MySQL are **docker-compose only** — no k8s
  StatefulSets or datasource env yet. Tracked in [[Next-Steps]].

## API testing — Bruno collection (`api-specs/bruno/`) — *was undocumented (found 2026-08-15)*
A **[Bruno](https://usebruno.com)** collection (open-source Postman alternative; `.bru` files).
- `AccessToken.bru` — `POST {{keycloakBaseUrl}}/realms/auth-management/protocol/openid-connect/token`
  (password grant, `client_id=platform-client`, `client_secret=platform-client-secret`,
  `username=operator-user`, `password=password`, `scope=openid roles`) → grabs a JWT for hitting the
  gateway/services. Handy for **Swagger Authorize** or `curl -H "Authorization: Bearer …"`.
- `environments/docker.bru` + `environments/kubernetes.bru` — env vars (`keycloakBaseUrl`, …) for the
  two deployment targets; `bruno.json` is the collection manifest.
- Swap `operator-user` for `analyst-user`/`admin-user` (all pw `password`) to get a token with the
  perms you need. See [[Roles-and-Permissions]] · [[Auth-Service]].

## Grafana dashboards on disk (`grafana-dashboard/`) — *was under-documented*
- Pre-existing **community Spring Boot** dashboards: `Spring Boot 3.x Statistics.json` +
  `Spring Boot Observability.json` (+ a `provisioning/` folder). These are the generic JVM/HTTP
  boards, **distinct** from `docker/grafana/` (datasource/provisioning config) and from
  `docker/dashboard-1.yml` (another dashboard JSON, misleading `.yml` extension).
- The **planned custom** dashboards (NF KPIs, security/anomaly, zero-trust, roaming…) are designed in
  [[Grafana-Dashboards]] — export those JSONs here to have them provisioned.

## Keycloak scripts (`keycloak/`)
- `export-realm.{ps1,sh}` — `kc.sh export` (incl. users) → `platform-realm.json` (config-as-code;
  ADR-10). **Restore `${KC_SMTP_*}` placeholders before committing** — export hardcodes SMTP.
- `configure-smtp.{ps1,sh}` — set realm SMTP live via the Admin API (reads `.env`).
- Detail: [[Auth-Service]] · [[Architecture-Decisions]] (ADR-04/ADR-10).

## Related notes
- [[Backend-and-Infra]] · [[Ports-and-URLs]] · [[Platform-Services]] · [[Architecture-Decisions]] · [[Next-Steps]]
