package io.javatab.microservices.roaming.domain;

/** Risk banding derived from a numeric risk score (0-100). */
public enum RiskLevel {
	LOW,
	MEDIUM,
	HIGH;

	/** Maps a 0-100 score to a band: &lt;30 LOW, &lt;60 MEDIUM, otherwise HIGH. */
	public static RiskLevel fromScore(int score) {
		if (score < 30) {
			return LOW;
		}
		if (score < 60) {
			return MEDIUM;
		}
		return HIGH;
	}
}
