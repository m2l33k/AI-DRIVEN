package io.javatab.microservices.anomaly.web;

import io.javatab.microservices.anomaly.model.AnomalyEvent;
import io.javatab.microservices.anomaly.store.AnomalyStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/anomaly")
@Tag(name = "Anomaly Detection", description = "Real-time anomaly detection — 5G Core signalling")
public class AnomalyController {

    private final AnomalyStore store;

    public AnomalyController(AnomalyStore store) {
        this.store = store;
    }

    /** SSE stream — browser / fetch clients that support text/event-stream. */
    @Operation(summary = "Live SSE stream of anomaly events")
    @GetMapping(value = "/live", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter live() {
        return store.registerEmitter();
    }

    /** REST polling endpoint — Angular HttpClient (Bearer token via interceptor). */
    @Operation(summary = "Last N anomaly events (default 100)")
    @GetMapping("/events")
    public ResponseEntity<List<AnomalyEvent>> events(@RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(store.getRecent(limit));
    }

    /** Inject a test event — demos the pipeline without real free5GC metrics. */
    @Operation(summary = "Inject a test anomaly event (demo / CI)")
    @PostMapping("/inject")
    public ResponseEntity<AnomalyEvent> inject(@RequestBody AnomalyEvent event) {
        store.add(event);
        return ResponseEntity.ok(event);
    }

    @Operation(summary = "Clear all stored anomaly events")
    @DeleteMapping("/events")
    public ResponseEntity<Void> clear() {
        store.clear();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Service health")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "anomaly-detection-service",
                "timestamp", Instant.now().toString()));
    }
}
