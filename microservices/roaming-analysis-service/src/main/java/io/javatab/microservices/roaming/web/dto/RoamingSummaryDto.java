package io.javatab.microservices.roaming.web.dto;

import java.util.List;
import java.util.Map;

/**
 * Aggregated roaming analytics for dashboards.
 *
 * @param totalEvents      number of events considered
 * @param totalSubscribers total distinct subscribers across events
 * @param inboundCount     events where direction is INBOUND
 * @param outboundCount    events where direction is OUTBOUND
 * @param byRiskLevel      count of events per risk band (LOW/MEDIUM/HIGH)
 * @param highRiskCount    convenience count of HIGH-risk events
 * @param volumeSeries     subscribers bucketed over time, oldest-first
 */
public record RoamingSummaryDto(
		long totalEvents,
		long totalSubscribers,
		long inboundCount,
		long outboundCount,
		Map<String, Long> byRiskLevel,
		long highRiskCount,
		List<VolumePoint> volumeSeries
) {
	/** One point in the volume time series. */
	public record VolumePoint(String label, long subscribers) {
	}
}
