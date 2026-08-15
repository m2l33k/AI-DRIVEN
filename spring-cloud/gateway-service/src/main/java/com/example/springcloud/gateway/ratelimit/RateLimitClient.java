package com.example.springcloud.gateway.ratelimit;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Reactive client that asks the rate-limiting-service for a decision on the request hot path, via
 * the in-cluster internal endpoint (no user JWT required). Load-balanced through Eureka
 * ({@code lb://rate-limiting-service}).
 */
@Component
public class RateLimitClient {

	private final WebClient webClient;

	public RateLimitClient(WebClient.Builder loadBalancedWebClientBuilder) {
		this.webClient = loadBalancedWebClientBuilder
				.baseUrl("lb://rate-limiting-service")
				.build();
	}

	public Mono<Decision> check(String keyType, String key, int tokens) {
		return webClient.post()
				.uri("/internal/protection/check")
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(Map.of("keyType", keyType, "key", key, "tokens", tokens))
				.retrieve()
				.bodyToMono(Decision.class);
	}

	/** Subset of the limiter's RateLimitResult the filter needs. Unknown fields ignored. */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Decision(boolean allowed, long remaining, long retryAfterMs, String action) {
	}
}
