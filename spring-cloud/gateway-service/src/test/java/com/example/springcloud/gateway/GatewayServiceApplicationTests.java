package com.example.springcloud.gateway;

import com.example.springcloud.gateway.filter.AuditGatewayFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link AuditGatewayFilter}.
 *
 * No Spring context is loaded — the filter is instantiated directly.
 * Context-load tests would require a running Keycloak and Eureka,
 * which are not available in the CI environment.
 */
class GatewayServiceApplicationTests {

    private AuditGatewayFilter filter;

    @BeforeEach
    void setUp() {
        filter = new AuditGatewayFilter("http://localhost:0");
    }

    // ── shouldSkip ────────────────────────────────────────────────────────────

    @Test
    void getRequestsAreSkipped() {
        assertThat(filter.shouldSkip("/api/roaming/events", "GET")).isTrue();
    }

    @Test
    void auditPathIsSkippedToPreventLoop() {
        assertThat(filter.shouldSkip("/api/audit/logs", "POST")).isTrue();
    }

    @Test
    void actuatorPathIsSkipped() {
        assertThat(filter.shouldSkip("/actuator/health", "GET")).isTrue();
    }

    @Test
    void swaggerPathIsSkipped() {
        assertThat(filter.shouldSkip("/swagger-ui/index.html", "GET")).isTrue();
    }

    @Test
    void optionsIsSkipped() {
        assertThat(filter.shouldSkip("/api/roaming/events", "OPTIONS")).isTrue();
    }

    @Test
    void headIsSkipped() {
        assertThat(filter.shouldSkip("/api/roaming/events", "HEAD")).isTrue();
    }

    @Test
    void postRequestIsNotSkipped() {
        assertThat(filter.shouldSkip("/api/anomaly/inject", "POST")).isFalse();
    }

    @Test
    void putRequestIsNotSkipped() {
        assertThat(filter.shouldSkip("/api/protection/policies/IP", "PUT")).isFalse();
    }

    @Test
    void deleteRequestIsNotSkipped() {
        assertThat(filter.shouldSkip("/api/rules/dr-001", "DELETE")).isFalse();
    }

    @Test
    void loginPostIsNotSkipped() {
        assertThat(filter.shouldSkip("/api/auth/login", "POST")).isFalse();
    }

    // ── deriveAction ──────────────────────────────────────────────────────────

    @ParameterizedTest(name = "{0} {1} → {2}")
    @CsvSource({
        "POST,   /api/users,                    users:create",
        "DELETE, /api/users/alice,              users:delete",
        "PUT,    /api/users/alice,              users:write",
        "POST,   /api/auth/login,               auth:login",
        "POST,   /api/rules,                    detection-rules:create",
        "PUT,    /api/rules/dr-001,             detection-rules:write",
        "PATCH,  /api/rules/dr-001/toggle,      detection-rules:write",
        "DELETE, /api/rules/dr-001,             detection-rules:delete",
        "POST,   /api/anomaly/inject,           anomaly:inject",
        "DELETE, /api/anomaly/events,           anomaly:delete",
        "PUT,    /api/protection/policies/IP,   protection:write",
        "DELETE, /api/protection/policies/IP,   protection:delete",
        "POST,   /api/roaming/simulate,         roaming:create",
        "POST,   /api/5gc/subscribers,          core-config:create",
        "PUT,    /api/5gc/network-config,       core-config:write",
        "POST,   /api/5gc/containers/amf/restart, core-config:restart",
        "POST,   /api/vm/mongo/test/docs,       vm:create",
        "DELETE, /api/vm/mongo/test/docs/abc,   vm:delete",
        "POST,   /api/messages,                 messaging:create",
        "POST,   /api/fault/inject,             fault:create",
    })
    void deriveActionCoversAllResources(String method, String path, String expected) {
        assertThat(filter.deriveAction(method.trim(), path.trim())).isEqualTo(expected.trim());
    }

    @Test
    void unknownPathFallsBackToPlatformResource() {
        assertThat(filter.deriveAction("POST",   "/api/unknown/path")).isEqualTo("platform:create");
        assertThat(filter.deriveAction("DELETE", "/api/unknown/path")).isEqualTo("platform:delete");
    }

    @Test
    void getOnAnyResourceYieldsReadSuffix() {
        assertThat(filter.deriveAction("GET", "/api/roaming/events")).isEqualTo("roaming:read");
        assertThat(filter.deriveAction("GET", "/api/rules"))         .isEqualTo("detection-rules:read");
    }
}
