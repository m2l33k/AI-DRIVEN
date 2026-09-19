package com.example.springcloud.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Intercepts every non-GET request passing through the gateway and ships
 * a fire-and-forget audit entry to the audit-service.
 *
 * Actor, role, action and outcome are derived from the JWT + response status.
 * The call to audit-service is fully non-blocking — a failure never affects
 * the original request.
 */
@Component
public class AuditGatewayFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuditGatewayFilter.class);

    private static final List<String> ROLE_PRECEDENCE =
            List.of("PLATFORM_ADMIN", "SECURITY_ANALYST", "NETWORK_OPERATOR", "AUDITOR");

    private final WebClient auditClient;
    private final AtomicLong seq = new AtomicLong(0);

    public AuditGatewayFilter(
            @Value("${audit.service-url:http://localhost:9009}") String auditUrl) {
        this.auditClient = WebClient.builder().baseUrl(auditUrl).build();
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 5;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path   = exchange.getRequest().getPath().value();
        String method = exchange.getRequest().getMethod().name();

        if (shouldSkip(path, method)) {
            return chain.filter(exchange);
        }

        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> (JwtAuthenticationToken) ctx.getAuthentication())
                .flatMap(auth -> {
                    ActorInfo actor = extractActor(auth, exchange);
                    return chain.filter(exchange)
                            .doOnTerminate(() -> fireAudit(actor, method, path, exchange));
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    boolean shouldSkip(String path, String method) {
        if (path.startsWith("/api/audit"))        return true; // avoid loop
        if (path.startsWith("/actuator"))         return true;
        if (path.startsWith("/swagger"))          return true;
        if (path.startsWith("/v3/api-docs"))      return true;
        if (path.startsWith("/webjars"))          return true;
        if (path.endsWith("/v3/api-docs"))        return true;
        if (path.startsWith("/ws"))               return true;
        if ("OPTIONS".equals(method))             return true;
        if ("HEAD".equals(method))                return true;
        // Only log writes + login
        boolean isWrite = !("GET".equals(method));
        boolean isLogin = path.contains("/login") || path.contains("/logout");
        return !(isWrite || isLogin);
    }

    private ActorInfo extractActor(JwtAuthenticationToken auth, ServerWebExchange exchange) {
        var jwt = auth.getToken();

        String username = jwt.getClaimAsString("preferred_username");
        if (username == null || username.isBlank()) username = jwt.getSubject();

        String role = "AUTHENTICATED";
        for (String r : ROLE_PRECEDENCE) {
            if (auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_" + r))) {
                role = r;
                break;
            }
        }

        String ip = exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";

        return new ActorInfo(username, role, ip);
    }

    String deriveAction(String method, String path) {
        String res = "platform";
        if      (path.startsWith("/api/users"))           res = "users";
        else if (path.startsWith("/api/auth"))            res = "auth";
        else if (path.startsWith("/api/roles"))           res = "roles";
        else if (path.startsWith("/api/rules"))           res = "detection-rules";
        else if (path.startsWith("/api/anomaly"))         res = "anomaly";
        else if (path.startsWith("/api/nf"))              res = "nf";
        else if (path.startsWith("/api/core-config"))     res = "core-config";
        else if (path.startsWith("/api/5gc"))             res = "core-config";
        else if (path.startsWith("/api/roaming"))         res = "roaming";
        else if (path.startsWith("/api/protection"))      res = "protection";
        else if (path.startsWith("/api/fault"))           res = "fault";
        else if (path.startsWith("/api/vm"))              res = "vm";
        else if (path.startsWith("/api/messages"))        res = "messaging";

        return switch (method) {
            case "GET"   -> res + ":read";
            case "POST"  -> {
                if (path.contains("/restart")) yield res + ":restart";
                if (path.contains("/inject"))  yield res + ":inject";
                if (path.contains("/login"))   yield res + ":login";
                yield res + ":create";
            }
            case "PUT", "PATCH" -> res + ":write";
            case "DELETE"       -> res + ":delete";
            default             -> res + ":access";
        };
    }

    private void fireAudit(ActorInfo actor, String method, String path, ServerWebExchange exchange) {
        try {
            HttpStatusCode sc = exchange.getResponse().getStatusCode();
            int status  = sc != null ? sc.value() : 0;
            String outcome = status >= 500 ? "Error" : status >= 400 ? "Denied" : "Allowed";
            String action   = deriveAction(method, path);
            String resource = normalisePath(path);

            Map<String, Object> entry = Map.of(
                    "id",        "GW-%08d".formatted(seq.incrementAndGet()),
                    "timestamp", Instant.now().toString(),
                    "actor",     actor.name(),
                    "role",      actor.role(),
                    "action",    action,
                    "resource",  resource,
                    "outcome",   outcome,
                    "ip",        actor.ip(),
                    "details",   method + " " + path + " → HTTP " + status
            );

            auditClient.post()
                    .uri("/api/audit/logs")
                    .bodyValue(entry)
                    .retrieve()
                    .toBodilessEntity()
                    .subscribeOn(Schedulers.boundedElastic())
                    .subscribe(
                            r  -> {},
                            e  -> log.debug("Audit fire failed (non-critical): {}", e.getMessage())
                    );
        } catch (Exception e) {
            log.debug("Audit filter error (non-critical): {}", e.getMessage());
        }
    }

    private String normalisePath(String path) {
        // collapse UUID-like segments to keep resources readable
        return path.replaceAll(
                "/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                "/{id}");
    }

    private record ActorInfo(String name, String role, String ip) {}
}
