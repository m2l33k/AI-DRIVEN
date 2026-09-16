package io.javatab.microservices.anomaly.store;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.model.Severity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnomalyStoreTest {

    private AnomalyStore store;

    @BeforeEach
    void setUp() {
        store = new AnomalyStore();
    }

    @Test
    void addedEventIsRetrievable() {
        store.add(event("ATK-01", Severity.CRITICAL));
        List<AnomalyEvent> recent = store.getRecent(10);
        assertThat(recent).hasSize(1);
        assertThat(recent.get(0).type()).isEqualTo("ATK-01");
    }

    @Test
    void getRecentReturnsNewestFirst() {
        store.add(event("FIRST",  Severity.LOW));
        store.add(event("SECOND", Severity.MEDIUM));
        store.add(event("THIRD",  Severity.HIGH));

        List<AnomalyEvent> recent = store.getRecent(3);
        assertThat(recent.get(0).type()).isEqualTo("THIRD");
        assertThat(recent.get(2).type()).isEqualTo("FIRST");
    }

    @Test
    void limitIsRespectedByGetRecent() {
        for (int i = 0; i < 20; i++) store.add(event("TYPE-" + i, Severity.LOW));
        assertThat(store.getRecent(5)).hasSize(5);
    }

    @Test
    void storeCapAt500EventsEvictsOldest() {
        // fill to exactly 500
        for (int i = 0; i < 500; i++) store.add(event("OLD-" + i, Severity.LOW));
        // one more — should evict the oldest (OLD-0)
        store.add(event("NEW", Severity.CRITICAL));

        List<AnomalyEvent> all = store.getRecent(501);
        assertThat(all).hasSize(500);
        assertThat(all.get(0).type()).isEqualTo("NEW");
        assertThat(all.stream().noneMatch(e -> e.type().equals("OLD-0"))).isTrue();
    }

    @Test
    void clearEmptiesStore() {
        store.add(event("X", Severity.LOW));
        store.clear();
        assertThat(store.getRecent(10)).isEmpty();
    }

    @Test
    void emptyStoreReturnsEmptyList() {
        assertThat(store.getRecent(10)).isEmpty();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static AnomalyEvent event(String type, Severity severity) {
        return AnomalyEvent.builder()
                .type(type)
                .severity(severity)
                .targetNf("AMF")
                .metric("test_metric")
                .observedRate(42.0)
                .zScore(3.5)
                .message("test event: " + type)
                .build();
    }
}
