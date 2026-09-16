package io.javatab.microservices.anomaly.store;

import io.javatab.microservices.anomaly.model.DetectionRule;
import io.javatab.microservices.anomaly.model.Severity;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class RuleStore {

    private final Map<String, DetectionRule> rules = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong(100);

    @PostConstruct
    void seed() {
        add("DR-001", "Registration Flood", "Signalling", Severity.CRITICAL, true, 20.0, 12,
                "Fires when AMF registration request rate exceeds threshold (req/s). Rule-based; threshold is configurable.");
        add("DR-002", "IMSI Enumeration", "Fraud", Severity.HIGH, true, 0, 8,
                "Detects sequential IMSI probing: ≥5 consecutive IMSI values within a 60-event sliding window.");
        add("DR-003", "Auth Failure Spike", "Auth", Severity.MEDIUM, true, 3.0, 21,
                "Z-score engine fires when amf_auth_failure_total rate exceeds 3σ above the 30-sample baseline.");
        add("DR-004", "Roaming Velocity Anomaly", "Roaming", Severity.HIGH, true, 0, 5,
                "Subscriber appears in two geographically distant PLMNs within 5 minutes — physically impossible.");
        add("DR-005", "Repeated Auth Failure", "Auth", Severity.MEDIUM, true, 5.0, 34,
                "Same SUPI fails 5G-AKA authentication ≥5 times within 60 seconds.");
    }

    private void add(String id, String name, String category, Severity sev,
                     boolean enabled, double threshold, long hits, String desc) {
        DetectionRule r = DetectionRule.builder()
                .id(id).name(name).category(category).severity(sev)
                .enabled(enabled).thresholdValue(threshold).hitCount(hits)
                .description(desc).build();
        rules.put(id, r);
    }

    public List<DetectionRule> findAll() {
        return rules.values().stream()
                .sorted(Comparator.comparing(DetectionRule::id))
                .toList();
    }

    public Optional<DetectionRule> findById(String id) {
        return Optional.ofNullable(rules.get(id));
    }

    public DetectionRule save(DetectionRule rule) {
        String id = (rule.id() != null && !rule.id().isBlank())
                ? rule.id()
                : "DR-%03d".formatted(seq.incrementAndGet());
        Instant createdAt = findById(id).map(DetectionRule::createdAt).orElse(Instant.now());
        DetectionRule stored = new DetectionRule(id, rule.name(), rule.category(), rule.severity(),
                rule.enabled(), rule.thresholdValue(), rule.description(), rule.hitCount(),
                createdAt, Instant.now());
        rules.put(id, stored);
        return stored;
    }

    public Optional<DetectionRule> toggle(String id) {
        DetectionRule r = rules.get(id);
        if (r == null) return Optional.empty();
        DetectionRule updated = r.withEnabled(!r.enabled());
        rules.put(id, updated);
        return Optional.of(updated);
    }

    public boolean delete(String id) {
        return rules.remove(id) != null;
    }
}
