package io.javatab.microservices.anomaly.store;

import io.javatab.microservices.anomaly.model.DetectionRule;
import io.javatab.microservices.anomaly.model.Severity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class RuleStoreTest {

    private RuleStore store;

    @BeforeEach
    void setUp() {
        store = new RuleStore();
        store.seed(); // triggers @PostConstruct seeding
    }

    // ── seeded rules ──────────────────────────────────────────────────────────

    @Test
    void fiveRulesSeededOnStartup() {
        assertThat(store.findAll()).hasSize(5);
    }

    @Test
    void seededRulesAreSortedById() {
        List<String> ids = store.findAll().stream().map(DetectionRule::id).toList();
        assertThat(ids).containsExactly("DR-001", "DR-002", "DR-003", "DR-004", "DR-005");
    }

    @Test
    void dr001IsRegistrationFloodAndEnabled() {
        DetectionRule r = store.findById("DR-001").orElseThrow();
        assertThat(r.name()).isEqualTo("Registration Flood");
        assertThat(r.enabled()).isTrue();
        assertThat(r.severity()).isEqualTo(Severity.CRITICAL);
    }

    // ── toggle ────────────────────────────────────────────────────────────────

    @Test
    void toggleFlipsEnabledFlag() {
        boolean original = store.findById("DR-001").map(DetectionRule::enabled).orElseThrow();
        store.toggle("DR-001");
        boolean toggled = store.findById("DR-001").map(DetectionRule::enabled).orElseThrow();
        assertThat(toggled).isNotEqualTo(original);
    }

    @Test
    void toggleUnknownIdReturnsEmpty() {
        Optional<DetectionRule> result = store.toggle("DR-999");
        assertThat(result).isEmpty();
    }

    // ── save (create + update) ────────────────────────────────────────────────

    @Test
    void saveWithBlankIdAssignsAutoId() {
        DetectionRule rule = DetectionRule.builder()
                .name("New Rule").category("Test").severity(Severity.LOW)
                .enabled(true).thresholdValue(5.0).description("desc").build();

        DetectionRule saved = store.save(rule);
        assertThat(saved.id()).isNotBlank();
        assertThat(saved.id()).startsWith("DR-");
    }

    @Test
    void saveWithExistingIdUpdatesRule() {
        DetectionRule updated = DetectionRule.builder()
                .id("DR-002")
                .name("Updated IMSI Rule")
                .category("Fraud").severity(Severity.CRITICAL)
                .enabled(false).thresholdValue(10.0).description("updated").build();

        store.save(updated);
        DetectionRule r = store.findById("DR-002").orElseThrow();
        assertThat(r.name()).isEqualTo("Updated IMSI Rule");
        assertThat(r.enabled()).isFalse();
        assertThat(r.severity()).isEqualTo(Severity.CRITICAL);
    }

    @Test
    void createdAtIsPreservedOnUpdate() {
        DetectionRule original = store.findById("DR-003").orElseThrow();
        DetectionRule updated = DetectionRule.builder()
                .id("DR-003").name("Changed").category("Auth")
                .severity(Severity.HIGH).enabled(true).thresholdValue(2.0).description("x").build();

        store.save(updated);
        DetectionRule after = store.findById("DR-003").orElseThrow();
        assertThat(after.createdAt()).isEqualTo(original.createdAt());
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void deleteExistingRuleReturnsTrueAndRemovesIt() {
        assertThat(store.delete("DR-004")).isTrue();
        assertThat(store.findById("DR-004")).isEmpty();
        assertThat(store.findAll()).hasSize(4);
    }

    @Test
    void deleteUnknownRuleReturnsFalse() {
        assertThat(store.delete("DR-999")).isFalse();
        assertThat(store.findAll()).hasSize(5);
    }

    @Test
    void findAllAfterDeleteReturnsRemainingRules() {
        store.delete("DR-001");
        store.delete("DR-005");
        List<String> ids = store.findAll().stream().map(DetectionRule::id).toList();
        assertThat(ids).containsExactly("DR-002", "DR-003", "DR-004");
    }
}
