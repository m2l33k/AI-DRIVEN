package io.javatab.microservices.roaming.domain;

import java.time.Instant;

/**
 * A single roaming event observed at the network edge (e.g. from GRX/IPX signalling).
 *
 * <p>The {@code raw signals} below are what the {@link
 * io.javatab.microservices.roaming.analysis.RiskAnalyzer} consumes to produce a risk score;
 * they are the inputs to analysis, not the analysis result.</p>
 *
 * @param id             stable identifier (e.g. {@code RE-1001})
 * @param timestamp      when the event was observed
 * @param direction      inbound vs outbound roaming
 * @param partnerPlmn    partner PLMN id as {@code MCC-MNC} (e.g. {@code 234-15})
 * @param country        human-readable country of the partner PLMN
 * @param subscribers    number of distinct subscribers in this event window
 * @param signalingErrors count of signalling errors/rejections seen in the window
 * @param newDeviceRatio fraction (0.0-1.0) of subscribers on never-seen devices/IMEIs
 * @param impossibleTravel true if velocity between locations implies impossible travel
 */
public record RoamingEvent(
		String id,
		Instant timestamp,
		Direction direction,
		String partnerPlmn,
		String country,
		int subscribers,
		int signalingErrors,
		double newDeviceRatio,
		boolean impossibleTravel
) {
}
