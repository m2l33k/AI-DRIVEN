package io.javatab.microservices.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full integration test for the rate-limiting service using real PostgreSQL and Redis
 * containers. Testcontainers spins them up via the Docker socket (available in Jenkins
 * via the /var/run/docker.sock mount). No Keycloak needed — MockMvc's jwt() post-processor
 * injects the required authorities directly into the security context.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class ProtectionControllerIT {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("ratelimit_db")
            .withUsername("ratelimit")
            .withPassword("ratelimit");

    @Container
    @SuppressWarnings("resource")
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void overrideDataSources(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host",     redis::getHost);
        registry.add("spring.data.redis.port",     () -> redis.getMappedPort(6379));
    }

    @Autowired
    private MockMvc mvc;

    private static final String READ  = "PERM_roaming-events:read";
    private static final String WRITE = "PERM_detection-rules:write";

    // ── authentication guard ───────────────────────────────────────────────────

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mvc.perform(get("/api/protection/policies"))
                .andExpect(status().isUnauthorized());
    }

    // ── seeded policies ────────────────────────────────────────────────────────

    @Test
    void listPoliciesReturnsSeededDefaults() throws Exception {
        mvc.perform(get("/api/protection/policies")
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(4)))
                .andExpect(jsonPath("$[*].keyType", hasItem("imsi")))
                .andExpect(jsonPath("$[*].keyType", hasItem("ip")))
                .andExpect(jsonPath("$[*].keyType", hasItem("operator")));
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Test
    void upsertPolicyPersistedAndQueryable() throws Exception {
        mvc.perform(put("/api/protection/policies/it-bucket")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"capacity":50,"refillTokens":50,"refillIntervalMs":30000,
                                 "action":"THROTTLE","enabled":true,
                                 "description":"IT test bucket"}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(WRITE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keyType").value("it-bucket"))
                .andExpect(jsonPath("$.capacity").value(50))
                .andExpect(jsonPath("$.action").value("THROTTLE"));

        mvc.perform(get("/api/protection/policies")
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].keyType", hasItem("it-bucket")));
    }

    @Test
    void deletePolicyRemovesItFromList() throws Exception {
        mvc.perform(put("/api/protection/policies/to-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"capacity":10,"refillTokens":10,"refillIntervalMs":60000,
                                 "action":"BLOCK","enabled":true,"description":"will be deleted"}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(WRITE))))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/protection/policies/to-delete")
                        .with(jwt().authorities(new SimpleGrantedAuthority(WRITE))))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/protection/policies")
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].keyType", not(hasItem("to-delete"))));
    }

    // ── token bucket decision ──────────────────────────────────────────────────

    @Test
    void checkAllowsRequestWithinBucketCapacity() throws Exception {
        mvc.perform(put("/api/protection/policies/check-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"capacity":1000,"refillTokens":1000,"refillIntervalMs":60000,
                                 "action":"THROTTLE","enabled":true,"description":"check test"}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(WRITE))))
                .andExpect(status().isOk());

        mvc.perform(post("/api/protection/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyType":"check-key","key":"caller-001","tokens":1}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowed").value(true))
                .andExpect(jsonPath("$.remaining", greaterThan(0)));
    }

    @Test
    void checkBlocksRequestWhenBucketExhausted() throws Exception {
        mvc.perform(put("/api/protection/policies/tiny-bucket")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"capacity":1,"refillTokens":1,"refillIntervalMs":3600000,
                                 "action":"BLOCK","enabled":true,"description":"exhaust test"}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(WRITE))))
                .andExpect(status().isOk());

        // first call drains the single token
        mvc.perform(post("/api/protection/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyType":"tiny-bucket","key":"exhaust-caller","tokens":1}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowed").value(true));

        // second call exceeds capacity → 429
        mvc.perform(post("/api/protection/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyType":"tiny-bucket","key":"exhaust-caller","tokens":1}
                                """)
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.allowed").value(false));
    }

    // ── stats ─────────────────────────────────────────────────────────────────

    @Test
    void statsEndpointReturnsValidCounts() throws Exception {
        mvc.perform(get("/api/protection/stats")
                        .with(jwt().authorities(new SimpleGrantedAuthority(READ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowed").isNumber())
                .andExpect(jsonPath("$.blocked").isNumber())
                .andExpect(jsonPath("$.policyCount", greaterThanOrEqualTo(4)));
    }
}
