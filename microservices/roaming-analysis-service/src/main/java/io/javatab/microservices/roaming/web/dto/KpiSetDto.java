package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.KpiWindow;

import java.time.Instant;

/**
 * The Performance Assurance KPI set (§5.2) for one aggregation window, per partner / RAT / service.
 * Percentages are 0..100; latency in ms; ACD in seconds; throughput in Mbps.
 *
 * @param registrationSuccessRate (successful attach/registration accepts) / (total attempts) × 100
 * @param asr                     Answer Seizure Ratio — answered voice / voice attempts × 100
 * @param ner                     Network Efficiency Ratio — calls with a valid network response / attempts × 100
 * @param acdSeconds              Average Call Duration — total answered duration / answered calls
 * @param sessionSetupSuccessRate successful session establishments / total session attempts × 100
 * @param avgLatencyMs            mean session latency
 * @param latencyP50Ms            latency percentiles tracked per RAT/service
 * @param dropRatePct             abnormally released sessions / total established × 100
 * @param throughputMbps          aggregate data throughput (bytes×8 / active session seconds)
 */
public record KpiSetDto(
		String partner,
		KpiWindow window,
		Instant windowStart,
		Instant windowEnd,
		double registrationSuccessRate,
		double asr,
		double ner,
		double acdSeconds,
		double sessionSetupSuccessRate,
		double avgLatencyMs,
		double latencyP50Ms,
		double latencyP95Ms,
		double latencyP99Ms,
		double dropRatePct,
		double throughputMbps,
		// sample sizes (denominators) — for transparency / weighting
		long attachAttempts,
		long voiceAttempts,
		long sessionAttempts
) {
}
