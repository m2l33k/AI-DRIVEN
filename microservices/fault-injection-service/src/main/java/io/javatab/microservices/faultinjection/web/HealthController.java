package io.javatab.microservices.faultinjection.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Minimal health endpoint for the (empty) fault-injection-service.
 * Business endpoints will be added later; for now this is a liveness probe.
 */
@RestController
@RequestMapping("/api/fault")
@Tag(name = "Fault Injection", description = "Chaos / fault injection service (placeholder)")
public class HealthController {

	@Operation(summary = "Service health check")
	@GetMapping("/health")
	public ResponseEntity<Map<String, Object>> health() {
		return ResponseEntity.ok(Map.of(
				"status", "UP",
				"service", "fault-injection-service",
				"timestamp", Instant.now().toString()));
	}
}
