package io.javatab.microservices.ratelimit.web;

import io.javatab.microservices.ratelimit.domain.RateLimitPolicy;
import io.javatab.microservices.ratelimit.ratelimit.TokenBucketService;
import io.javatab.microservices.ratelimit.repository.RateLimitPolicyRepository;
import io.javatab.microservices.ratelimit.web.dto.ProtectionStatsDto;
import io.javatab.microservices.ratelimit.web.dto.RateLimitCheckRequest;
import io.javatab.microservices.ratelimit.web.dto.RateLimitResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Rate-limiting / abuse-protection API.
 *
 * <p>{@code /check} is the hot-path decision endpoint (called by the gateway / signalling edge);
 * it and {@code /stats} require {@code PERM_roaming-events:read}. Policy writes require
 * {@code PERM_detection-rules:write}. Both permissions already exist in the realm and are held by
 * SECURITY_ANALYST, so no new Keycloak roles are needed. The liveness probe {@code /health} stays
 * public.</p>
 */
@RestController
@RequestMapping("/api/protection")
@Tag(name = "Rate Limiting / Protection", description = "Redis token-bucket rate limiting & abuse protection")
public class ProtectionController {

	private final TokenBucketService limiter;
	private final RateLimitPolicyRepository policies;

	public ProtectionController(TokenBucketService limiter, RateLimitPolicyRepository policies) {
		this.limiter = limiter;
		this.policies = policies;
	}

	@Operation(summary = "Rate-limit decision",
			description = "Consumes tokens for {keyType,key} and returns whether the request is allowed, "
					+ "with remaining tokens and retry-after. Requires protection:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@PostMapping("/check")
	public ResponseEntity<RateLimitResult> check(@Valid @RequestBody RateLimitCheckRequest req) {
		RateLimitResult result = limiter.check(req.keyType(), req.key(), req.tokensOrDefault());
		// Surface the verdict as HTTP status too, so a gateway filter can react without parsing the body.
		return ResponseEntity.status(result.allowed() ? HttpStatus.OK : HttpStatus.TOO_MANY_REQUESTS)
				.header("X-RateLimit-Remaining", Long.toString(result.remaining()))
				.header("Retry-After", Long.toString(Math.max(0, result.retryAfterMs() / 1000)))
				.body(result);
	}

	@Operation(summary = "List policies", security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/policies")
	public List<RateLimitPolicy> listPolicies() {
		return policies.findAll();
	}

	@Operation(summary = "Create or replace a policy", security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_detection-rules:write')")
	@PutMapping("/policies/{keyType}")
	public RateLimitPolicy upsertPolicy(@PathVariable String keyType, @RequestBody RateLimitPolicy body) {
		RateLimitPolicy policy = policies.findById(keyType)
				.map(existing -> {
					existing.update(body.capacity(), body.refillTokens(), body.refillIntervalMs(),
							body.action(), body.enabled(), body.description());
					return existing;
				})
				.orElseGet(() -> new RateLimitPolicy(keyType, body.capacity(), body.refillTokens(),
						body.refillIntervalMs(), body.action(), body.enabled(), body.description()));
		return policies.save(policy);
	}

	@Operation(summary = "Delete a policy", security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_detection-rules:write')")
	@DeleteMapping("/policies/{keyType}")
	public ResponseEntity<Void> deletePolicy(@PathVariable String keyType) {
		policies.deleteById(keyType);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Protection stats",
			description = "Allowed/blocked decision counts, block rate and worst offenders. Requires protection:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/stats")
	public ProtectionStatsDto stats(@RequestParam(defaultValue = "10") int topN) {
		long allowed = limiter.allowedCount();
		long blocked = limiter.blockedCount();
		long total = allowed + blocked;
		double rate = total == 0 ? 0.0 : Math.round((blocked * 10000.0) / total) / 100.0;
		return new ProtectionStatsDto(allowed, blocked, rate, policies.count(), limiter.topBlocked(topN));
	}
}
