package io.javatab.microservices.ratelimit.repository;

import io.javatab.microservices.ratelimit.domain.RateLimitAction;
import io.javatab.microservices.ratelimit.domain.RateLimitPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds sensible default token-bucket policies on first start (when the table is empty). The
 * {@code default} policy is the fallback for any unrecognised key type. Values map to the
 * proposal's DoS-on-AMF threat model (bursty attach/registration floods per IMSI / operator / IP).
 */
@Component
public class PolicySeeder implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(PolicySeeder.class);

	private final RateLimitPolicyRepository repository;

	public PolicySeeder(RateLimitPolicyRepository repository) {
		this.repository = repository;
	}

	@Override
	public void run(String... args) {
		if (repository.count() > 0) {
			return;
		}
		List<RateLimitPolicy> defaults = List.of(
				// keyType, capacity(burst), refillTokens, refillIntervalMs, action, enabled, description
				new RateLimitPolicy("default", 100, 100, 60_000, RateLimitAction.THROTTLE, true,
						"Fallback: 100 requests/min per caller"),
				new RateLimitPolicy("imsi", 20, 20, 60_000, RateLimitAction.BLOCK, true,
						"Per-subscriber attach/registration guard: 20/min, block on flood"),
				new RateLimitPolicy("operator", 2000, 2000, 60_000, RateLimitAction.THROTTLE, true,
						"Per visited/home operator: 2000/min"),
				new RateLimitPolicy("ip", 300, 300, 60_000, RateLimitAction.THROTTLE, true,
						"Per source IP at the edge: 300/min"));
		repository.saveAll(defaults);
		log.info("Seeded {} default rate-limit policies", defaults.size());
	}
}
