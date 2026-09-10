package io.javatab.microservices.roaming.analysis;

import io.javatab.microservices.roaming.domain.AttachEvent;
import io.javatab.microservices.roaming.domain.KpiWindow;
import io.javatab.microservices.roaming.domain.RoamingCdr;
import io.javatab.microservices.roaming.domain.SessionQos;
import io.javatab.microservices.roaming.web.dto.KpiSetDto;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure KPI computation for the Performance Assurance Engine (§5.2). Given the events already scoped
 * to a partner and a window, it produces one {@link KpiSetDto}.
 *
 * <p>Formulas follow the spec; where the dataset lacks an explicit signal the proxy is documented:
 * <ul>
 *   <li><b>ASR</b> answered = a voice CDR with a positive {@code durationSeconds}.</li>
 *   <li><b>NER</b> valid network response = a voice CDR with a {@code callEndDatetime} (includes
 *       busy/no-answer that still got a network response), so NER ≥ ASR.</li>
 *   <li><b>Session setup success</b> = non-dropped established sessions / total (the dataset has no
 *       explicit setup-failure rows, so this is complementary to the drop rate).</li>
 * </ul>
 */
@Component
public class KpiCalculator {

	private static final String STATUS_SUCCESS = "success";
	private static final String STATUS_DROPPED = "dropped";
	private static final String CALL_VOICE = "voice";

	public KpiSetDto compute(String partner, KpiWindow window, Instant start, Instant end,
							 List<AttachEvent> attaches, List<RoamingCdr> cdrs, List<SessionQos> sessions) {

		// --- Registration Success Rate (attach) ---
		long attachAttempts = attaches.size();
		long attachOk = attaches.stream().filter(a -> STATUS_SUCCESS.equalsIgnoreCase(a.attachStatus())).count();
		double regSuccessRate = pct(attachOk, attachAttempts);

		// --- Voice KPIs: ASR / NER / ACD ---
		List<RoamingCdr> voice = cdrs.stream().filter(c -> CALL_VOICE.equalsIgnoreCase(c.callType())).toList();
		long voiceAttempts = voice.size();
		long answered = voice.stream().filter(c -> c.durationSeconds() != null && c.durationSeconds() > 0).count();
		long withResponse = voice.stream().filter(c -> c.callEndDatetime() != null).count();
		double asr = pct(answered, voiceAttempts);
		double ner = pct(Math.max(answered, withResponse), voiceAttempts);
		double totalAnsweredDuration = voice.stream()
				.filter(c -> c.durationSeconds() != null && c.durationSeconds() > 0)
				.mapToDouble(RoamingCdr::durationSeconds).sum();
		double acdSeconds = answered == 0 ? 0.0 : round(totalAnsweredDuration / answered);

		// --- Session KPIs: setup success / drop rate / latency / throughput ---
		long sessionAttempts = sessions.size();
		long dropped = sessions.stream().filter(s -> STATUS_DROPPED.equalsIgnoreCase(s.sessionStatus())).count();
		long established = sessionAttempts; // every session_qos row is an established session
		double sessionSetupSuccessRate = pct(sessionAttempts - dropped, sessionAttempts);
		double dropRatePct = pct(dropped, established);

		List<Double> latencies = new ArrayList<>();
		for (SessionQos s : sessions) {
			if (s.latencyMs() != null) latencies.add(s.latencyMs());
		}
		double avgLatency = latencies.isEmpty() ? 0.0
				: round(latencies.stream().mapToDouble(Double::doubleValue).average().orElse(0));
		double p50 = percentile(latencies, 50);
		double p95 = percentile(latencies, 95);
		double p99 = percentile(latencies, 99);

		double throughputMbps = aggregateThroughput(sessions);

		return new KpiSetDto(partner, window, start, end,
				regSuccessRate, asr, ner, acdSeconds,
				sessionSetupSuccessRate, avgLatency, p50, p95, p99,
				dropRatePct, throughputMbps,
				attachAttempts, voiceAttempts, sessionAttempts);
	}

	/** Aggregate data throughput: total transferred bits / total active session seconds → Mbps. */
	private double aggregateThroughput(List<SessionQos> sessions) {
		double totalMb = 0, totalSeconds = 0;
		double avgAccumulator = 0;
		int avgCount = 0;
		for (SessionQos s : sessions) {
			double dl = s.downloadMb() == null ? 0 : s.downloadMb();
			double ul = s.uploadMb() == null ? 0 : s.uploadMb();
			totalMb += dl + ul;
			if (s.sessionStartDatetime() != null && s.sessionEndDatetime() != null) {
				long secs = s.sessionEndDatetime().getEpochSecond() - s.sessionStartDatetime().getEpochSecond();
				if (secs > 0) totalSeconds += secs;
			}
			if (s.avgThroughputMbps() != null) { avgAccumulator += s.avgThroughputMbps(); avgCount++; }
		}
		if (totalSeconds > 0) {
			// MB → megabits (×8) over active seconds
			return round((totalMb * 8.0) / totalSeconds);
		}
		return avgCount == 0 ? 0.0 : round(avgAccumulator / avgCount);
	}

	/** Nearest-rank percentile over an unsorted list; 0 if empty. */
	public static double percentile(List<Double> values, double p) {
		if (values == null || values.isEmpty()) return 0.0;
		List<Double> sorted = new ArrayList<>(values);
		sorted.sort(Double::compareTo);
		int rank = (int) Math.ceil(p / 100.0 * sorted.size());
		int idx = Math.min(Math.max(rank - 1, 0), sorted.size() - 1);
		return round(sorted.get(idx));
	}

	private static double pct(long num, long den) {
		return den == 0 ? 0.0 : round(num * 100.0 / den);
	}

	private static double round(double v) {
		return Math.round(v * 100.0) / 100.0;
	}
}
