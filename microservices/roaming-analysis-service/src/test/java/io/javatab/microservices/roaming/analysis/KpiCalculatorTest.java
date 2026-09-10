package io.javatab.microservices.roaming.analysis;

import io.javatab.microservices.roaming.domain.AttachEvent;
import io.javatab.microservices.roaming.domain.KpiWindow;
import io.javatab.microservices.roaming.domain.RoamingCdr;
import io.javatab.microservices.roaming.domain.SessionQos;
import io.javatab.microservices.roaming.web.dto.KpiSetDto;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Pure-function unit tests for {@link KpiCalculator}. No Spring context — deterministic fixtures in,
 * KPI numbers out, so the §5.2 formulas (ASR/NER/ACD, session success, drop rate, latency
 * percentiles, throughput) are pinned against regressions.
 */
class KpiCalculatorTest {

	private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");
	private static final Instant END = Instant.parse("2026-01-02T00:00:00Z");
	private static final double EPS = 0.001;

	private final KpiCalculator calculator = new KpiCalculator();

	@Test
	void computesRegistrationSuccessRateFromAttachStatus() {
		List<AttachEvent> attaches = List.of(
				attach("a1", "success"),
				attach("a2", "success"),
				attach("a3", "failure"));

		KpiSetDto k = calculator.compute("OPRX", KpiWindow.DAY, T0, END, attaches, List.of(), List.of());

		assertThat(k.attachAttempts()).isEqualTo(3);
		assertThat(k.registrationSuccessRate()).isCloseTo(66.67, within(EPS)); // 2/3
	}

	@Test
	void computesAsrNerAndAcdFromVoiceCdrs() {
		List<RoamingCdr> cdrs = List.of(
				voice("c1", 60, T0.plusSeconds(60)),   // answered + network response
				voice("c2", 120, T0.plusSeconds(120)), // answered + network response
				voice("c3", null, T0.plusSeconds(30)), // network response, not answered
				voice("c4", null, null),               // no response
				data("d1"));                           // non-voice, ignored by voice KPIs

		KpiSetDto k = calculator.compute("OPRX", KpiWindow.DAY, T0, END, List.of(), cdrs, List.of());

		assertThat(k.voiceAttempts()).isEqualTo(4);
		assertThat(k.asr()).isCloseTo(50.0, within(EPS));  // answered 2 / 4
		assertThat(k.ner()).isCloseTo(75.0, within(EPS));  // max(answered=2, response=3)=3 / 4
		assertThat(k.acdSeconds()).isCloseTo(90.0, within(EPS)); // (60+120)/2
	}

	@Test
	void computesSessionSuccessDropLatencyAndThroughput() {
		// four sessions, each 10s long, 1 MB down / 0 up; one dropped.
		List<SessionQos> sessions = List.of(
				session("s1", "success", 10.0, 1.0),
				session("s2", "success", 20.0, 1.0),
				session("s3", "success", 30.0, 1.0),
				session("s4", "dropped", 40.0, 1.0));

		KpiSetDto k = calculator.compute("OPRX", KpiWindow.DAY, T0, END, List.of(), List.of(), sessions);

		assertThat(k.sessionAttempts()).isEqualTo(4);
		assertThat(k.sessionSetupSuccessRate()).isCloseTo(75.0, within(EPS)); // (4-1)/4
		assertThat(k.dropRatePct()).isCloseTo(25.0, within(EPS));             // 1/4
		assertThat(k.avgLatencyMs()).isCloseTo(25.0, within(EPS));           // mean(10,20,30,40)
		assertThat(k.latencyP50Ms()).isCloseTo(20.0, within(EPS));           // nearest-rank
		assertThat(k.latencyP95Ms()).isCloseTo(40.0, within(EPS));
		// total 4 MB over 40 active seconds → (4*8)/40 = 0.8 Mbps
		assertThat(k.throughputMbps()).isCloseTo(0.8, within(EPS));
	}

	@Test
	void emptyInputsYieldZerosWithoutDivideByZero() {
		KpiSetDto k = calculator.compute("OPRX", KpiWindow.DAY, T0, END, List.of(), List.of(), List.of());

		assertThat(k.registrationSuccessRate()).isZero();
		assertThat(k.asr()).isZero();
		assertThat(k.ner()).isZero();
		assertThat(k.acdSeconds()).isZero();
		assertThat(k.sessionSetupSuccessRate()).isZero();
		assertThat(k.dropRatePct()).isZero();
		assertThat(k.throughputMbps()).isZero();
		assertThat(k.attachAttempts()).isZero();
	}

	@Test
	void nearestRankPercentileMatchesSpec() {
		List<Double> values = List.of(10.0, 20.0, 30.0, 40.0);
		assertThat(KpiCalculator.percentile(values, 50)).isCloseTo(20.0, within(EPS));
		assertThat(KpiCalculator.percentile(values, 95)).isCloseTo(40.0, within(EPS));
		assertThat(KpiCalculator.percentile(List.of(), 95)).isZero();
	}

	// ---- fixtures ----

	private static AttachEvent attach(String id, String status) {
		return new AttachEvent(id, "IMSI-" + id, "MSISDN", "HOME", "OPRX", "CELL",
				T0, status, null, false, 20);
	}

	private static RoamingCdr voice(String id, Integer durationSeconds, Instant callEnd) {
		return cdr(id, "voice", durationSeconds, callEnd);
	}

	private static RoamingCdr data(String id) {
		return cdr(id, "data", null, T0.plusSeconds(300));
	}

	private static RoamingCdr cdr(String id, String callType, Integer durationSeconds, Instant callEnd) {
		return new RoamingCdr(id, "TAP", "TAP", T0, "HOME", "OPRX", "IMSI-" + id, "MSISDN",
				"DEV", "CELL", callType, T0, callEnd, durationSeconds, 10.0, 5.0, 2.0, "EUR",
				"TARIFF", false, null, "PENDING", null, false, T0);
	}

	private static SessionQos session(String id, String status, double latencyMs, double downloadMb) {
		return new SessionQos(id, "cdr-" + id, "IMSI-" + id, "HOME", "OPRX", "CELL",
				T0, T0.plusSeconds(10), downloadMb, 0.0, null, latencyMs, 0.0, status, null);
	}
}
