package io.javatab.microservices.anomaly.model;

import java.time.Instant;
import java.util.UUID;

public record AnomalyEvent(
        String id,
        String type,
        Severity severity,
        String targetNf,
        String metric,
        double observedRate,
        double threshold,
        double zScore,
        String message,
        Instant timestamp
) {
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private String type = "";
        private Severity severity = Severity.MEDIUM;
        private String targetNf = "AMF";
        private String metric = "";
        private double observedRate = 0;
        private double threshold = 0;
        private double zScore = 0;
        private String message = "";
        private Instant timestamp = Instant.now();

        public Builder type(String t)          { this.type = t;          return this; }
        public Builder severity(Severity s)    { this.severity = s;      return this; }
        public Builder targetNf(String n)      { this.targetNf = n;      return this; }
        public Builder metric(String m)        { this.metric = m;        return this; }
        public Builder observedRate(double r)  { this.observedRate = r;  return this; }
        public Builder threshold(double t)     { this.threshold = t;     return this; }
        public Builder zScore(double z)        { this.zScore = z;        return this; }
        public Builder message(String m)       { this.message = m;       return this; }
        public Builder timestamp(Instant t)    { this.timestamp = t;     return this; }

        public AnomalyEvent build() {
            return new AnomalyEvent(id, type, severity, targetNf, metric,
                    observedRate, threshold, zScore, message, timestamp);
        }
    }
}
