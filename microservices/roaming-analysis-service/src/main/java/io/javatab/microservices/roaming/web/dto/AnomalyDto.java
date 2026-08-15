package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;

import java.time.Instant;
import java.util.List;

/**
 * A roaming event flagged as anomalous, with the reasons that triggered the flag.
 *
 * <p>{@code anomalyScore} (0-100) is a composite of fraud risk plus how far the event's QoS/traffic
 * metrics deviate from the population baseline; {@code baselineDeviation} is the largest metric
 * z-score (standard deviations from the mean) that contributed.</p>
 */
public record AnomalyDto(
		String id,
		Instant timestamp,
		Direction direction,
		String partnerPlmn,
		String country,
		int riskScore,
		RiskLevel riskLevel,
		int anomalyScore,
		double baselineDeviation,
		String severity,
		List<String> reasons
) {
}
