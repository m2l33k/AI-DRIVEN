package io.javatab.microservices.anomaly.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Minimal health endpoint for the (empty) anomaly-detection-service.
 * Business endpoints will be added later; for now this is a liveness probe.
 */
@RestController
@RequestMapping("/api/anomaly")
@Tag(name = "Anomaly Detection", description = "Anomaly detection service (placeholder)")
public class HealthController {

	@Operation(summary = "Service health check")
	@GetMapping("/health")
	public ResponseEntity<Map<String, Object>> health() {
		return ResponseEntity.ok(Map.of(
				"status", "UP",
				"service", "anomaly-detection-service",
				"timestamp", Instant.now().toString()));
	}
}
