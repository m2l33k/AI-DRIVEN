package io.javatab.microservices.audit.model;

import java.time.Instant;

public record AuditEntry(
        String id,
        Instant timestamp,
        String actor,
        String role,
        String action,
        String resource,
        String outcome,
        String ip,
        String details
) {}
