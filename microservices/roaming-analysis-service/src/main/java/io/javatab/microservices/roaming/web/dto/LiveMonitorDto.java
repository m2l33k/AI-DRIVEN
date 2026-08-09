package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/** Real-time roaming snapshot over a recent time window. */
public record LiveMonitorDto(
		int windowMinutes,
		int activeEvents,
		long activeSubscribers,
		double eventsPerMinute,
		int avgRiskScore,
		long highRiskCount,
		double windowRevenueEur,
		List<RoamingEventDto> recent
) {
}
