package io.javatab.microservices.roaming.analysis;

import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import io.javatab.microservices.roaming.web.dto.AnomalyDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToDoubleFunction;

/**
 * Detects anomalous roaming events by combining three signals into a single, explainable
 * {@code anomalyScore} (0-100):
 *
 * <ol>
 *   <li><b>Fraud risk</b> — the {@link RiskAnalyzer} score (impossible travel, signalling, etc.).</li>
 *   <li><b>Fixed thresholds</b> — domain rules (latency &gt; 120 ms, drops &gt; 15 %, …).</li>
 *   <li><b>Statistical baseline</b> — how many standard deviations (z-score) each metric sits from
 *       the population mean, so an event stands out <em>relative to its peers</em> even when no fixed
 *       threshold is crossed.</li>
 * </ol>
 *
 * <p>Heuristic and deliberately transparent — every flag carries a human-readable reason. Works over
 * any list of events (the live DB, an uploaded CSV or a simulated batch), computing the baseline from
 * that same list.</p>
 */
@Component
public class AnomalyDetector {

	/** Metric must be at least this many σ from the mean before it is called out statistically. */
	private static final double Z_FLAG = 2.5;
	/** Events scoring below this composite value are not reported as anomalies. */
	private static final int REPORT_THRESHOLD = 35;

	private final RiskAnalyzer riskAnalyzer;

	public AnomalyDetector(RiskAnalyzer riskAnalyzer) {
		this.riskAnalyzer = riskAnalyzer;
	}

	public List<AnomalyDto> detect(List<RoamingEvent> events) {
		if (events == null || events.isEmpty()) {
			return List.of();
		}

		Stat latency = Stat.of(events, RoamingEvent::avgLatencyMs);
		Stat drop = Stat.of(events, RoamingEvent::droppedSessionRatio);
		Stat throughput = Stat.of(events, RoamingEvent::throughputMbps);
		Stat errors = Stat.of(events, e -> e.signalingErrors());
		Stat newDevice = Stat.of(events, RoamingEvent::newDeviceRatio);
		Stat subs = Stat.of(events, e -> e.subscribers());

		List<AnomalyDto> out = new ArrayList<>();
		for (RoamingEvent e : events) {
			int risk = riskAnalyzer.score(e);
			List<String> reasons = new ArrayList<>();

			// --- fixed domain thresholds ---
			if (risk >= 60) reasons.add("High risk score (" + risk + ")");
			if (e.impossibleTravel()) reasons.add("Impossible travel detected");
			if (e.signalingErrors() >= 6) reasons.add("Signalling error spike (" + e.signalingErrors() + ")");
			if (e.newDeviceRatio() >= 0.4) reasons.add("High new-device ratio (" + pct(e.newDeviceRatio()) + "%)");
			if (e.droppedSessionRatio() >= 0.15) reasons.add("Elevated dropped sessions (" + pct(e.droppedSessionRatio()) + "%)");
			if (e.avgLatencyMs() >= 120) reasons.add("High latency (" + e.avgLatencyMs() + " ms)");

			// --- statistical baseline deviations (z-scores over this dataset) ---
			double deviationPoints = 0;
			double maxAbsZ = 0;

			double zLat = latency.z(e.avgLatencyMs());
			if (zLat >= Z_FLAG) { reasons.add(dev("Latency", e.avgLatencyMs() + " ms", zLat)); deviationPoints += points(zLat); }
			double zDrop = drop.z(e.droppedSessionRatio());
			if (zDrop >= Z_FLAG) { reasons.add(dev("Dropped-session ratio", pct(e.droppedSessionRatio()) + "%", zDrop)); deviationPoints += points(zDrop); }
			double zErr = errors.z(e.signalingErrors());
			if (zErr >= Z_FLAG) { reasons.add(dev("Signalling errors", String.valueOf(e.signalingErrors()), zErr)); deviationPoints += points(zErr); }
			double zNew = newDevice.z(e.newDeviceRatio());
			if (zNew >= Z_FLAG) { reasons.add(dev("New-device ratio", pct(e.newDeviceRatio()) + "%", zNew)); deviationPoints += points(zNew); }
			double zTput = -throughput.z(e.throughputMbps()); // low throughput is the anomaly
			if (zTput >= Z_FLAG) { reasons.add(dev("Throughput", e.throughputMbps() + " Mbps (below baseline)", zTput)); deviationPoints += points(zTput); }
			double zSubs = Math.abs(subs.z(e.subscribers()));
			if (zSubs >= 3.0) { reasons.add(dev("Traffic volume", e.subscribers() + " subscribers", zSubs)); deviationPoints += points(zSubs); }

			maxAbsZ = Math.max(Math.max(Math.max(zLat, zDrop), Math.max(zErr, zNew)), Math.max(zTput, zSubs));

			// --- composite score: half the fraud risk + capped deviation + a bump for impossible travel ---
			int anomalyScore = (int) Math.round(clamp(
					0.5 * risk + Math.min(50, deviationPoints) + (e.impossibleTravel() ? 25 : 0)));

			if (reasons.isEmpty() && anomalyScore < REPORT_THRESHOLD) {
				continue;
			}

			String severity = anomalyScore >= 75 || e.impossibleTravel() ? "CRITICAL"
					: anomalyScore >= 50 || reasons.size() >= 2 ? "WARNING" : "INFO";

			out.add(new AnomalyDto(e.id(), e.timestamp(), e.direction(), e.partnerPlmn(), e.country(),
					risk, RiskLevel.fromScore(risk), anomalyScore, round(Math.max(0, maxAbsZ), 2),
					severity, reasons));
		}
		out.sort(Comparator.comparingInt(AnomalyDto::anomalyScore).reversed());
		return out;
	}

	private static String dev(String metric, String value, double z) {
		return metric + " " + round(z, 1) + "σ above baseline (" + value + ")";
	}

	/** Contribution of a z-score beyond the flag threshold, capped so no single metric dominates. */
	private static double points(double z) {
		return Math.min(15, (z - Z_FLAG) * 8 + 6);
	}

	private static double clamp(double v) { return Math.max(0, Math.min(100, v)); }
	private static long pct(double ratio) { return Math.round(ratio * 100); }
	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}

	/** Mean/standard-deviation of one metric over a population, with a safe z-score. */
	private record Stat(double mean, double std) {
		static Stat of(List<RoamingEvent> events, ToDoubleFunction<RoamingEvent> f) {
			double mean = events.stream().mapToDouble(f).average().orElse(0);
			double var = events.stream().mapToDouble(f).map(v -> (v - mean) * (v - mean)).average().orElse(0);
			return new Stat(mean, Math.sqrt(var));
		}

		double z(double value) {
			return std < 1e-9 ? 0 : (value - mean) / std;
		}
	}
}
