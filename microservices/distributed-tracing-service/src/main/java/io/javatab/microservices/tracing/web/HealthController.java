package io.javatab.microservices.tracing.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Minimal health endpoint for the (empty) distributed-tracing-service.
 * Intended as a facade over a Jaeger tracing backend; business endpoints TBD.
 */
@RestController
@RequestMapping("/api/tracing")
@Tag(name = "Distributed Tracing", description = "Distributed tracing facade (Jaeger) (placeholder)")
public class HealthController {

	@Operation(summary = "Service health check")
	@GetMapping("/health")
	public ResponseEntity<Map<String, Object>> health() {
		return ResponseEntity.ok(Map.of(
				"status", "UP",
				"service", "distributed-tracing-service",
				"timestamp", Instant.now().toString()));
	}
}
