package io.javatab.microservices.roaming.service;

import io.javatab.microservices.roaming.analysis.AnomalyDetector;
import io.javatab.microservices.roaming.analysis.RiskAnalyzer;
import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import io.javatab.microservices.roaming.ingest.RoamingEventCsvParser;
import io.javatab.microservices.roaming.ingest.RoamingEventCsvParser.CsvParseResult;
import io.javatab.microservices.roaming.web.dto.AnomalyDto;
import io.javatab.microservices.roaming.web.dto.CsvAnalysisDto;
import io.javatab.microservices.roaming.web.dto.ExperienceDto;
import io.javatab.microservices.roaming.web.dto.ForecastDto;
import io.javatab.microservices.roaming.web.dto.LiveMonitorDto;
import io.javatab.microservices.roaming.web.dto.OptimizationDto;
import io.javatab.microservices.roaming.web.dto.QosDto;
import io.javatab.microservices.roaming.web.dto.RevenueDto;
import io.javatab.microservices.roaming.web.dto.RoamingEventDto;
import io.javatab.microservices.roaming.web.dto.SimulationResultDto;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Business analytics over roaming events, covering: real-time monitoring, anomaly detection,
 * traffic forecasting, customer-experience/QoS analysis, and commercial (agreement/cost/revenue)
 * optimisation. Heuristic/statistical — deliberately explainable, a placeholder for ML models.
 */
@Service
public class RoamingInsightsService {

	private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("HH:00").withZone(ZoneOffset.UTC);

	private final RoamingEventProjection projection;
	private final RiskAnalyzer riskAnalyzer;
	private final AnomalyDetector anomalyDetector;
	private final RoamingAnalysisService analysisService;
	private final RoamingEventCsvParser csvParser;
	private final RoamingSimulator simulator;

	public RoamingInsightsService(RoamingEventProjection projection, RiskAnalyzer riskAnalyzer,
								  AnomalyDetector anomalyDetector, RoamingAnalysisService analysisService,
								  RoamingEventCsvParser csvParser, RoamingSimulator simulator) {
		this.projection = projection;
		this.riskAnalyzer = riskAnalyzer;
		this.anomalyDetector = anomalyDetector;
		this.analysisService = analysisService;
		this.csvParser = csvParser;
		this.simulator = simulator;
	}

	/** ✅ Monitor roaming in real time — snapshot over the last {@code windowMinutes}. */
	public LiveMonitorDto live(int windowMinutes) {
		return liveOver(projection.events(), windowMinutes);
	}

	/**
	 * Live-monitor snapshot over an arbitrary event set. The reference "now" is the newest event in
	 * the set (the dataset is historical), so a window always covers the most recent activity.
	 */
	private LiveMonitorDto liveOver(List<RoamingEvent> events, int windowMinutes) {
		Instant referenceNow = events.stream().map(RoamingEvent::timestamp)
				.max(Comparator.naturalOrder()).orElse(Instant.now());
		Instant cutoff = referenceNow.minus(windowMinutes, ChronoUnit.MINUTES);
		List<RoamingEvent> window = events.stream()
				.filter(e -> !e.timestamp().isBefore(cutoff))
				.sorted(Comparator.comparing(RoamingEvent::timestamp).reversed())
				.toList();

		long subs = window.stream().mapToLong(RoamingEvent::subscribers).sum();
		int avgRisk = (int) Math.round(window.stream().mapToInt(riskAnalyzer::score).average().orElse(0));
		long highRisk = window.stream().filter(e -> riskAnalyzer.score(e) >= 60).count();
		double revenue = round(window.stream().mapToDouble(RoamingEvent::revenueEur).sum(), 2);
		double perMin = window.isEmpty() ? 0 : round((double) window.size() / windowMinutes, 2);
		List<RoamingEventDto> recent = window.stream().limit(8).map(this::toDto).toList();

		return new LiveMonitorDto(windowMinutes, window.size(), subs, perMin, avgRisk, highRisk, revenue, recent);
	}

	/** ✅ Detect anomalies — statistical + rule-based detection over all persisted events. */
	public List<AnomalyDto> anomalies() {
		return anomalyDetector.detect(projection.events());
	}

	/**
	 * ✅ Analyse an uploaded CSV — parse it, summarise all the data, flag anomalies and forecast the
	 * next {@code hoursAhead} hours of traffic. Nothing is persisted.
	 */
	public CsvAnalysisDto analyzeCsv(MultipartFile file, int hoursAhead) {
		CsvParseResult res = csvParser.parse(file);
		return new CsvAnalysisDto(
				res.fileName(), res.parsed(), res.skipped(), res.columns(),
				analysisService.summary(res.events()),
				anomalyDetector.detect(res.events()),
				forecast(hoursAhead, res.events()));
	}

	/**
	 * ✅ Simulate roaming traffic — generate {@code count} synthetic events over the last
	 * {@code minutesSpread} minutes (persisted) and return a live-monitor snapshot over
	 * {@code windowMinutes} so the effect can be observed.
	 */
	public SimulationResultDto simulate(int count, int minutesSpread, int windowMinutes) {
		List<RoamingEvent> generated = simulator.generate(count, minutesSpread, false);
		List<RoamingEventDto> sample = generated.stream()
				.sorted(Comparator.comparing(RoamingEvent::timestamp).reversed())
				.limit(8)
				.map(this::toDto)
				.toList();
		return new SimulationResultDto(generated.size(), windowMinutes, liveOver(generated, windowMinutes), sample);
	}

	/** ✅ Predict future traffic — linear-trend forecast of subscribers/hour for {@code hoursAhead}. */
	public ForecastDto forecast(int hoursAhead) {
		return forecast(hoursAhead, projection.events());
	}

	/** Linear-trend forecast over an arbitrary set of events (DB or an uploaded CSV). */
	public ForecastDto forecast(int hoursAhead, List<RoamingEvent> events) {
		Map<String, Long> buckets = new TreeMap<>();
		events.forEach(e -> buckets.merge(HOUR.format(e.timestamp()), (long) e.subscribers(), Long::sum));
		List<ForecastDto.Point> history = buckets.entrySet().stream()
				.map(en -> new ForecastDto.Point(en.getKey(), en.getValue(), false))
				.toList();

		int n = history.size();
		double sx = 0, sy = 0, sxy = 0, sxx = 0;
		for (int i = 0; i < n; i++) {
			double y = history.get(i).subscribers();
			sx += i; sy += y; sxy += i * y; sxx += (double) i * i;
		}
		double denom = n * sxx - sx * sx;
		double slope = n > 1 && denom != 0 ? (n * sxy - sx * sy) / denom : 0;
		double intercept = n > 0 ? (sy - slope * sx) / n : 0;

		int lastHour = n > 0 ? Integer.parseInt(history.get(n - 1).hour().substring(0, 2)) : 0;
		List<ForecastDto.Point> forecast = new ArrayList<>();
		for (int k = 1; k <= hoursAhead; k++) {
			long y = Math.max(0, Math.round(intercept + slope * (n - 1 + k)));
			String label = String.format("%02d:00", (lastHour + k) % 24);
			forecast.add(new ForecastDto.Point(label, y, true));
		}
		return new ForecastDto("linear-regression", round(slope, 1), history, forecast);
	}

	/** ✅ Analyze customer experience — per-partner QoS experience score (worst first). */
	public List<ExperienceDto> experience() {
		return groupByPlmn().values().stream()
				.map(this::toExperience)
				.sorted(Comparator.comparingInt(ExperienceDto::experienceScore))
				.toList();
	}

	/** ✅ Improve QoS — platform-wide QoS overview + weakest partners. */
	public QosDto qos() {
		List<RoamingEvent> all = projection.events();
		double latency = round(all.stream().mapToDouble(RoamingEvent::avgLatencyMs).average().orElse(0), 1);
		double throughput = round(all.stream().mapToDouble(RoamingEvent::throughputMbps).average().orElse(0), 1);
		double drop = round(all.stream().mapToDouble(RoamingEvent::droppedSessionRatio).average().orElse(0) * 100, 2);
		int score = qosScore(latency, throughput, drop / 100);
		List<ExperienceDto> worst = experience().stream().limit(3).toList();
		return new QosDto(latency, throughput, drop, score, worst);
	}

	/** ✅ Optimize roaming agreements / ✅ Reduce operational costs — per-partner recommendation. */
	public List<OptimizationDto> optimization() {
		List<OptimizationDto> out = new ArrayList<>();
		for (List<RoamingEvent> events : groupByPlmn().values()) {
			RoamingEvent first = events.get(0);
			long subs = events.stream().mapToLong(RoamingEvent::subscribers).sum();
			double revenue = events.stream().mapToDouble(RoamingEvent::revenueEur).sum();
			double cost = events.stream().mapToDouble(RoamingEvent::costEur).sum();
			double margin = revenue - cost;
			double marginPct = revenue > 0 ? margin / revenue * 100 : 0;
			int avgRisk = (int) Math.round(events.stream().mapToInt(riskAnalyzer::score).average().orElse(0));
			int experience = toExperience(events).experienceScore();

			String action;
			String rec;
			if (margin < 0) {
				action = "RENEGOTIATE";
				rec = "Loss-making agreement — renegotiate wholesale rates or introduce data caps to cut cost.";
			} else if (avgRisk >= 60) {
				action = "MONITOR";
				rec = "Profitable but high fraud/risk — tighten steering and fraud monitoring before growing traffic.";
			} else if (experience < 50) {
				action = "IMPROVE_QOS";
				rec = "Weak customer experience — prioritise QoS/steering improvements with this partner.";
			} else if (marginPct >= 40 && avgRisk < 30) {
				action = "PREFERRED";
				rec = "High-margin, low-risk — make a preferred partner and steer more traffic here.";
			} else {
				action = "STEADY";
				rec = "Healthy agreement — maintain current terms.";
			}
			out.add(new OptimizationDto(first.partnerPlmn(), first.country(), events.size(), subs,
					round(revenue, 2), round(cost, 2), round(margin, 2), round(marginPct, 1),
					avgRisk, experience, action, rec));
		}
		out.sort(Comparator.comparingDouble(OptimizationDto::marginEur).reversed());
		return out;
	}

	/** ✅ Increase roaming revenue — revenue / cost / margin overview + top partners. */
	public RevenueDto revenue() {
		List<RoamingEvent> all = projection.events();
		double revenue = all.stream().mapToDouble(RoamingEvent::revenueEur).sum();
		double cost = all.stream().mapToDouble(RoamingEvent::costEur).sum();
		double margin = revenue - cost;
		long subs = all.stream().mapToLong(RoamingEvent::subscribers).sum();
		double inbound = all.stream().filter(e -> e.direction() == Direction.INBOUND).mapToDouble(RoamingEvent::revenueEur).sum();
		double outbound = all.stream().filter(e -> e.direction() == Direction.OUTBOUND).mapToDouble(RoamingEvent::revenueEur).sum();

		List<RevenueDto.PartnerRevenue> top = groupByPlmn().values().stream()
				.map(events -> new RevenueDto.PartnerRevenue(
						events.get(0).partnerPlmn(), events.get(0).country(),
						round(events.stream().mapToDouble(RoamingEvent::revenueEur).sum(), 2),
						round(events.stream().mapToDouble(RoamingEvent::marginEur).sum(), 2)))
				.sorted(Comparator.comparingDouble(RevenueDto.PartnerRevenue::revenueEur).reversed())
				.limit(5)
				.toList();

		return new RevenueDto(round(revenue, 2), round(cost, 2), round(margin, 2),
				round(revenue > 0 ? margin / revenue * 100 : 0, 1),
				round(subs > 0 ? revenue / subs : 0, 2), round(inbound, 2), round(outbound, 2), top);
	}

	// ---- helpers ----

	private Map<String, List<RoamingEvent>> groupByPlmn() {
		Map<String, List<RoamingEvent>> byPlmn = new LinkedHashMap<>();
		projection.events().forEach(e -> byPlmn.computeIfAbsent(e.partnerPlmn(), k -> new ArrayList<>()).add(e));
		return byPlmn;
	}

	private ExperienceDto toExperience(List<RoamingEvent> events) {
		RoamingEvent first = events.get(0);
		double latency = round(events.stream().mapToDouble(RoamingEvent::avgLatencyMs).average().orElse(0), 1);
		double throughput = round(events.stream().mapToDouble(RoamingEvent::throughputMbps).average().orElse(0), 1);
		double dropRatio = events.stream().mapToDouble(RoamingEvent::droppedSessionRatio).average().orElse(0);
		int score = qosScore(latency, throughput, dropRatio);
		String rating = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
		return new ExperienceDto(first.partnerPlmn(), first.country(), events.size(),
				latency, throughput, round(dropRatio * 100, 2), score, rating);
	}

	/** 0-100 QoS score: penalise high latency, low throughput and dropped sessions. */
	private int qosScore(double latencyMs, double throughputMbps, double dropRatio) {
		double latencyPenalty = Math.min(40, Math.max(0, (latencyMs - 40) / 3));
		double dropPenalty = Math.min(40, dropRatio * 100 * 2);
		double throughputPenalty = Math.min(20, Math.max(0, (40 - throughputMbps) / 2));
		return (int) Math.round(clamp(100 - latencyPenalty - dropPenalty - throughputPenalty));
	}

	private RoamingEventDto toDto(RoamingEvent e) {
		int score = riskAnalyzer.score(e);
		return new RoamingEventDto(e.id(), e.timestamp(), e.direction(), e.partnerPlmn(), e.country(),
				e.subscribers(), e.signalingErrors(), e.newDeviceRatio(), e.impossibleTravel(),
				e.dataVolumeGb(), e.avgLatencyMs(), e.throughputMbps(), e.droppedSessionRatio(),
				e.revenueEur(), e.costEur(), score, RiskLevel.fromScore(score));
	}

	private static double clamp(double v) { return Math.max(0, Math.min(100, v)); }
	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}
}
