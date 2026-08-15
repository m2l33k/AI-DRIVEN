package io.javatab.microservices.ratelimit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A token-bucket rate-limit policy, keyed by {@code keyType} (the dimension a caller is limited on,
 * e.g. {@code imsi}, {@code operator}, {@code ip}, or {@code default}). Persisted in Postgres and
 * consulted by {@link io.javatab.microservices.ratelimit.ratelimit.TokenBucketService}.
 *
 * <p>Bucket semantics: {@code capacity} tokens max (the burst size); refilled at
 * {@code refillTokens} per {@code refillIntervalMs}. One request consumes one token by default.</p>
 */
@Entity
@Table(name = "rate_limit_policies")
public class RateLimitPolicy {

	@Id
	@Column(name = "key_type")
	private String keyType;

	/** Max tokens (burst ceiling). */
	private long capacity;

	/** Tokens added per refill interval. */
	@Column(name = "refill_tokens")
	private long refillTokens;

	/** Refill interval in milliseconds. */
	@Column(name = "refill_interval_ms")
	private long refillIntervalMs;

	@Enumerated(EnumType.STRING)
	private RateLimitAction action;

	private boolean enabled;

	private String description;

	protected RateLimitPolicy() {
	}

	public RateLimitPolicy(String keyType, long capacity, long refillTokens, long refillIntervalMs,
						   RateLimitAction action, boolean enabled, String description) {
		this.keyType = keyType;
		this.capacity = capacity;
		this.refillTokens = refillTokens;
		this.refillIntervalMs = refillIntervalMs;
		this.action = action;
		this.enabled = enabled;
		this.description = description;
	}

	public String keyType() { return keyType; }
	public long capacity() { return capacity; }
	public long refillTokens() { return refillTokens; }
	public long refillIntervalMs() { return refillIntervalMs; }
	public RateLimitAction action() { return action; }
	public boolean enabled() { return enabled; }
	public String description() { return description; }

	public void update(long capacity, long refillTokens, long refillIntervalMs,
					   RateLimitAction action, boolean enabled, String description) {
		this.capacity = capacity;
		this.refillTokens = refillTokens;
		this.refillIntervalMs = refillIntervalMs;
		this.action = action;
		this.enabled = enabled;
		this.description = description;
	}
}
