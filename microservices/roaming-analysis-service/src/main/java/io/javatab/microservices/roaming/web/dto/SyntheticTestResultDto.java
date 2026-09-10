package io.javatab.microservices.roaming.web.dto;

import java.time.Instant;

/**
 * Result of one scheduled IREG-style synthetic test transaction (§5.2 test-call scheduler):
 * registration, MO/MT call, SMS or data session executed against an active roaming agreement.
 *
 * <p>Flagged {@code sessionType = "Synthetic_Test"} and never added to the live-traffic
 * repositories, so it is excluded from live KPI denominators by construction.</p>
 */
public record SyntheticTestResultDto(
		String partner,
		String transactionType,
		String sessionType,
		boolean success,
		double latencyMs,
		Instant executedAt,
		String detail
) {
}
