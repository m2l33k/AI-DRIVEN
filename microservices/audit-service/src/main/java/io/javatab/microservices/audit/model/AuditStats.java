package io.javatab.microservices.audit.model;

import java.util.List;

public record AuditStats(
        long total,
        long writeActions,
        long deniedActions,
        long activeActors,
        List<Long> perDay,
        List<String> dayLabels,
        long allowed,
        long errored,
        List<ActorSummary> topActors
) {
    public record ActorSummary(String actor, String role, long reads, long writes, long denied) {}
}
