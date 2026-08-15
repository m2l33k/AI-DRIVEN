package io.javatab.microservices.ratelimit.web;

import io.javatab.microservices.ratelimit.ratelimit.TokenBucketService;
import io.javatab.microservices.ratelimit.web.dto.RateLimitCheckRequest;
import io.javatab.microservices.ratelimit.web.dto.RateLimitResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal, service-to-service rate-limit decision endpoint used by the API gateway's enforcement
 * filter on the hot path. Deliberately <b>unauthenticated</b> (permitted in {@code SecurityConfig})
 * and <b>not exposed publicly</b> — the gateway never routes {@code /internal/**}, so it is only
 * reachable in-cluster via service discovery ({@code lb://rate-limiting-service}).
 *
 * <p>The public, permission-guarded {@code /api/protection/check} still exists for humans (Swagger,
 * the console); this variant exists so the gateway does not have to carry a user JWT into the
 * limiter just to ask "allowed?".</p>
 */
@RestController
@RequestMapping("/internal/protection")
public class InternalProtectionController {

	private final TokenBucketService limiter;

	public InternalProtectionController(TokenBucketService limiter) {
		this.limiter = limiter;
	}

	@PostMapping("/check")
	public RateLimitResult check(@Valid @RequestBody RateLimitCheckRequest req) {
		return limiter.check(req.keyType(), req.key(), req.tokensOrDefault());
	}
}
