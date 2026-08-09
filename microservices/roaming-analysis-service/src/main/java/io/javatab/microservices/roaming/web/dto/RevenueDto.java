package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/** Roaming revenue / cost / margin overview. */
public record RevenueDto(
		double totalRevenueEur,
		double totalCostEur,
		double marginEur,
		double marginPct,
		double revenuePerSubscriberEur,
		double inboundRevenueEur,
		double outboundRevenueEur,
		List<PartnerRevenue> topPartners
) {
	public record PartnerRevenue(String partnerPlmn, String country, double revenueEur, double marginEur) {
	}
}
