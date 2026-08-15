package io.javatab.microservices.ratelimit.web.dto;

import io.javatab.microservices.ratelimit.ratelimit.TokenBucketService.TopKey;

import java.util.List;

/**
 * Aggregate protection stats for the security dashboard: how many decisions were allowed vs
 * blocked, the block rate, active policy count, and the worst offenders.
 */
public record ProtectionStatsDto(
		long allowed,
		long blocked,
		double blockRatePct,
		long policyCount,
		List<TopKey> topBlocked) {
}
