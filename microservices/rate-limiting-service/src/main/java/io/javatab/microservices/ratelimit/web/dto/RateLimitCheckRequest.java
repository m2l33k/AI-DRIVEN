package io.javatab.microservices.ratelimit.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * A rate-limit decision request. {@code keyType} selects the policy (e.g. {@code imsi},
 * {@code operator}, {@code ip}); {@code key} is the concrete caller within that dimension.
 * {@code tokens} lets a caller charge more than one unit (defaults to 1).
 */
public record RateLimitCheckRequest(
		@NotBlank String keyType,
		@NotBlank String key,
		@Min(1) Integer tokens) {

	public int tokensOrDefault() {
		return tokens == null ? 1 : tokens;
	}
}
