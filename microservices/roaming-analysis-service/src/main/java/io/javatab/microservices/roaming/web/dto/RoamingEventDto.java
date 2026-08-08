package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;

import java.time.Instant;

/** API view of a roaming event, enriched with the computed risk score and band. */
public record RoamingEventDto(
		String id,
		Instant timestamp,
		Direction direction,
		String partnerPlmn,
		String country,
		int subscribers,
		int signalingErrors,
		double newDeviceRatio,
		boolean impossibleTravel,
		int riskScore,
		RiskLevel riskLevel
) {
}
