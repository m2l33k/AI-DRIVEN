package io.javatab.microservices.ratelimit.ratelimit;

import io.javatab.microservices.ratelimit.domain.RateLimitAction;
import io.javatab.microservices.ratelimit.domain.RateLimitPolicy;
import io.javatab.microservices.ratelimit.repository.RateLimitPolicyRepository;
import io.javatab.microservices.ratelimit.web.dto.RateLimitResult;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Core rate-limit engine: resolves the {@link RateLimitPolicy} for a key type and runs the atomic
 * token-bucket Lua script in Redis. Also keeps lightweight allow/block counters and a "top blocked
 * keys" leaderboard for {@code /stats}.
 *
 * <p>If a key type has no explicit policy it falls back to the {@code default} policy; if that too
 * is missing (or Redis is unavailable) the request is <b>fail-open</b> allowed, so the limiter can
 * never take the platform down.</p>
 */
@Service
public class TokenBucketService {

	static final String DEFAULT_KEY_TYPE = "default";
	private static final String BUCKET_PREFIX = "rl:";
	private static final String STAT_ALLOWED = "rl:stats:allowed";
	private static final String STAT_BLOCKED = "rl:stats:blocked";
	private static final String STAT_TOP_BLOCKED = "rl:stats:blocked:keys";

	private final StringRedisTemplate redis;
	@SuppressWarnings("rawtypes")
	private final RedisScript<List> script;
	private final RateLimitPolicyRepository policies;

	@SuppressWarnings("rawtypes")
	public TokenBucketService(StringRedisTemplate redis, RedisScript<List> tokenBucketScript,
							  RateLimitPolicyRepository policies) {
		this.redis = redis;
		this.script = tokenBucketScript;
		this.policies = policies;
	}

	/** Evaluates one request against its policy and consumes tokens if allowed. */
	public RateLimitResult check(String keyType, String key, int tokens) {
		RateLimitPolicy policy = resolvePolicy(keyType);
		if (policy == null || !policy.enabled()) {
			// No/disabled policy → fail open (unlimited).
			return new RateLimitResult(true, keyType, key, -1, -1, 0, RateLimitAction.THROTTLE);
		}

		String bucketKey = BUCKET_PREFIX + keyType + ":" + key;
		List<?> raw;
		try {
			raw = redis.execute(script, List.of(bucketKey),
					Long.toString(policy.capacity()),
					Long.toString(policy.refillTokens()),
					Long.toString(policy.refillIntervalMs()),
					Long.toString(System.currentTimeMillis()),
					Integer.toString(Math.max(1, tokens)));
		} catch (RuntimeException redisDown) {
			// Fail open on Redis errors — never block real traffic because of the limiter.
			return new RateLimitResult(true, keyType, key, policy.capacity(), -1, 0, policy.action());
		}

		boolean allowed = toLong(raw, 0) == 1L;
		long remaining = toLong(raw, 1);
		long retryAfter = toLong(raw, 2);

		recordOutcome(allowed, keyType, key);
		return new RateLimitResult(allowed, keyType, key, policy.capacity(), remaining, retryAfter, policy.action());
	}

	private RateLimitPolicy resolvePolicy(String keyType) {
		Optional<RateLimitPolicy> exact = policies.findById(keyType);
		return exact.orElseGet(() -> policies.findById(DEFAULT_KEY_TYPE).orElse(null));
	}

	private void recordOutcome(boolean allowed, String keyType, String key) {
		try {
			if (allowed) {
				redis.opsForValue().increment(STAT_ALLOWED);
			} else {
				redis.opsForValue().increment(STAT_BLOCKED);
				redis.opsForZSet().incrementScore(STAT_TOP_BLOCKED, keyType + ":" + key, 1);
			}
		} catch (RuntimeException ignored) {
			// Stats are best-effort.
		}
	}

	public long allowedCount() {
		return counter(STAT_ALLOWED);
	}

	public long blockedCount() {
		return counter(STAT_BLOCKED);
	}

	/** Top offending keys (highest block counts first). */
	public List<TopKey> topBlocked(int limit) {
		try {
			var tuples = redis.opsForZSet().reverseRangeWithScores(STAT_TOP_BLOCKED, 0, Math.max(0, limit - 1));
			if (tuples == null) {
				return List.of();
			}
			return tuples.stream()
					.map(t -> new TopKey(t.getValue(), t.getScore() == null ? 0 : t.getScore().longValue()))
					.toList();
		} catch (RuntimeException ex) {
			return List.of();
		}
	}

	private long counter(String key) {
		try {
			String v = redis.opsForValue().get(key);
			return v == null ? 0 : Long.parseLong(v);
		} catch (RuntimeException ex) {
			return 0;
		}
	}

	private static long toLong(List<?> raw, int idx) {
		if (raw == null || raw.size() <= idx || raw.get(idx) == null) {
			return 0;
		}
		Object v = raw.get(idx);
		return v instanceof Number n ? n.longValue() : Long.parseLong(v.toString());
	}

	/** A key and how many times it has been blocked. */
	public record TopKey(String key, long blocks) {
	}
}
