package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/**
 * Result of evaluating a partner's latest window KPIs against its SLA thresholds (§5.2).
 *
 * @param breaches            human-readable breached-KPI descriptions (empty if compliant)
 * @param breached            true if any KPI breached this window
 * @param consecutiveBreaches how many consecutive windows have breached (drives alarming)
 * @param alarm               true when consecutiveBreaches ≥ the configured alarm threshold
 * @param rollingScore        the agreement's rolling performance score (0..100)
 * @param tier                the derived steering tier
 */
public record SlaEvaluationDto(
		String partner,
		KpiSetDto kpis,
		List<String> breaches,
		boolean breached,
		int consecutiveBreaches,
		boolean alarm,
		double rollingScore,
		String tier
) {
}
