package io.javatab.microservices.audit.web;

import io.javatab.microservices.audit.model.AuditEntry;
import io.javatab.microservices.audit.model.AuditStats;
import io.javatab.microservices.audit.store.AuditStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit Logs", description = "Immutable platform audit log — records every write action")
public class AuditController {

    private final AuditStore store;
    private final AtomicLong seq = new AtomicLong(900);

    public AuditController(AuditStore store) {
        this.store = store;
    }

    @Operation(summary = "Query audit log entries")
    @GetMapping("/logs")
    public ResponseEntity<List<AuditEntry>> logs(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String outcome,
            @RequestParam(defaultValue = "") String actor,
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(store.query(q, outcome, actor, limit));
    }

    @Operation(summary = "Append a new audit entry (called by other services)")
    @PostMapping("/logs")
    public ResponseEntity<AuditEntry> append(@RequestBody AuditEntry entry) {
        AuditEntry toSave = new AuditEntry(
                entry.id() != null ? entry.id() : "AUD-%06d".formatted(seq.incrementAndGet()),
                entry.timestamp() != null ? entry.timestamp() : Instant.now(),
                entry.actor(), entry.role(), entry.action(),
                entry.resource(), entry.outcome(), entry.ip(), entry.details());
        store.append(toSave);
        return ResponseEntity.ok(toSave);
    }

    @Operation(summary = "Aggregated statistics (last 7 days)")
    @GetMapping("/stats")
    public ResponseEntity<AuditStats> stats() {
        return ResponseEntity.ok(store.stats());
    }

    @Operation(summary = "Service health")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "audit-service",
                "timestamp", Instant.now().toString()));
    }
}
