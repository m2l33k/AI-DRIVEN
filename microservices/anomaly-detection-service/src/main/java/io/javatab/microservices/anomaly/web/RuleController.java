package io.javatab.microservices.anomaly.web;

import io.javatab.microservices.anomaly.model.DetectionRule;
import io.javatab.microservices.anomaly.store.RuleStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rules")
@Tag(name = "Detection Rules", description = "CRUD management of anomaly detection rules")
public class RuleController {

    private final RuleStore store;

    public RuleController(RuleStore store) {
        this.store = store;
    }

    @Operation(summary = "List all detection rules")
    @GetMapping
    public ResponseEntity<List<DetectionRule>> list() {
        return ResponseEntity.ok(store.findAll());
    }

    @Operation(summary = "Create a new detection rule")
    @PostMapping
    public ResponseEntity<DetectionRule> create(@RequestBody DetectionRule rule) {
        return ResponseEntity.ok(store.save(rule));
    }

    @Operation(summary = "Update a detection rule")
    @PutMapping("/{id}")
    public ResponseEntity<DetectionRule> update(@PathVariable String id, @RequestBody DetectionRule rule) {
        DetectionRule updated = new DetectionRule(
                id, rule.name(), rule.category(), rule.severity(),
                rule.enabled(), rule.thresholdValue(), rule.description(), rule.hitCount(),
                store.findById(id).map(DetectionRule::createdAt).orElse(java.time.Instant.now()),
                java.time.Instant.now());
        return ResponseEntity.ok(store.save(updated));
    }

    @Operation(summary = "Toggle enabled state of a rule")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<DetectionRule> toggle(@PathVariable String id) {
        return store.toggle(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete a detection rule")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        store.delete(id);
        return ResponseEntity.noContent().build();
    }
}
