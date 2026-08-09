package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;

import java.time.Instant;
import java.util.List;

/** A roaming event flagged as anomalous, with the reasons that triggered the flag. */
public record AnomalyDto(
		String id,
		Instant timestamp,
		Direction direction,
		String partnerPlmn,
		String country,
		int riskScore,
		RiskLevel riskLevel,
		String severity,
		List<String> reasons
) {
}
