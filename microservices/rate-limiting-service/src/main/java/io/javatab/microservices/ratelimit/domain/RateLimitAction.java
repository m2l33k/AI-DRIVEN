package io.javatab.microservices.ratelimit.domain;

/** What to do when a caller exceeds its bucket. */
public enum RateLimitAction {
	/** Reject the over-limit request (HTTP 429 upstream) but keep the key active. */
	THROTTLE,
	/** Reject and record a block event for auditing / the security dashboard. */
	BLOCK
}
