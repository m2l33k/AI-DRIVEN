package io.javatab.microservices.roaming.web;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.KpiWindow;
import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.service.PerformanceAssuranceService;
import io.javatab.microservices.roaming.service.RoamingAnalysisService;
import io.javatab.microservices.roaming.service.RoamingInsightsService;
import io.javatab.microservices.roaming.web.dto.AgreementDto;
import io.javatab.microservices.roaming.web.dto.MlTrainStatusDto;
import io.javatab.microservices.roaming.web.dto.MultiModelForecastDto;
import io.javatab.microservices.roaming.web.dto.AnomalyDto;
import io.javatab.microservices.roaming.web.dto.CsvAnalysisDto;
import io.javatab.microservices.roaming.web.dto.ExperienceDto;
import io.javatab.microservices.roaming.web.dto.ForecastDto;
import io.javatab.microservices.roaming.web.dto.KpiSetDto;
import io.javatab.microservices.roaming.web.dto.KpiTimeseriesDto;
import io.javatab.microservices.roaming.web.dto.LiveMonitorDto;
import io.javatab.microservices.roaming.web.dto.OptimizationDto;
import io.javatab.microservices.roaming.web.dto.PartnerSummaryDto;
import io.javatab.microservices.roaming.web.dto.QosDto;
import io.javatab.microservices.roaming.web.dto.RevenueDto;
import io.javatab.microservices.roaming.web.dto.RoamingEventDto;
import io.javatab.microservices.roaming.web.dto.RoamingSummaryDto;
import io.javatab.microservices.roaming.web.dto.SimulationResultDto;
import io.javatab.microservices.roaming.web.dto.SlaEvaluationDto;
import io.javatab.microservices.roaming.web.dto.SyntheticTestResultDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Read-only roaming analytics API.
 *
 * <p>Every operation requires the {@code roaming-events:read} permission, held by
 * SECURITY_ANALYST and AUDITOR.</p>
 */
@RestController
@RequestMapping("/api/roaming")
@Tag(name = "Roaming Analysis", description = "Roaming events, risk scoring and partner analytics")
public class RoamingController {

	private final RoamingAnalysisService service;
	private final RoamingInsightsService insights;
	private final PerformanceAssuranceService assurance;

	public RoamingController(RoamingAnalysisService service, RoamingInsightsService insights,
							 PerformanceAssuranceService assurance) {
		this.service = service;
		this.insights = insights;
		this.assurance = assurance;
	}

	@Operation(summary = "List roaming events",
			description = "Lists roaming events (newest first), optionally filtered by direction, "
					+ "partner PLMN (partial match) and risk level. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/events")
	public List<RoamingEventDto> listEvents(
			@RequestParam(required = false) Direction direction,
			@RequestParam(required = false) String partnerPlmn,
			@RequestParam(required = false) RiskLevel riskLevel) {
		return service.listEvents(direction, partnerPlmn, riskLevel);
	}

	@Operation(summary = "Get a roaming event",
			description = "Returns a single roaming event by id. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/events/{id}")
	public RoamingEventDto getEvent(@PathVariable String id) {
		return service.getEvent(id);
	}

	@Operation(summary = "Roaming summary",
			description = "Aggregated analytics (totals, direction split, risk breakdown, volume series) "
					+ "for dashboards. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/summary")
	public RoamingSummaryDto summary() {
		return service.summary();
	}

	@Operation(summary = "Partner PLMN analytics",
			description = "Per-partner-PLMN roll-up ordered by average risk. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/partners")
	public List<PartnerSummaryDto> partners() {
		return service.partners();
	}

	@Operation(summary = "Real-time monitor",
			description = "Live roaming snapshot over a recent window (default 60 min): active events, "
					+ "subscribers, rate, risk and revenue. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/live")
	public LiveMonitorDto live(@RequestParam(defaultValue = "60") int windowMinutes) {
		return insights.live(windowMinutes);
	}

	@Operation(summary = "Anomaly detection",
			description = "Events flagged by the statistical + rule-based detector (population-baseline "
					+ "z-scores, fraud risk and QoS thresholds), each with a composite anomaly score, "
					+ "baseline deviation, severity and reasons. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/anomalies")
	public List<AnomalyDto> anomalies() {
		return insights.anomalies();
	}

	@Operation(summary = "Analyse an uploaded CSV",
			description = "Upload a roaming-events CSV to observe all of its data as an aggregated summary, "
					+ "the anomalies detected within it, and a traffic forecast predicting future events. "
					+ "Nothing is persisted. A minimal file (direction, partner_plmn, country, subscribers, "
					+ "signaling_errors, new_device_ratio, impossible_travel) is enough — missing QoS/commercial "
					+ "columns are derived. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public CsvAnalysisDto upload(@RequestParam("file") MultipartFile file,
			@RequestParam(defaultValue = "6") int hoursAhead) {
		return insights.analyzeCsv(file, hoursAhead);
	}

	@Operation(summary = "Simulate roaming traffic",
			description = "Generate synthetic roaming events over a recent window (persisted, ids prefixed "
					+ "SIM-) and return a live-monitor snapshot so the real-time monitor and anomaly feed can "
					+ "be observed reacting. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@PostMapping("/simulate")
	public SimulationResultDto simulate(
			@RequestParam(defaultValue = "20") int count,
			@RequestParam(defaultValue = "60") int minutesSpread,
			@RequestParam(defaultValue = "60") int windowMinutes) {
		return insights.simulate(count, minutesSpread, windowMinutes);
	}

	@Operation(summary = "Traffic forecast (linear)",
			description = "Linear-trend forecast of subscribers/hour for the next N hours (default 6). Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/forecast")
	public ForecastDto forecast(@RequestParam(defaultValue = "6") int hoursAhead) {
		return insights.forecast(hoursAhead);
	}

	@Operation(summary = "Train ML models",
			description = "Triggers background training of LSTM, Prophet and ARIMA on the full historical dataset. "
					+ "Returns immediately with status=started. Poll /forecast/train/status for progress and metrics. "
					+ "Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@PostMapping("/forecast/train")
	public MlTrainStatusDto trainMl() {
		return insights.trainMl();
	}

	@Operation(summary = "ML training status",
			description = "Returns current training state (idle | training | trained | error) with evaluation "
					+ "metrics (MAE, RMSE, AIC) per model. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/forecast/train/status")
	public MlTrainStatusDto trainStatus() {
		return insights.trainStatus();
	}

	@Operation(summary = "ML traffic forecast (LSTM + Prophet + ARIMA)",
			description = "Multi-model forecast: LSTM, Prophet, ARIMA and ensemble average. Delegates to the Python ML service. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/forecast/ml")
	public MultiModelForecastDto forecastMl(@RequestParam(defaultValue = "6") int hoursAhead) {
		return insights.forecastMl(hoursAhead);
	}

	@Operation(summary = "Customer experience",
			description = "Per-partner customer-experience (QoS) scores, worst first. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/experience")
	public List<ExperienceDto> experience() {
		return insights.experience();
	}

	@Operation(summary = "QoS overview",
			description = "Platform-wide quality-of-service metrics and the weakest partners. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/qos")
	public QosDto qos() {
		return insights.qos();
	}

	@Operation(summary = "Agreement optimization",
			description = "Per-partner revenue/cost/margin, risk and QoS with an agreement recommendation "
					+ "(renegotiate, monitor, improve QoS, preferred, steady). Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/optimization")
	public List<OptimizationDto> optimization() {
		return insights.optimization();
	}

	@Operation(summary = "Revenue overview",
			description = "Roaming revenue, cost, margin, per-subscriber revenue and top partners. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/revenue")
	public RevenueDto revenue() {
		return insights.revenue();
	}

	// =====================================================================
	//  Performance Assurance Engine (§5.2)
	// =====================================================================

	@Operation(summary = "Performance-assurance KPIs",
			description = "KPI set (registration success, ASR, NER, ACD, session setup success, latency "
					+ "P50/P95/P99, drop rate, throughput) for the latest completed aggregation window. "
					+ "window = FIVE_MIN | HOUR | DAY | MONTH; partner optional (default = all). "
					+ "Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/kpis")
	public KpiSetDto kpis(@RequestParam(required = false) String partner,
						  @RequestParam(defaultValue = "DAY") KpiWindow window) {
		return assurance.kpis(partner, window);
	}

	@Operation(summary = "KPI time-series",
			description = "KPI set across the last N consecutive aggregation windows (oldest → newest), "
					+ "for trend/reporting. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/kpis/timeseries")
	public KpiTimeseriesDto kpisTimeseries(@RequestParam(required = false) String partner,
										   @RequestParam(defaultValue = "DAY") KpiWindow window,
										   @RequestParam(defaultValue = "12") int count) {
		return assurance.timeseries(partner, window, count);
	}

	@Operation(summary = "Roaming agreements",
			description = "Per-partner roaming agreements: SLA thresholds, rolling performance score and "
					+ "steering tier. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/agreements")
	public List<AgreementDto> agreements() {
		return assurance.agreements();
	}

	@Operation(summary = "SLA evaluation",
			description = "Evaluate each agreement's latest window against its SLA_KPIs thresholds: breached "
					+ "KPIs, consecutive-breach count, alarm flag, rolling score and tier (worst first). "
					+ "Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/sla")
	public List<SlaEvaluationDto> sla(@RequestParam(defaultValue = "DAY") KpiWindow window) {
		return assurance.evaluateSla(window);
	}

	@Operation(summary = "Run synthetic test-calls",
			description = "Execute IREG-style synthetic test transactions (registration, MO/MT call, SMS, "
					+ "data session) against each active agreement. Results are flagged Synthetic_Test and "
					+ "excluded from live KPI denominators. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@PostMapping("/test-calls/run")
	public List<SyntheticTestResultDto> runTestCalls() {
		return assurance.runSyntheticTests();
	}
}
