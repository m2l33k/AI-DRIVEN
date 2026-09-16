package io.javatab.microservices.anomaly.model;

import java.time.Instant;

public record DetectionRule(
        String id,
        String name,
        String category,
        Severity severity,
        boolean enabled,
        double thresholdValue,
        String description,
        long hitCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static Builder builder() { return new Builder(); }

    public DetectionRule withEnabled(boolean e) {
        return new DetectionRule(id, name, category, severity, e,
                thresholdValue, description, hitCount, createdAt, Instant.now());
    }

    public static final class Builder {
        private String id;
        private String name;
        private String category;
        private Severity severity = Severity.MEDIUM;
        private boolean enabled = true;
        private double thresholdValue = 0;
        private String description = "";
        private long hitCount = 0;

        public Builder id(String v)               { id = v;             return this; }
        public Builder name(String v)             { name = v;           return this; }
        public Builder category(String v)         { category = v;       return this; }
        public Builder severity(Severity v)       { severity = v;       return this; }
        public Builder enabled(boolean v)         { enabled = v;        return this; }
        public Builder thresholdValue(double v)   { thresholdValue = v; return this; }
        public Builder description(String v)      { description = v;    return this; }
        public Builder hitCount(long v)           { hitCount = v;       return this; }

        public DetectionRule build() {
            Instant now = Instant.now();
            return new DetectionRule(id, name, category, severity,
                    enabled, thresholdValue, description, hitCount, now, now);
        }
    }
}
