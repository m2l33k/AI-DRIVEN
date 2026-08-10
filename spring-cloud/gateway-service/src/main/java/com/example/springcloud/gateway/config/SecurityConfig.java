package com.example.springcloud.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Gateway authorization for the 5GC management platform.
 *
 * <p>Roles are modelled as Keycloak realm roles (PLATFORM_ADMIN, NETWORK_OPERATOR,
 * SECURITY_ANALYST, AUDITOR). Each role is a Keycloak <b>composite</b> that aggregates
 * fine-grained permissions defined as client roles on the {@code platform-client} client
 * (e.g. {@code nf:restart}, {@code core-config:write}, {@code audit:read}).</p>
 *
 * <p>The JWT converter exposes:</p>
 * <ul>
 *   <li>realm roles as {@code ROLE_<NAME>} authorities (e.g. {@code ROLE_AUDITOR}), and</li>
 *   <li>{@code platform-client} permissions as {@code PERM_<permission>} authorities
 *       (e.g. {@code PERM_nf:restart}).</li>
 * </ul>
 *
 * <p>Authorization below is keyed on <b>permissions</b>, not role names, so roles can be
 * re-sliced in Keycloak without touching this code. The path matchers are the enforcement
 * template for downstream 5GC services — adjust the paths as those services are added
 * behind the gateway.</p>
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    /** Keycloak client whose client-roles carry the fine-grained permissions. */
    private static final String PLATFORM_CLIENT_ID = "platform-client";

    private final String jwkSetUri;

    public SecurityConfig(@Value("${app.jwk-set-uri}") String jwkSetUri) {
        this.jwkSetUri = jwkSetUri;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                // Stateless API gateway (JWT bearer auth) — CSRF protection not applicable.
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        // Public / infra endpoints
                        .pathMatchers("/api/public", "/actuator/**").permitAll()
                        // OpenAPI / Swagger UI (gateway's own + aggregated downstream docs)
                        .pathMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/webjars/**").permitAll()
                        .pathMatchers("/*/v3/api-docs", "/*/v3/api-docs/**").permitAll()

                        // Auth service public endpoints (login state flow + self-service password reset)
                        .pathMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/forgot-password",
                                "/api/auth/verify-otp", "/api/auth/reset-password",
                                "/api/auth/first-login/change-password").permitAll()
                        // Verify-email landing page (browser opens the emailed link, GET)
                        .pathMatchers(HttpMethod.GET, "/api/auth/verify-email").permitAll()

                        // Health checks for the (empty) platform services — public liveness probes
                        .pathMatchers(HttpMethod.GET, "/api/anomaly/health", "/api/protection/health",
                                "/api/tracing/health", "/api/fault/health").permitAll()

                        // --- Platform metrics overview (from Prometheus) — any authenticated user ---
                        .pathMatchers(HttpMethod.GET, "/api/metrics/**").authenticated()

                        // --- IAM: users (PLATFORM_ADMIN) ---
                        .pathMatchers(HttpMethod.GET, "/api/users/**").hasAuthority("PERM_users:read")
                        .pathMatchers("/api/users/**").hasAuthority("PERM_users:write")

                        // --- IAM: roles (PLATFORM_ADMIN) ---
                        .pathMatchers(HttpMethod.GET, "/api/roles/**").hasAuthority("PERM_roles:read")
                        .pathMatchers("/api/roles/**").hasAuthority("PERM_roles:write")

                        // --- Platform config (PLATFORM_ADMIN) ---
                        .pathMatchers(HttpMethod.GET, "/api/platform-config/**").hasAuthority("PERM_platform-config:read")
                        .pathMatchers("/api/platform-config/**").hasAuthority("PERM_platform-config:write")

                        // --- Network Functions (NETWORK_OPERATOR) ---
                        .pathMatchers(HttpMethod.POST, "/api/nf/*/restart").hasAuthority("PERM_nf:restart")
                        .pathMatchers(HttpMethod.GET, "/api/nf/**").hasAuthority("PERM_nf:read")

                        // --- 5GC core config (NETWORK_OPERATOR) ---
                        .pathMatchers(HttpMethod.GET, "/api/core-config/**").hasAuthority("PERM_core-config:read")
                        .pathMatchers("/api/core-config/**").hasAuthority("PERM_core-config:write")

                        // --- Security (SECURITY_ANALYST) ---
                        .pathMatchers(HttpMethod.GET, "/api/security/alerts/**").hasAuthority("PERM_security-alerts:read")
                        .pathMatchers(HttpMethod.GET, "/api/security/roaming/**").hasAuthority("PERM_roaming-events:read")
                        .pathMatchers(HttpMethod.GET, "/api/security/detection-rules/**").hasAuthority("PERM_detection-rules:read")
                        .pathMatchers("/api/security/detection-rules/**").hasAuthority("PERM_detection-rules:write")

                        // --- Audit logs (AUDITOR reads; nobody deletes) ---
                        .pathMatchers(HttpMethod.GET, "/api/audit/**").hasAuthority("PERM_audit:read")
                        .pathMatchers(HttpMethod.DELETE, "/api/audit/**").hasAuthority("PERM_audit:delete")

                        // Everything else must at least be authenticated
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(grantedAuthoritiesExtractor()))
                );

        return http.build();
    }

    @Bean
    public ReactiveJwtDecoder jwtDecoder() {
        return NimbusReactiveJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }

    @Bean
    public Converter<Jwt, Mono<JwtAuthenticationToken>> grantedAuthoritiesExtractor() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // Realm roles -> ROLE_<NAME>
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
                roles.forEach(role ->
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toString().toUpperCase())));
            }

            // platform-client roles (fine-grained permissions) -> PERM_<permission>
            Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
            if (resourceAccess != null && resourceAccess.get(PLATFORM_CLIENT_ID) instanceof Map<?, ?> client
                    && client.get("roles") instanceof List<?> perms) {
                perms.forEach(perm ->
                        authorities.add(new SimpleGrantedAuthority("PERM_" + perm.toString())));
            }

            return Mono.just(new JwtAuthenticationToken(jwt, authorities));
        };
    }
}
