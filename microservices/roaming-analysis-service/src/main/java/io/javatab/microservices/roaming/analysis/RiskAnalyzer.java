package io.javatab.microservices.roaming.analysis;

import io.javatab.microservices.roaming.domain.RoamingEvent;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Turns a {@link RoamingEvent}'s raw signals into a 0-100 risk score.
 *
 * <p>Heuristic, deliberately simple and explainable — a placeholder for a future ML/rules
 * engine. Weights are additive and clamped to [0, 100].</p>
 */
@Component
public class RiskAnalyzer {

	/** PLMNs flagged as higher-risk sources (fraud/signalling history). MCC-MNC. */
	private static final Set<String> HIGH_RISK_PLMNS = Set.of("310-260", "404-45", "621-30");

	public int score(RoamingEvent e) {
		int score = 5; // baseline

		// Impossible travel is the strongest single indicator.
		if (e.impossibleTravel()) {
			score += 40;
		}

		// Signalling errors: 3 points each, capped at 21.
		score += Math.min(e.signalingErrors() * 3, 21);

		// New/unknown devices: up to 25 points.
		score += (int) Math.round(clamp01(e.newDeviceRatio()) * 25);

		// Known bad partner PLMN.
		if (HIGH_RISK_PLMNS.contains(e.partnerPlmn())) {
			score += 20;
		}

		// A very small subscriber count on inbound roaming can indicate targeted probing.
		if (e.subscribers() > 0 && e.subscribers() < 20) {
			score += 8;
		}

		return Math.max(0, Math.min(100, score));
	}

	private static double clamp01(double v) {
		return Math.max(0.0, Math.min(1.0, v));
	}
}
