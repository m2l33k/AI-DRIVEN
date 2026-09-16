package io.javatab.microservices.audit.store;

import io.javatab.microservices.audit.model.AuditEntry;
import io.javatab.microservices.audit.model.AuditStats;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AuditStoreTest {

    private AuditStore store;

    @BeforeEach
    void setUp() {
        store = new AuditStore();
    }

    // ── append + query ────────────────────────────────────────────────────────

    @Test
    void appendedEntryIsQueryable() {
        store.append(entry("alice", "resource:write", "Allowed"));
        List<AuditEntry> results = store.query(null, null, null, 10);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).actor()).isEqualTo("alice");
    }

    @Test
    void queryFiltersByOutcome() {
        store.append(entry("alice", "resource:read",  "Allowed"));
        store.append(entry("bob",   "resource:write", "Denied"));

        assertThat(store.query(null, "Denied",  null, 10)).hasSize(1);
        assertThat(store.query(null, "Allowed", null, 10)).hasSize(1);
        assertThat(store.query(null, "Error",   null, 10)).isEmpty();
    }

    @Test
    void queryFiltersByActor() {
        store.append(entry("alice", "resource:read",  "Allowed"));
        store.append(entry("bob",   "resource:write", "Allowed"));

        assertThat(store.query(null, null, "alice", 10)).hasSize(1);
        assertThat(store.query(null, null, "bob",   10)).hasSize(1);
        assertThat(store.query(null, null, "carol",  10)).isEmpty();
    }

    @Test
    void queryTextSearchMatchesActorAndAction() {
        store.append(entry("alice", "user:create",  "Allowed"));
        store.append(entry("bob",   "policy:write", "Allowed"));

        assertThat(store.query("user",   null, null, 10)).hasSize(1);
        assertThat(store.query("policy", null, null, 10)).hasSize(1);
        assertThat(store.query("alice",  null, null, 10)).hasSize(1);
    }

    @Test
    void queryLimitIsRespected() {
        for (int i = 0; i < 50; i++) store.append(entry("user-" + i, "r:read", "Allowed"));
        assertThat(store.query(null, null, null, 10)).hasSize(10);
    }

    @Test
    void defaultLimitIs200WhenZeroPassed() {
        for (int i = 0; i < 250; i++) store.append(entry("u", "r:read", "Allowed"));
        assertThat(store.query(null, null, null, 0)).hasSize(200);
    }

    // ── cap at 10 000 ─────────────────────────────────────────────────────────

    @Test
    void storeCapAt10000EvictsOldest() {
        for (int i = 0; i < 10_000; i++) store.append(entry("old-" + i, "r:read", "Allowed"));
        store.append(entry("newest", "r:write", "Allowed"));

        List<AuditEntry> all = store.query(null, null, null, 10_001);
        assertThat(all).hasSize(10_000);
        assertThat(all.get(0).actor()).isEqualTo("newest");
    }

    // ── stats ─────────────────────────────────────────────────────────────────

    @Test
    void statsCountsWriteActionsCorrectly() {
        store.append(entry("alice", "resource:write",  "Allowed"));
        store.append(entry("alice", "resource:read",   "Allowed"));
        store.append(entry("bob",   "resource:create", "Allowed"));
        store.append(entry("bob",   "resource:read",   "Denied"));

        AuditStats stats = store.stats();
        assertThat(stats.total()).isEqualTo(4);
        assertThat(stats.writeActions()).isEqualTo(2);
        assertThat(stats.deniedActions()).isEqualTo(1);
        assertThat(stats.activeActors()).isEqualTo(2);
    }

    @Test
    void statsPerDayLabelsHaveSevenEntries() {
        store.append(entry("alice", "r:read", "Allowed"));
        AuditStats stats = store.stats();
        assertThat(stats.perDay()).hasSize(7);
        assertThat(stats.dayLabels()).hasSize(7);
    }

    @Test
    void emptyStoreStatsAreAllZero() {
        AuditStats stats = store.stats();
        assertThat(stats.total()).isZero();
        assertThat(stats.writes()).isZero();
        assertThat(stats.denied()).isZero();
        assertThat(stats.activeActors()).isZero();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static AuditEntry entry(String actor, String action, String outcome) {
        return new AuditEntry(
                UUID.randomUUID().toString(),
                Instant.now(),
                actor,
                "SECURITY_ANALYST",
                action,
                "/api/test/resource",
                outcome,
                "127.0.0.1",
                null
        );
    }
}
