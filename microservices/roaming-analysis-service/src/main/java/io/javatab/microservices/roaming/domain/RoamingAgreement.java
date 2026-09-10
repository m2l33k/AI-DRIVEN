package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Roaming Agreement metadata (§4.1 Metadata &amp; Correlation Store, §5.2 SLA evaluation).
 *
 * <p>One row per partner (visited operator). Holds the {@code SLA_KPIs} thresholds the Performance
 * Assurance Engine compares each aggregation window against, plus a <b>rolling performance score</b>
 * and consecutive-breach counter that the Steering Protection Engine reads for dynamic tier
 * adjustment.</p>
 *
 * <p>Record-style accessors (per the codebase convention); the mutable performance state is updated
 * through {@link #applyEvaluation(double, boolean)} rather than setters.</p>
 */
@Entity
@Table(name = "roaming_agreements")
public class RoamingAgreement {

	@Id
	@Column(name = "partner_operator_id")
	private String partnerOperatorId;
	@Column(name = "partner_name")
	private String partnerName;

	/** IR.21-style reference / RAEX-RADB link (metadata pointer). */
	@Column(name = "ir21_ref")
	private String ir21Ref;

	// --- SLA_KPIs thresholds -------------------------------------------------
	@Column(name = "reg_success_min_pct")
	private double regSuccessMinPct;
	@Column(name = "asr_min_pct")
	private double asrMinPct;
	@Column(name = "session_success_min_pct")
	private double sessionSuccessMinPct;
	@Column(name = "latency_p95_max_ms")
	private double latencyP95MaxMs;
	@Column(name = "drop_rate_max_pct")
	private double dropRateMaxPct;
	@Column(name = "throughput_min_mbps")
	private double throughputMinMbps;

	// --- rolling performance state (updated by the assurance engine) --------
	@Column(name = "rolling_performance_score")
	private double rollingPerformanceScore = 100.0;
	@Column(name = "consecutive_breaches")
	private int consecutiveBreaches = 0;
	@Column(name = "tier")
	private String tier = "PREFERRED";

	protected RoamingAgreement() {
	}

	public RoamingAgreement(String partnerOperatorId, String partnerName, String ir21Ref,
							double regSuccessMinPct, double asrMinPct, double sessionSuccessMinPct,
							double latencyP95MaxMs, double dropRateMaxPct, double throughputMinMbps) {
		this.partnerOperatorId = partnerOperatorId;
		this.partnerName = partnerName;
		this.ir21Ref = ir21Ref;
		this.regSuccessMinPct = regSuccessMinPct;
		this.asrMinPct = asrMinPct;
		this.sessionSuccessMinPct = sessionSuccessMinPct;
		this.latencyP95MaxMs = latencyP95MaxMs;
		this.dropRateMaxPct = dropRateMaxPct;
		this.throughputMinMbps = throughputMinMbps;
	}

	public String partnerOperatorId() { return partnerOperatorId; }
	public String partnerName() { return partnerName; }
	public String ir21Ref() { return ir21Ref; }
	public double regSuccessMinPct() { return regSuccessMinPct; }
	public double asrMinPct() { return asrMinPct; }
	public double sessionSuccessMinPct() { return sessionSuccessMinPct; }
	public double latencyP95MaxMs() { return latencyP95MaxMs; }
	public double dropRateMaxPct() { return dropRateMaxPct; }
	public double throughputMinMbps() { return throughputMinMbps; }
	public double rollingPerformanceScore() { return rollingPerformanceScore; }
	public int consecutiveBreaches() { return consecutiveBreaches; }
	public String tier() { return tier; }

	/**
	 * Fold one window's evaluation into the rolling state.
	 *
	 * @param windowScore 0..100 = fraction of SLA KPIs that passed this window, ×100
	 * @param breached    whether this window breached any SLA KPI
	 */
	public void applyEvaluation(double windowScore, boolean breached) {
		// EWMA so a single bad window nudges rather than jumps the score.
		this.rollingPerformanceScore = Math.round((0.7 * rollingPerformanceScore + 0.3 * windowScore) * 10.0) / 10.0;
		this.consecutiveBreaches = breached ? consecutiveBreaches + 1 : 0;
		this.tier = deriveTier();
	}

	private String deriveTier() {
		if (rollingPerformanceScore >= 90) return "PREFERRED";
		if (rollingPerformanceScore >= 75) return "STANDARD";
		if (rollingPerformanceScore >= 60) return "PROBATION";
		return "RESTRICTED";
	}
}
