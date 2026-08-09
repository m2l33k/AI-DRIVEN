package io.javatab.microservices.roaming.web.dto;

/** Per-partner commercial + risk roll-up with a roaming-agreement recommendation. */
public record OptimizationDto(
		String partnerPlmn,
		String country,
		long events,
		long subscribers,
		double revenueEur,
		double costEur,
		double marginEur,
		double marginPct,
		int avgRiskScore,
		int experienceScore,
		String action,
		String recommendation
) {
}
