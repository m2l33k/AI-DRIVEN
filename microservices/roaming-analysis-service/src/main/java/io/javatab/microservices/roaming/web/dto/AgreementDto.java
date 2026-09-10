package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.RoamingAgreement;

/** Wire view of a {@link RoamingAgreement} — SLA thresholds + rolling performance state. */
public record AgreementDto(
		String partnerOperatorId,
		String partnerName,
		String ir21Ref,
		double regSuccessMinPct,
		double asrMinPct,
		double sessionSuccessMinPct,
		double latencyP95MaxMs,
		double dropRateMaxPct,
		double throughputMinMbps,
		double rollingPerformanceScore,
		int consecutiveBreaches,
		String tier
) {
	public static AgreementDto from(RoamingAgreement a) {
		return new AgreementDto(
				a.partnerOperatorId(), a.partnerName(), a.ir21Ref(),
				a.regSuccessMinPct(), a.asrMinPct(), a.sessionSuccessMinPct(),
				a.latencyP95MaxMs(), a.dropRateMaxPct(), a.throughputMinMbps(),
				a.rollingPerformanceScore(), a.consecutiveBreaches(), a.tier());
	}
}
