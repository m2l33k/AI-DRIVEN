package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.RiskLevel;

/**
 * Per-partner-PLMN roll-up.
 *
 * @param partnerPlmn   partner PLMN id (MCC-MNC)
 * @param country       country of the partner PLMN
 * @param events        number of events involving this partner
 * @param subscribers   total subscribers across those events
 * @param avgRiskScore  mean risk score (0-100), rounded
 * @param peakRiskLevel highest risk band seen for this partner
 * @param highRiskCount number of HIGH-risk events for this partner
 */
public record PartnerSummaryDto(
		String partnerPlmn,
		String country,
		long events,
		long subscribers,
		int avgRiskScore,
		RiskLevel peakRiskLevel,
		long highRiskCount
) {
}
