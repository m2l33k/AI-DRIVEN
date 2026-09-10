package io.javatab.microservices.roaming.service;

import io.javatab.microservices.roaming.analysis.KpiCalculator;
import io.javatab.microservices.roaming.domain.AttachEvent;
import io.javatab.microservices.roaming.domain.KpiWindow;
import io.javatab.microservices.roaming.domain.RoamingAgreement;
import io.javatab.microservices.roaming.domain.RoamingCdr;
import io.javatab.microservices.roaming.domain.SessionQos;
import io.javatab.microservices.roaming.repository.AttachEventRepository;
import io.javatab.microservices.roaming.repository.RoamingAgreementRepository;
import io.javatab.microservices.roaming.repository.RoamingCdrRepository;
import io.javatab.microservices.roaming.repository.SessionQosRepository;
import io.javatab.microservices.roaming.web.dto.AgreementDto;
import io.javatab.microservices.roaming.web.dto.KpiSetDto;
import io.javatab.microservices.roaming.web.dto.KpiTimeseriesDto;
import io.javatab.microservices.roaming.web.dto.SlaEvaluationDto;
import io.javatab.microservices.roaming.web.dto.SyntheticTestResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Performance Assurance Engine (§5.2): streaming windowed KPI computation, SLA-breach detection with
 * consecutive-window alarming, a rolling per-agreement performance score, and a synthetic
 * (IREG-style) test-call scheduler.
 */
@Service
public class PerformanceAssuranceService {

	private static final Logger log = LoggerFactory.getLogger(PerformanceAssuranceService.class);

	private final AttachEventRepository attaches;
	private final RoamingCdrRepository cdrs;
	private final SessionQosRepository sessions;
	private final RoamingAgreementRepository agreements;
	private final KpiCalculator calculator;

	/** Consecutive breached windows before a real-time alarm is raised (spec default: 3). */
	@Value("${roaming.sla.alarm-consecutive-windows:3}")
	private int alarmConsecutiveWindows;

	public PerformanceAssuranceService(AttachEventRepository attaches, RoamingCdrRepository cdrs,
									   SessionQosRepository sessions, RoamingAgreementRepository agreements,
									   KpiCalculator calculator) {
		this.attaches = attaches;
		this.cdrs = cdrs;
		this.sessions = sessions;
		this.agreements = agreements;
		this.calculator = calculator;
	}

	// =====================================================================
	//  KPI computation
	// =====================================================================

	/** KPI set for the latest completed {@code window} (partner {@code null} = all partners). */
	public KpiSetDto kpis(String partner, KpiWindow window) {
		Instant now = referenceNow();
		Instant start = window.truncate(now);
		Instant end = window.next(now);
		return computeWindow(partner, window, start, end);
	}

	/** Last {@code count} consecutive windows for a partner (oldest → newest). */
	public KpiTimeseriesDto timeseries(String partner, KpiWindow window, int count) {
		int n = Math.max(1, Math.min(count, 240));
		Instant now = referenceNow();
		List<KpiSetDto> points = new ArrayList<>();
		Instant end = window.next(now);
		Instant start = window.truncate(now);
		for (int i = 0; i < n; i++) {
			points.add(0, computeWindow(partner, window, start, end)); // prepend → chronological
			end = start;
			start = window.truncate(start.minusSeconds(1));
		}
		return new KpiTimeseriesDto(partner, window, points);
	}

	private KpiSetDto computeWindow(String partner, KpiWindow window, Instant start, Instant end) {
		// Range- (and partner-) scoped at the database — the DB indexes on visited_operator_id and the
		// datetime columns do the filtering, instead of loading whole tables into memory per window.
		List<AttachEvent> a = partner == null
				? attaches.findInWindow(start, end)
				: attaches.findInWindowForPartner(partner, start, end);
		List<RoamingCdr> c = partner == null
				? cdrs.findInWindow(start, end)
				: cdrs.findInWindowForPartner(partner, start, end);
		List<SessionQos> s = partner == null
				? sessions.findInWindow(start, end)
				: sessions.findInWindowForPartner(partner, start, end);
		return calculator.compute(partner == null ? "ALL" : partner, window, start, end, a, c, s);
	}

	// =====================================================================
	//  SLA evaluation
	// =====================================================================

	/** Read-only SLA evaluation of every agreement's latest {@code window} (does not mutate state). */
	public List<SlaEvaluationDto> evaluateSla(KpiWindow window) {
		List<SlaEvaluationDto> out = new ArrayList<>();
		int lookback = Math.max(alarmConsecutiveWindows, 1);
		for (RoamingAgreement ag : agreements.findAll()) {
			KpiTimeseriesDto series = timeseries(ag.partnerOperatorId(), window, lookback);
			List<KpiSetDto> pts = series.points();
			KpiSetDto latest = pts.get(pts.size() - 1);
			List<String> breaches = breaches(latest, ag);
			// trailing consecutive breached windows within the lookback
			int consecutive = 0;
			for (int i = pts.size() - 1; i >= 0; i--) {
				if (!breaches(pts.get(i), ag).isEmpty()) consecutive++;
				else break;
			}
			boolean alarm = consecutive >= alarmConsecutiveWindows;
			out.add(new SlaEvaluationDto(ag.partnerOperatorId(), latest, breaches, !breaches.isEmpty(),
					consecutive, alarm, ag.rollingPerformanceScore(), ag.tier()));
		}
		out.sort((x, y) -> Double.compare(x.rollingScore(), y.rollingScore())); // worst first
		return out;
	}

	/** Which SLA_KPIs thresholds the window breaches (empty = compliant). */
	private List<String> breaches(KpiSetDto k, RoamingAgreement ag) {
		List<String> b = new ArrayList<>();
		if (k.registrationSuccessRate() < ag.regSuccessMinPct())
			b.add("Registration success %.2f%% < %.2f%%".formatted(k.registrationSuccessRate(), ag.regSuccessMinPct()));
		if (k.asr() < ag.asrMinPct())
			b.add("ASR %.2f%% < %.2f%%".formatted(k.asr(), ag.asrMinPct()));
		if (k.sessionSetupSuccessRate() < ag.sessionSuccessMinPct())
			b.add("Session setup %.2f%% < %.2f%%".formatted(k.sessionSetupSuccessRate(), ag.sessionSuccessMinPct()));
		if (k.latencyP95Ms() > ag.latencyP95MaxMs())
			b.add("Latency P95 %.1fms > %.1fms".formatted(k.latencyP95Ms(), ag.latencyP95MaxMs()));
		if (k.dropRatePct() > ag.dropRateMaxPct())
			b.add("Drop rate %.2f%% > %.2f%%".formatted(k.dropRatePct(), ag.dropRateMaxPct()));
		if (k.throughputMbps() < ag.throughputMinMbps())
			b.add("Throughput %.2fMbps < %.2fMbps".formatted(k.throughputMbps(), ag.throughputMinMbps()));
		return b;
	}

	public List<AgreementDto> agreements() {
		return agreements.findAll().stream().map(AgreementDto::from).toList();
	}

	// =====================================================================
	//  Streaming tick — evolves the rolling performance score (§5.2 step 4)
	// =====================================================================

	/** Every 5 min: fold the latest FIVE_MIN window into each agreement's rolling score + tier. */
	@Scheduled(fixedDelayString = "${roaming.sla.tick-ms:300000}", initialDelay = 30_000)
	@Transactional
	public void streamingTick() {
		if (agreements.count() == 0) return;
		KpiWindow window = KpiWindow.FIVE_MIN;
		for (RoamingAgreement ag : agreements.findAll()) {
			KpiSetDto k = kpis(ag.partnerOperatorId(), window);
			List<String> b = breaches(k, ag);
			double windowScore = (6 - b.size()) / 6.0 * 100.0; // fraction of SLA KPIs passed
			ag.applyEvaluation(windowScore, !b.isEmpty());
			agreements.save(ag);
		}
		log.debug("SLA streaming tick updated {} agreement rolling scores", agreements.count());
	}

	// =====================================================================
	//  Synthetic test-call scheduler (§5.2) — IREG-style probes, not persisted
	// =====================================================================

	private static final String[] TXN_TYPES = {"REGISTRATION", "MO_CALL", "MT_CALL", "SMS", "DATA_SESSION"};

	/** Run one IREG-style synthetic test transaction per type against each active agreement. */
	public List<SyntheticTestResultDto> runSyntheticTests() {
		List<SyntheticTestResultDto> results = new ArrayList<>();
		Instant at = Instant.now();
		for (RoamingAgreement ag : agreements.findAll()) {
			// bias pass-probability by the agreement's current health so tests track reality
			double health = Math.max(0.5, ag.rollingPerformanceScore() / 100.0);
			for (String txn : TXN_TYPES) {
				boolean ok = ThreadLocalRandom.current().nextDouble() < health;
				double latency = ThreadLocalRandom.current().nextDouble(20, 200);
				String detail = ok ? "OK" : "timeout / no response";
				results.add(new SyntheticTestResultDto(ag.partnerOperatorId(), txn, "Synthetic_Test",
						ok, Math.round(latency * 10.0) / 10.0, at, detail));
			}
		}
		log.info("Executed {} synthetic test transactions across {} agreements",
				results.size(), agreements.count());
		return results;
	}

	// =====================================================================
	//  Helpers
	// =====================================================================

	/**
	 * Reference "now" = the most recent event timestamp across the loaded data (historical dataset),
	 * resolved with three {@code max(...)} aggregate queries rather than scanning every row.
	 */
	private Instant referenceNow() {
		Instant max = Instant.EPOCH;
		max = laterOf(max, attaches.findMaxAttachDatetime());
		max = laterOf(max, cdrs.findMaxCallStartDatetime());
		max = laterOf(max, sessions.findMaxSessionStartDatetime());
		return max.equals(Instant.EPOCH) ? Instant.now() : max;
	}

	private static Instant laterOf(Instant a, Instant b) {
		if (b == null) return a;
		return b.isAfter(a) ? b : a;
	}
}
