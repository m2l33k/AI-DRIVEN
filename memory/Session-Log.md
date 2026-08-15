---
title: Session Log
tags: [log, journal]
updated: 2026-08-15
---

# Session Log

Chronological record of what we did. Newest first. Add an entry whenever you finish
something meaningful.

## 2026-08-15

### rate-limiting gateway enforcement — REVERTED (perf regression) (detail: [[Platform-Services]] · ADR-11 retired)
- The gateway `RateLimitGlobalFilter` (added earlier the same day) made the **gateway + all services
  slow**: it put a **synchronous per-request call** to `rate-limiting-service` on the hot path; with
  that service **not running**, every request waited for a connection failure before failing open.
- First mitigation: default the filter **OFF** + 300 ms timeout + exclude `/api/auth`. Then, at the
  user's request, **fully removed it**: deleted the gateway `com.example.springcloud.gateway.ratelimit`
  package (`RateLimitGlobalFilter`/`RateLimitClient`/`RateLimitConfig`/`RateLimitProperties`), the
  `protection.enforcement` block in gateway `application.yml`, the limiter's `InternalProtectionController`,
  and the `/internal/**` permit in its `SecurityConfig`. Gateway is back to plain routing + JWT.
- **Kept:** the standalone limiter (`/check`,`/policies`,`/stats`) + the Swagger-Authorize and
  PUT-DTO (`RateLimitPolicyDto` + `ApiExceptionHandler`) fixes. The frontend Rate Limiting page is
  unaffected (calls the service directly). **ADR-11 retired.** Both modules compile (EXIT=0).

### Decision: use free5GC as the 5G Core substrate (detail: [[5GC-Core]] · ADR-13)
- Chose **free5GC** (open-source Go NFs) + **UERANSIM** as the real core; this Spring repo stays the
  **harness** (security/observability/test) around it — **not** hand-building NFs. Rationale in the
  proposal §2.2 (vanilla core = diminishing value; the 3 added layers are the contribution). free5GC
  over open5GS for **NRF-OAuth2 + SBI-TLS** (zero-trust Layer 01 / SEC-02).
- **⚠️ Environment reality captured:** free5GC UPF needs the **`gtp5g` kernel module** → Ubuntu
  VM/WSL2 (proposal §7 target), not bare Windows/mac Docker; deploy via `free5gc/free5gc-compose`.
- Wrote **[[5GC-Core]]** (NF list, topology diagram, layer mapping, integration checklist),
  **ADR-13**, and updated [[Proposal-Internship]] / [[Next-Steps]] / [[README]]. No code yet —
  integration starts once a Linux+gtp5g host is provisioned.

### roaming-analysis-service — CSV analysis, traffic simulation, stronger anomaly detection (detail: [[Roaming-Analysis-Service]])
- **3 new capabilities on the existing (synthetic `RoamingEvent`) analytics**, all compiling
  (`mvnw -o -f microservices/roaming-analysis-service/pom.xml compile` → EXIT=0):
  - **`POST /api/roaming/upload`** (multipart CSV, `?hoursAhead=`) → `CsvAnalysisDto` = summary +
    anomalies + forecast computed over the uploaded file. **Nothing persisted.** New
    `ingest/RoamingEventCsvParser` — lenient (snake/camel headers, blank→default), derives missing
    QoS/commercial columns from signals, so a minimal file (`direction, partner_plmn, country,
    subscribers, signaling_errors, new_device_ratio, impossible_travel`) suffices. Returns
    `CsvParseResult(fileName, events, parsed, skipped, columns)`.
  - **`POST /api/roaming/simulate`** (`?count=&minutesSpread=&windowMinutes=`) → `SimulationResultDto`
    = generated count + a fresh `/live` snapshot + sample. New `service/RoamingSimulator` generates
    realistic events (≈18% injected anomalies: fraud PLMNs, impossible travel, signalling storms),
    **persisted** with `SIM-` id prefix so `/live` + `/anomalies` react.
  - **Stronger `/anomalies`** — new `analysis/AnomalyDetector` (component) replaces the inline rules.
    Composite **`anomalyScore` (0-100)** = ½ fraud risk + capped population **z-score deviations**
    (latency, drop ratio, signalling errors, new-device ratio, low throughput, unusual volume) + a
    bump for impossible travel. `AnomalyDto` gained `anomalyScore` + `baselineDeviation` (max σ).
    Works over any event list (DB, uploaded CSV, simulated batch).
- Refactors to enable the above: `RoamingAnalysisService.summary(List)` overload,
  `RoamingInsightsService.forecast(int,List)` overload; `RoamingInsightsService` now delegates
  anomalies to `AnomalyDetector` and orchestrates `analyzeCsv` / `simulate`. `application.yml`
  gained `spring.servlet.multipart` 25 MB limits.
- **Frontend fully wired** (was mock). New `roaming.service.ts` (typed client for **all 13**
  endpoints). Split into a **sidebar "Roaming" group** with 7 lazy sub-pages (see below).

### rate-limiting-service — fixes + **gateway enforcement on real traffic** (detail: [[Platform-Services]])
- **Swagger "Authorize" fix:** `OpenApiConfig` was missing `@SecurityScheme(name="bearerAuth", …)` —
  lock icons showed but the button couldn't take a token. Added it (mirrors roaming's).
- **PUT policy 400 bug fix:** `PUT /policies/{keyType}` bound the JSON to the JPA **entity**
  (`RateLimitPolicy` has record-style accessors, no setters) → Jackson `FAIL_ON_UNKNOWN_PROPERTIES`
  → 400, nothing saved; `GET /policies` also serialized `{}`. Added **`RateLimitPolicyDto`** (record,
  validated `@Min(1)` / `@NotNull action`) used for both read & write, + **`ApiExceptionHandler`**
  (`@RestControllerAdvice`) returning detailed 400s (`{error, fields{…}}` / `{error, details}`).
- **403 clarified (not a bug):** user's token was **PLATFORM_ADMIN** which lacks
  `detection-rules:write` (and `roaming-events:read`) — writes require SECURITY_ANALYST. Confirmed
  via realm: `analyst-user`/`password`. `platform-client` = confidential, `directAccessGrantsEnabled`,
  secret `platform-client-secret`.
- **Gateway enforcement (Option 1) — the limiter now protects the other services.** New in
  `gateway-service` (`com.example.springcloud.gateway.ratelimit`): `RateLimitGlobalFilter`
  (reactive `GlobalFilter`, order `HIGHEST_PRECEDENCE+100`) keys each request by IMSI header →
  `imsi`, operator header → `operator`, else client IP → `ip`; calls the limiter and short-circuits
  **429** + `Retry-After` on deny; **fail-open** on error. `RateLimitClient` (load-balanced WebClient
  → `lb://rate-limiting-service`), `RateLimitProperties` (`protection.enforcement.*`), `RateLimitConfig`
  (`@LoadBalanced WebClient.Builder`). New **internal** decision endpoint on the limiter —
  `InternalProtectionController` `POST /internal/protection/check` (unauthenticated, `/internal/**`
  permitted in its `SecurityConfig`, never routed publicly) so the gateway needn't carry a user JWT.
  Excluded from limiting: `/api/protection`, `/internal`, `/actuator`, `/swagger-ui`, `/eureka`,
  `/api/auth`, any `*/v3/api-docs`. Both services compile (EXIT=0).

### Frontend — permission-aware auth, nested sidebar, gauge chart, Rate Limiting + Roaming pages (detail: [[Frontend-Components]] · [[Frontend-Architecture]])
- **`AuthService` now exposes permissions:** `CurrentUser.permissions` decoded from
  `resource_access.platform-client.roles`; new `permissions` signal + `hasPermission(p)`. Used to
  gate write UI (matches backend `PERM_*`).
- **Nested sidebar menus:** `NavItem` gained optional `children?: NavItem[]`; `RoleShell` renders an
  expandable group (chevron, auto-opens on active child, active sub-item highlight).
- **New `hw-gauge-chart`** (`shared/charts/gauge-chart.ts`) — 270° radial 0-100 gauge, auto-grades
  red→amber→green (invertible for latency-style metrics). 4th chart type alongside line/bar/donut.
- **Rate Limiting page** (`security-analyst/rate-limiting/`, nav "Rate Limiting"): live `/stats`
  KPIs (5s poll) + policies table + top-offenders + **full CRUD** (create/edit/delete) gated on
  `hasPermission('detection-rules:write')` + a decision tester (**Send 1 / Burst ×20** with OK/429
  chips, immediate stats refresh). Detailed backend errors surfaced (`describeError`). Route
  `security/rate-limiting`.
- **Roaming → sidebar group with 7 sub-pages** (replaces the old single mock `roaming-events` page;
  folder moved to `security-analyst/roaming/`): **Overview** (volume line, risk donut, direction
  donut, avg-risk gauge, forecast line, live stats), **Events** (top-partners bar + filter table +
  detail), **Anomalies** (severity cards + top-score bar + severity donut + table), **Partners**
  (avg-risk bar + peak-risk donut + table), **QoS & Experience** (QoS gauge + KPIs + experience bar
  + table), **Revenue** (KPIs + revenue bar + inbound/outbound donut + margin gauge + optimization
  table), **Tools** (CSV upload + simulate). Routes `security/roaming/*` (`roaming` → `overview`);
  security nav "Roaming Analysis" → **"Roaming"** group.
- Verified: `ng build --configuration development` → complete, all 7 roaming chunks + rate-limiting
  chunk emitted, no errors. (Fixed 2 template snags: `number` pipe `string|null` → `?? ''`; a literal
  `{keyType}` parsed as an ICU brace → `:keyType`.)

## 2026-08-14

### rate-limiting-service — Role A: real Redis token-bucket limiter (detail: [[Platform-Services]])
- Turned the placeholder into a working limiter. New `io.javatab.microservices.ratelimit` code:
  `domain/RateLimitPolicy` (@Entity, keyed by `keyType`) + `RateLimitAction`; `repository/*` +
  `PolicySeeder` (seeds `default` 100/min, `imsi` 20/min→BLOCK, `operator` 2000/min, `ip` 300/min);
  `ratelimit/TokenBucketService` (atomic **Lua** `token_bucket.lua`, allow/block counters +
  top-blocked ZSET); `config/SecurityConfig` (JWT, copied from roaming) + `config/RedisConfig`;
  `web/ProtectionController` + DTOs.
- API `/api/protection`: `POST /check` (decide+consume → 200 or **429** + `Retry-After`),
  `GET/PUT/DELETE /policies`, `GET /stats`. **Fail-open** on missing policy / Redis error.
- Wiring: pom +security/+oauth2-resource-server/+validation; `application.yml` +Keycloak issuer
  (both profiles); **gateway** now enforces `PERM_protection:read` (+`manage` on policy writes),
  `/api/protection/health` stays public. Added the infra-deps clarifying comment to the
  `rate-limiting-service` block in `docker-compose-base.yml`.
- **Redis check:** `ratelimit-redis` (:6379, appendonly, healthcheck, volume) was **already**
  present in `docker-compose-infra.yml` — no new container needed; the `docker` profile already
  points at it. Same for `ratelimit-postgres` (:5434).
- **No Keycloak change (user request):** dropped the planned `protection:read/manage` roles and
  instead **reused existing perms** — reads → `roaming-events:read`, writes → `detection-rules:write`
  (both held by SECURITY_ANALYST). Updated controller `@PreAuthorize` + gateway matchers.
- **Docker image built:** packaged the fat jar (`package -DskipTests`) then
  `docker compose -f docker-compose-base.yml build rate-limiting-service` →
  **`docker-rate-limiting-service:latest`** (~573 MB), EXIT=0. (Not yet run — needs infra up.)
- Verified: `mvnw -pl microservices/rate-limiting-service compile` + `package` → **EXIT=0**.

### roaming-analysis-service — REDESIGN Phase 1: real dataset model + ingestion (detail: [[Roaming-Analysis-Service]])
- Motivation: replace the synthetic single-aggregate `RoamingEvent` (12 seeded rows) with the real
  relational `Data/Data/` dataset (~39k rows across 6 CSVs). See the **Redesign** section of the note.
- **Phase 1 (additive, build stays green):** 6 JPA entities mirroring the CSVs — `Device`,
  `NetworkCell`, `RoamingCdr` (fact: fraud_flag, TAP/NRTRDE, charged/wholesale, settlement),
  `AttachEvent` (auth_failure, reject_cause, reg-delay), `SessionQos`, `HandoverEvent` — + their
  `JpaRepository`s. Added `ingest/CsvDataLoader` (`CommandLineRunner`, OpenCSV, empty-table guard,
  lenient blank→null parsing) loading dimensions then facts from `roaming.data-dir` (default repo
  `Data/Data`, classpath `seed/` fallback). pom +`opencsv`; `application.yml` +`roaming.data-dir` +
  `roaming.home-operators`. Old `RoamingEvent`/seeder/analytics left intact for now.
- **Still TODO (Phase 2/3):** rewrite `RiskAnalyzer` + re-point every endpoint to real aggregates;
  add `/fraud`, `/handovers`, `/settlement`, `/attach`; then delete the synthetic entity/seeder.
- Verified: `mvnw -pl microservices/roaming-analysis-service compile` → **EXIT=0**.

### Internship proposal captured in the vault (detail: [[Proposal-Internship]])
- Added **[[Proposal-Internship]]** — the full Cloud-Native 5G Core proposal (3 differentiating
  layers: Zero-Trust, Anomaly Detection, Conformance Test Framework) with a *"how this maps to the
  repo"* section. Indexed in [[README]].

### Memory vault review + refresh (detail: this file)
- Reviewed the whole `memory/` vault against the codebase (git log, root `pom.xml` modules,
  `docker/`, `keycloak/`, `Frontend/`, `Noted/`). Vault content was accurate; the drift was in
  **process notes**, now fixed:
  - **[[Git-Workflow-and-History]]** was badly stale (still listed frontend/roaming/memory as
    "uncommitted on main"). Rewrote it: `git log` confirms it's all committed on `main`. Only two
    **untracked personal CV files** remain in `Noted/Assets/` (not project artefacts) — flagged for
    `.gitignore`/removal.
  - Fixed **[[Session-Log]]** frontmatter date (was 2026-08-08 despite 08-10 entries).
- **Added a new note [[Scripts-and-Tooling]]** — the main undocumented area. Covers `run.sh`,
  `infra.sh`, `build-images.sh`, `create-project.sh`, `Tiltfile`, and the `docker/` compose files.
  Captured a real **gotcha**: `run.sh` (local-JAR path), `build-images.sh`, and the `Tiltfile` only
  launch **eureka + gateway + auth** — they were never updated for roaming (9002) or the four
  placeholders (9003–9006); `infra.sh`'s header/`urls` output is also stale. Added a follow-up in
  [[Next-Steps]].
- Linked the new note from the vault [[README]] index.

### Academic presentation deck (detail: [[Presentation]])
- Created **`Noted/PRESENTATION.md`** — a full academic / internship defense outline (Huawei / TT
  5G Core context) following the requested 8-part structure, grounded in the real codebase (not
  filler). Uses «angle-bracket» placeholders for name/dates/KPIs. Indexed in `Noted/INDEX.md`.
- Added vault note **[[Presentation]]** pointing at it (with sourcing links + "before submitting"
  caveats); linked from [[README]] and root `PROJECT_MEMORY.md`.

## 2026-08-10

### Keycloak now persisted to Postgres (stop losing users/realm changes) (detail: [[Auth-Service]] · ADR-10)
- **Problem:** `start-dev` used embedded **H2 inside the container** (no volume) → users + runtime
  realm changes were lost on `infra.sh down`.
- **Fix:** added dedicated **`keycloak-postgres`** (host 5437, DB `keycloak_db`, volume
  `keycloak-postgres-data`); wired Keycloak with `KC_DB=postgres` + `KC_DB_URL/USERNAME/PASSWORD`
  + `depends_on: keycloak-postgres (healthy)`. Now data survives restarts + `down` (not `down -v`).
- **Config-as-code:** added `keycloak/export-realm.ps1` + `.sh` — `kc.sh export` (incl. users) →
  `platform-realm.json`, re-imported on a fresh DB. Caveat noted: export hardcodes SMTP, restore
  `${KC_SMTP_*}` placeholders before committing.
- Verified: `docker compose -f docker-compose-infra.yml config` → valid.

### Per-service databases for the 4 placeholders (detail: [[Platform-Services]] · ADR-09 in [[Architecture-Decisions]])
- **Database-per-service:** gave each new service its **own dedicated Postgres** container
  (`anomaly-postgres` 5433, `ratelimit-postgres` 5434, `tracing-postgres` 5435, `fault-postgres`
  5436; DBs `<name>_db`, user/pass = name). Added **Redis** only where needed: `anomaly-redis`
  (6380) + `ratelimit-redis` (6379). All in `docker/docker-compose-infra.yml` (+ named volumes).
- Deps per service: `spring-boot-starter-data-jpa` + `postgresql`; anomaly & rate-limiting also
  `spring-boot-starter-data-redis`. `application.yml` datasource (+redis) with default → localhost
  and `docker` profile → container hostnames. JPA `ddl-auto=update`, no entities yet.
- **No cross-file `depends_on`** (DBs in infra compose, services in base compose, started
  separately) — start `./infra.sh up` first. Verified: `mvnw compile` on all 4 → **EXIT=0**;
  `docker compose -f docker-compose-infra.yml config` → valid.

### Four new empty placeholder microservices (health-check only) (detail: [[Backend-and-Infra]])
- Added 4 empty services mirroring the service template, each with **only** a health endpoint
  (`GET /api/<slug>/health` → `{status:UP, service, timestamp}`) plus actuator/eureka/springdoc:
  - `anomaly-detection-service` :9003 → `/api/anomaly` (pkg `io.javatab.microservices.anomaly`)
  - `rate-limiting-service` :9004 → `/api/protection` (pkg `...ratelimit`)
  - `distributed-tracing-service` :9005 → `/api/tracing` (pkg `...tracing`; Jaeger facade placeholder)
  - `fault-injection-service` :9006 → `/api/fault` (pkg `...faultinjection`)
- **No security/JPA** in these modules (kept lean) — deps: web, eureka-client, actuator,
  micrometer-prometheus, springdoc. Each has `Dockerfile` (layered) + `kubernetes/deployment.yml`
  & `service.yml`.
- Wiring: registered all 4 in root `pom.xml`; added gateway routes + docs routes + Swagger
  aggregation entries (both default + `docker` profiles); whitelisted the 4 health paths as
  **public** in the gateway `SecurityConfig` (WebFlux); added all 4 to `docker-compose-base.yml`
  (fluentd logging, shared-network).
- Verified: `mvnw compile` on the 4 services + gateway → **EXIT=0**.
- Note: Jaeger itself (tracing backend) is not yet added to the observability compose — the
  `distributed-tracing-service` is only a placeholder facade for now.

### Infrastructure diagrams + service catalogue (detail: [[Backend-and-Infra]])
- Added a new **`Noted/diagram/`** folder with PlantUML infra design:
  - `infrastructure.puml` — end-to-end Docker `shared-network` topology (client → gateway →
    microservices → identity → data stores → observability), reflecting the real
    `docker/docker-compose-*.yml`.
  - `services.puml` — full service catalogue grouped by tier, with ports + source paths.
  - `README.md` — render instructions + a table listing **all services in the design**.
- Services in the design (see the diagram README): `eureka-server` :8761, `gateway-service` :9000,
  `auth-service` :9001, `roaming-analysis-service` :9002, `util` (lib), `keycloak` :8081→8080,
  `roaming-mysql` :3307→3306 (active), `postgres` :5432 + `mongodb` :27017 (legacy/optional),
  observability (`prometheus` :9090, `grafana` :3000, `loki` :3100, `tempo` :4317/4318/3200,
  `fluent-bit` :24224), and the Angular 22 `Frontend/`.
- The pre-existing `Noted/uml/` diagrams (deployment/component) predate the roaming service and
  MySQL — the new `Noted/diagram/` set is the current source of truth for infra.
- User exported the rendered diagrams to **`Noted/Assets/`**: `infra 5GC.png` (infrastructure
  topology) + `service infra.svg` (service catalogue). Both are embedded in
  `Noted/diagram/README.md` (paths URL-encoded, `%20` for the spaces).

## 2026-08-08

### Roaming service — MySQL persistence + business analytics (detail: [[Roaming-Analysis-Service]])
- Converted `RoamingEvent` to a **JPA entity** (MySQL, table `roaming_events`) with new QoS/commercial
  columns; `RoamingEventRepository` → `JpaRepository`; `RoamingDataSeeder` seeds on first start.
  Added `spring-boot-starter-data-jpa` + `mysql-connector-j`; datasource in application.yml
  (local `localhost:3307`, docker `roaming-mysql:3306`). **Docker:** `roaming-mysql` (mysql:8.4) in
  `docker-compose-infra.yml`, host port 3307, volume `roaming-mysql-data`.
- New `RoamingInsightsService` + 7 endpoints covering all 8 asks: `/live` (real-time), `/anomalies`,
  `/forecast` (linear regression), `/experience`, `/qos`, `/optimization` (agreements + cost),
  `/revenue`. Heuristic/statistical, explainable. `mvnw compile` → clean.

### Admin monitoring + gateway metrics endpoint (detail: [[Frontend-Architecture]] · [[Backend-and-Infra]])
- New admin **System Health** page (`roles/admin/monitoring`): service health (`/infra-health/*`
  dev-proxy → `:port/actuator/health`), **live gateway JVM metrics** (poll `/actuator/metrics/*`,
  proxy `/actuator` → :9000; KPI cards + CPU/heap/request-rate curves via new `line-chart [smooth]`),
  and **request metrics** from a new gateway endpoint. Tool link cards to Grafana/Prometheus/Eureka/
  Tempo/Loki/Swagger/Keycloak/Actuator.
- **Gateway endpoint `GET /api/metrics/overview`** (`gateway-service/web/MetricsController`): reactive
  `WebClient.create` → Prometheus `/api/v1/query` (PromQL on `http_server_requests_seconds_*`, `jvm_*`,
  `process_*`); returns totalRequests, RPS, exceptions, %2xx/%5xx, requests-by-URI, avg-duration, JVM.
  Config `prometheus.base-url` (local `:9090` / docker `prometheus:9090`). Secured `PERM_platform-config:read`
  at the gateway. Gotcha: use `WebClient.create(...)` — no `WebClient.Builder` bean in this gateway.
- Tried embedding Grafana (iframe + `GF_SECURITY_ALLOW_EMBEDDING`) then **removed** it (app runs local,
  Grafana is Docker). **Removed** `admin/platform-config` page/route/nav.
- Added new **API Metrics** page (`roles/admin/metrics`, nav item): polls `/api/metrics/overview` (5s)
  → KPI cards + bar chart (top endpoints) + donut (2xx/5xx/other) + bar chart (slowest) + table.
  Moved the request-metrics out of System Health (now health + live JVM only).
- `docker/prometheus/prometheus.yml` already scrapes host via `host.docker.internal` (gateway/eureka/
  auth); added **roaming (9002)**. So metrics flow while services run locally.

### Frontend — glass sidebar, roles page, real admin dashboard (detail: [[Frontend-Architecture]])
- **Glassmorphism sidebar** (`shared/layout/role-shell`): floating translucent panel, backdrop blur,
  crimson theme (`#c11536→#8a0f2a`), Main + Account sections, notification badges, bottom user
  profile (avatar/name/email/three-dot menu), 3 states (expanded / collapsed 76px / mobile overlay).
  Brand is just **5GC**; search uses a proper magnifier icon. (Personal/Business toggle was added
  then removed per request.) Change-password modal lives here (all roles). Style budget bumped in
  `angular.json` (anyComponentStyle 12kB warn).
- **PageHeader** now shows a clickable **Home › <page>** breadcrumb (Home → `auth.homeRoute()`).
- **Admin Users** page: client-side **pagination (10/page)** + search.
- **Roles & Permissions** (`admin/roles`): static page mirroring Keycloak — **profile cards** with
  per-role images (banner + avatar), **permission matrix** (16 perms × 4 roles, computed from role
  data), and a **click-to-open detail popup** per role. Read-only (roles managed in Keycloak).
- **Admin dashboard** now **live** from `GET /api/users`: stat cards (Total, New this month, Active,
  Active rate) + **user-growth curve** (cumulative by month, from `createdTimestamp`) + Users-by-status
  donut + recent-users table. Added `[smooth]` (Catmull-Rom) option to `shared/charts/line-chart`.
- Backend: `UserSummary` gained `createdTimestamp` (mapped from Keycloak); login scope now
  `openid profile email roles` so the JWT carries `name`/`email` (shown in the shell). `npm run build`
  + `mvnw compile` → clean.

### Auth Service — own email-verification flow + realm SMTP + email-login fix (detail: [[Auth-Service]])
- **Replaced Keycloak's verify-email UI** with our own: `EmailVerificationService` issues a 24h
  single-use token (`EmailVerificationTokenService`), emails `${app.verify-email-url}?token=…`;
  `GET /api/auth/verify-email` calls `KeycloakService.markEmailVerified` (Admin API sets
  `emailVerified=true` + drops `VERIFY_EMAIL`) and renders our own confirmation page. `createUser`
  no longer calls Keycloak `send-verify-email`.
- **Keycloak realm SMTP** wired to the same Gmail (for any future Keycloak-native emails, now
  optional): `smtpServer` block in `platform-realm.json` (`${KC_SMTP_*}` placeholders),
  `docker-compose-infra.yml` passes `KC_SMTP_*` from `MAIL_*` + `--import-realm`, and live scripts
  `keycloak/configure-smtp.ps1` / `.sh` (Admin API, read `.env`). Ran the ps1 successfully.
- **Email-login fix:** `KeycloakService.userId()` now resolves by username **or** email (login
  accepts either), fixing "User not found" on first-login when signing in with an email.

### Frontend — wired auth + user management to the backend (detail: [[Frontend-Architecture]])
- Added `Frontend/proxy.conf.json` (`/api` → gateway :9000) + `angular.json` serve `proxyConfig`.
- New `src/app/core/`: `auth.service` (login 3-status, first-login, OTP reset, change-pw, JWT decode
  → roles/home route), `auth.interceptor` (bearer except public paths; 401 → logout), `guards`
  (`authGuard` + `roleGuard`), `users.service`, `models`.
- Rewrote `login` (real auth, routes by role), added `auth/first-login/`, rewrote `reset-password`
  (email → OTP → new password), rewrote admin `users` (live CRUD + reset). `role-shell` logout
  clears session. Guards on all four role route trees. `npm run build` → clean.
- Remaining: role dashboard data pages still mock (see [[Next-Steps]]).

### Auth Service — password flows + state-aware login (full detail: [[Auth-Service]])
- **Self-service reset (OTP):** `/forgot-password` (email → 6-digit OTP via Gmail SMTP),
  `/verify-otp` (→ single-use reset token), `/reset-password` (token + new permanent password).
  In-memory `OtpService` + `ResetTokenService`. Added `spring-boot-starter-mail` + `MailService`;
  `spring.mail.*` reads `MAIL_USERNAME`/`MAIL_PASSWORD` (Gmail App Password) from a gitignored
  repo-root `.env` loaded by `run.sh`; compose passes them through. `.env.example` added.
- **Create user:** no longer takes a password — generates a temporary one, sets required actions
  `[VERIFY_EMAIL, UPDATE_PASSWORD]`, calls Keycloak `send-verify-email` (non-fatal), emails the
  temp password. Admin direct reset moved to `POST /api/users/{username}/reset-password`.
- **State-aware login:** `/login` now returns `LoginResponse.status` = `SUCCESS` (with tokens) /
  `EMAIL_VERIFICATION_REQUIRED` / `PASSWORD_CHANGE_REQUIRED` (+ `firstLoginToken`). New
  `AuthService` interprets Keycloak's "Account is not fully set up" via `UserState` (Admin API).
  New `/first-login/change-password` (token + newPassword) sets a permanent password and clears
  `UPDATE_PASSWORD`. New `FirstLoginTokenService`.
- **Security wiring:** whitelisted the new public paths in **both** the gateway
  (`gateway-service` WebFlux `SecurityConfig`) and auth-service `SecurityConfig`. Learned the
  gateway 401 gotcha (public path must be permitted at the gateway too; stale Swagger token also
  causes 401 on permitAll paths).
- Verified: `mvnw -pl microservices/auth-service,spring-cloud/gateway-service compile` → success.

## 2026-08-07

### Roaming Analysis Service (backend)
- Built `microservices/roaming-analysis-service` (port 9002) mirroring `auth-service`
  conventions: resource server, `PERM_roaming-events:read`, actuator/prometheus, eureka,
  springdoc, Dockerfile + k8s manifests.
- Domain/repo/analysis/service/web layers; in-memory seeded events + `RiskAnalyzer` scoring.
- API: `/api/roaming/events`, `/events/{id}`, `/summary`, `/partners`.
- Registered module in root `pom.xml`; added gateway routes (default + docker) + Swagger entry.
- Verified: `mvnw -pl microservices/roaming-analysis-service compile` → success.
- Full detail: [[Roaming-Analysis-Service]].

### Memory vault created
- Created this `memory/` folder as an **Obsidian vault** with detailed notes:
  [[README]], [[Project-Overview]], [[Roles-and-Permissions]], [[Frontend-Architecture]],
  [[Frontend-Components]], [[Backend-and-Infra]], [[Git-Workflow-and-History]],
  [[Session-Log]], [[Next-Steps]].
- (A short root pointer `PROJECT_MEMORY.md` also exists at the repo root.)

### Frontend build — role-based 5GC console
- Discovered the 4 Keycloak roles from `keycloak/platform-realm.json` (see [[Roles-and-Permissions]]).
- Built a Huawei-console-styled Angular 22 app in `Frontend/`:
  design system in `styles.css`; dependency-free SVG charts; reusable `role-shell`;
  shared `auth/` (login + reset-password) and `errors/` (404 + 500); one folder per role
  with layout + dashboard + feature pages. Full detail in [[Frontend-Components]].
- Wired lazy routes in `app.routes.ts`; simplified root `app.ts` to `<router-outlet/>`.
- `npm run build` → clean, ~236 kB initial bundle.

### Git housekeeping
- Removed unit tests + `.github/workflows/` (GitHub Actions). Kept `dependabot.yml`.
- Frontend was committed on `fix/ci-trivy-tag-and-code-scanning`; then staged onto `main`
  via `git checkout fix/... -- Frontend/` (not committed — user commits themselves).
- Added `Frontend/.gitignore` (Angular defaults: node_modules, dist, .angular/cache, …).
- See [[Git-Workflow-and-History]] for the full sequence.

## Related notes
- [[Next-Steps]]
