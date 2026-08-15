---
title: Messaging Service
tags: [backend, microservice, messaging]
updated: 2026-08-15
---

# Messaging Service

Direct 1:1 messaging between platform users. New microservice added 2026-08-15 following the
standard [[Backend-and-Infra|service template]]. Backend only so far (frontend page pending).

- **Module:** `microservices/messaging-service` · package `io.javatab.microservices.messaging`
- **Port:** `9007` · **DB:** dedicated Postgres `messaging-postgres` (host **5438** / docker 5432,
  `messaging_db`, user/pass `messaging`) per ADR-09.
- **Status:** ✅ compiles (`mvnw -o compile`); gateway compiles; all compose/prometheus YAML valid.
  **`messaging-postgres` is running** (created 2026-08-15, `Up (healthy)`, `0.0.0.0:5438->5432`) —
  start the service from the IDE and `ddl-auto=update` creates the `messages` table on first boot.
  Startup gotcha: a `Connection refused` on 5438 just means the DB container isn't up yet (ADR-09 —
  start infra before the service). Bring up **only** the DB without touching other containers:
  `docker compose -f docker/docker-compose-infra.yml up -d --no-deps messaging-postgres`.

## Security
JWT resource server (Keycloak realm `auth-management`). **Any authenticated user** may message any
other — no special `PERM_*` required. The **sender is taken from the JWT** (`preferred_username`,
falls back to `sub`), never from the request body, so you can't spoof another sender. A user only
ever sees threads they are part of. Public: `/actuator/**`, docs. Gateway matcher:
`/api/messages/**` → `authenticated()`.

## API (`/api/messages`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/messages` | Send `{recipient, content}` (≤4000 chars) → 201 `MessageDto` |
| GET | `/conversations` | Inbox: one `ConversationDto` per peer (last message preview + unread count), newest first |
| GET | `/conversation/{peer}` | Full thread with `peer`, oldest first — **marks peer→me messages read** |
| POST | `/conversation/{peer}/read` | Mark a conversation read → `{marked: n}` |
| GET | `/unread-count` | Total unread for the caller → `{unread: n}` (for the nav badge) |

Reachable via gateway at the same paths; Swagger aggregated under `/messaging-service/v3/api-docs`.

## Design / layers
```
domain/     Message (@Entity, table messages; sender/recipient = usernames, is_read flag, indexes)
repository/ MessageRepository (JpaRepository + @Query findConversation/findAllForUser + @Modifying markConversationRead)
service/    MessageService — send (rejects self-message), conversations roll-up, thread (marks read), unreadCount
web/        MessageController (@AuthenticationPrincipal Jwt) · dto/{SendMessageRequest,MessageDto,ConversationDto} · ApiExceptionHandler
config/     SecurityConfig (JWT → ROLE_/PERM_) · OpenApiConfig (@SecurityScheme bearerAuth)
```
- `MessageDto.mine` tells the frontend which side to render a bubble on (sender == me).
- Inbox roll-up is computed in the service from `findAllForUser` (newest-first) grouped by peer;
  unread counted per peer. Heuristic, no custom SQL aggregation — fine at this scale.

## Wiring done
- Root `pom.xml` `<modules>` (now 9 modules incl. messaging).
- Gateway routes **both profiles** (`/api/messages/**` + `/messaging-service/v3/api-docs` docs route +
  Swagger aggregation entry); gateway `SecurityConfig` matcher `authenticated()`.
- `docker-compose-infra.yml`: `messaging-postgres` (:5438, volume `messaging-postgres-data`).
- `docker-compose-base.yml`: `messaging-service` (fluentd logging, shared-network, depends_on eureka).
- `docker/prometheus/prometheus.yml`: scrape target `host.docker.internal:9007`.
- `Dockerfile` (layered, EXPOSE 9007) + `kubernetes/deployment.yml` & `service.yml`.

## Real-time notifications — WebSocket (DONE 2026-08-15)
Native WebSocket (no STOMP/SockJS) endpoint **`/ws/notifications`** in messaging-service pushes live
notifications; a new message → instant push to the recipient's open sessions.
- **`config/WebSocketConfig`** (`@EnableWebSocket`) registers the handler at `/ws/notifications`.
- **`ws/JwtHandshakeInterceptor`** — browsers can't set an `Authorization` header on WS, so the JWT is
  passed as **`?token=<JWT>`** and validated with the resource server's `JwtDecoder` (401 on bad token);
  `preferred_username` is stored in the session attributes.
- **`ws/NotificationSocketHandler`** (`TextWebSocketHandler`) — `Map<username, Set<session>>` (multi-tab),
  `sendToUser(username, NotificationDto)` (no-op if offline). `ws/NotificationDto` = `{type,from,preview,at}`.
- **`MessageService.send`** pushes a `MESSAGE` notification to the recipient after saving.
- **Security:** `/ws/**` permitted in messaging-service `SecurityConfig` (handshake self-authenticates)
  and at the gateway; gateway route **`/ws/**` → `lb:ws://messaging-service`** (both profiles).
- **pom:** added `spring-boot-starter-websocket`.
- **Dev proxy:** `/ws` → `ws://localhost:9007` (direct to the service for reliable local testing; prod
  uses the gateway ws route). ⚠️ Restart `ng serve` after the proxy change.
- Verified by compile (messaging + gateway EXIT=0) + `ng build`; **not** runtime-tested (can't open a
  live WS here). See ADR-14 in [[Architecture-Decisions]].

## Frontend — DONE (2026-08-15)
- **`core/messages.service.ts`** — typed client (`conversations`, `thread`, `send`, `markRead`,
  `directory`) + a live **`unread`** signal.
- **`messaging/messages.ts`** — two-pane page: conversation list + chat thread (bubbles mine/theirs)
  + compose + a **live user-search dropdown**. 8s polling refreshes conversations/thread/unread.
- **Routing:** `messages` child route under **all four** role trees (messaging is for every user).
- **Sidebar:** the shell's "Messages" item is now `routerLink="messages"` with a **live unread badge**
  (20s poll of `/unread-count` via `takeUntilDestroyed`), i18n-labelled.
- **Live notifications:** `core/notifications.service.ts` — native `WebSocket` to `/ws/notifications?token=`
  (auto-reconnect 5s), `items` + `unread` signals. The **topbar bell** shows a live count + a dropdown of
  recent notifications (→ Messages on click, marks read on open); connects when the shell mounts,
  disconnects on logout.
- **Recipient picker fix:** `/api/users` needs `users:read` (admin/auditor only) → the search now uses
  the new **`GET /api/users/directory`** (any authenticated user; see [[Auth-Service]]). Gateway allows
  `GET /api/users/directory` → authenticated (before the `users:read` rule).
- Verified: auth-service + gateway compile; `ng build` clean.

## TODO / next
- [x] Real-time via **WebSocket** (native, `/ws/notifications`) — done 2026-08-15 (see above / ADR-14).
- Optional: other notification sources (alerts, NF events) push to the same socket; use the live
  push to update the messages thread/unread without the 8s poll; group chats; delete; typing
  indicators; exclude disabled users from the directory; move the JWT off the WS URL to a short-lived
  ticket. Move sender-identity checks to a shared filter if more services need it.

## Related notes
- [[Backend-and-Infra]] · [[Auth-Service]] (user directory `/api/users`) · [[Ports-and-URLs]] ·
  [[Roles-and-Permissions]] · [[Architecture-Decisions]] (ADR-09 db-per-service) · [[Next-Steps]]
