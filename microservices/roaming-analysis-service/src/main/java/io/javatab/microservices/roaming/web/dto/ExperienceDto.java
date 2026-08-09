package io.javatab.microservices.roaming.web.dto;

/** Customer-experience (QoS) roll-up for one partner PLMN. */
public record ExperienceDto(
		String partnerPlmn,
		String country,
		long events,
		double avgLatencyMs,
		double throughputMbps,
		double dropRatePct,
		int experienceScore,
		String rating
) {
}
