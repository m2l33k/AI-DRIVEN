package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/** Platform-wide quality-of-service overview plus the weakest partners. */
public record QosDto(
		double avgLatencyMs,
		double throughputMbps,
		double dropRatePct,
		int qosScore,
		List<ExperienceDto> worstPartners
) {
}
