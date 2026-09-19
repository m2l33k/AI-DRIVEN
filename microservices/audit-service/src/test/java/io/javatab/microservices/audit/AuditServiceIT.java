package io.javatab.microservices.audit;

import io.javatab.microservices.audit.model.AuditEntry;
import io.javatab.microservices.audit.model.AuditStats;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuditServiceIT {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void healthEndpointIsUp() {
        ResponseEntity<Map> resp = rest.getForEntity("/api/audit/health", Map.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).containsEntry("status", "UP");
        assertThat(resp.getBody()).containsKey("timestamp");
    }

    @Test
    void appendLogEntryAndQueryByActor() {
        AuditEntry entry = new AuditEntry(
                null, Instant.now(),
                "it-test-actor", "SECURITY_ANALYST",
                "rules:create", "/api/rules",
                "Allowed", "10.0.0.1", "Integration test entry");

        ResponseEntity<AuditEntry> posted = rest.postForEntity("/api/audit/logs", entry, AuditEntry.class);
        assertThat(posted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(posted.getBody()).isNotNull();
        assertThat(posted.getBody().id()).isNotBlank();
        assertThat(posted.getBody().actor()).isEqualTo("it-test-actor");
        assertThat(posted.getBody().action()).isEqualTo("rules:create");

        ResponseEntity<AuditEntry[]> found = rest.getForEntity(
                "/api/audit/logs?actor=it-test-actor&limit=5", AuditEntry[].class);
        assertThat(found.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(found.getBody()).isNotEmpty();
        assertThat(found.getBody()[0].actor()).isEqualTo("it-test-actor");
    }

    @Test
    void queryByOutcomeFilterWorks() {
        rest.postForEntity("/api/audit/logs",
                new AuditEntry(null, Instant.now(), "filter-actor", "AUDITOR",
                        "resource:read", "/api/roaming", "Denied", "10.0.0.2", null),
                AuditEntry.class);

        ResponseEntity<AuditEntry[]> denied = rest.getForEntity(
                "/api/audit/logs?outcome=Denied&limit=50", AuditEntry[].class);
        assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(denied.getBody()).isNotEmpty();
        assertThat(denied.getBody()).allMatch(e -> "Denied".equals(e.outcome()));
    }

    @Test
    void statsReturns7DayBuckets() {
        ResponseEntity<AuditStats> resp = rest.getForEntity("/api/audit/stats", AuditStats.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().perDay()).hasSize(7);
        assertThat(resp.getBody().dayLabels()).hasSize(7);
        assertThat(resp.getBody().total()).isGreaterThanOrEqualTo(0);
    }
}
