package io.javatab.microservices.ratelimit.web.dto;

import io.javatab.microservices.ratelimit.domain.RateLimitAction;

/**
 * Outcome of a rate-limit check. When {@code allowed} is false the caller should back off for
 * {@code retryAfterMs}; {@code action} tells the edge whether to just throttle or hard-block.
 */
public record RateLimitResult(
		boolean allowed,
		String keyType,
		String key,
		long limit,
		long remaining,
		long retryAfterMs,
		RateLimitAction action) {
}
