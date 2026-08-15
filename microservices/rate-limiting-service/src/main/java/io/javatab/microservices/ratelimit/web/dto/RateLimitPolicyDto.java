package io.javatab.microservices.ratelimit.web.dto;

import io.javatab.microservices.ratelimit.domain.RateLimitAction;
import io.javatab.microservices.ratelimit.domain.RateLimitPolicy;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * JSON view of a {@link RateLimitPolicy} for the API. The entity itself uses record-style accessors
 * ({@code capacity()}, not {@code getCapacity()}) and has no setters, so Jackson cannot (de)serialize
 * it directly — this record is the wire contract for both reads and writes.
 *
 * <p>On write the {@code keyType} is taken from the URL path (this field may be left null in the
 * body); the token-bucket parameters are validated so a malformed policy is rejected with a clear
 * message rather than silently stored.</p>
 */
public record RateLimitPolicyDto(
		String keyType,
		@Min(value = 1, message = "capacity must be at least 1") long capacity,
		@Min(value = 1, message = "refillTokens must be at least 1") long refillTokens,
		@Min(value = 1, message = "refillIntervalMs must be at least 1") long refillIntervalMs,
		@NotNull(message = "action is required (THROTTLE or BLOCK)") RateLimitAction action,
		boolean enabled,
		String description
) {
	public static RateLimitPolicyDto from(RateLimitPolicy p) {
		return new RateLimitPolicyDto(p.keyType(), p.capacity(), p.refillTokens(), p.refillIntervalMs(),
				p.action(), p.enabled(), p.description());
	}
}
