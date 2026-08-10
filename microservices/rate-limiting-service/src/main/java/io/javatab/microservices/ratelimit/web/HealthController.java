package io.javatab.microservices.ratelimit.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Minimal health endpoint for the (empty) rate-limiting-service.
 * Business endpoints will be added later; for now this is a liveness probe.
 */
@RestController
@RequestMapping("/api/protection")
@Tag(name = "Rate Limiting / Protection", description = "Rate limiting & protection service (placeholder)")
public class HealthController {

	@Operation(summary = "Service health check")
	@GetMapping("/health")
	public ResponseEntity<Map<String, Object>> health() {
		return ResponseEntity.ok(Map.of(
				"status", "UP",
				"service", "rate-limiting-service",
				"timestamp", Instant.now().toString()));
	}
}
