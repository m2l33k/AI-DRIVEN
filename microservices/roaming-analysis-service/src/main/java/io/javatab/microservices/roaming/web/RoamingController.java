package io.javatab.microservices.roaming.web;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.service.RoamingAnalysisService;
import io.javatab.microservices.roaming.service.RoamingInsightsService;
import io.javatab.microservices.roaming.web.dto.AnomalyDto;
import io.javatab.microservices.roaming.web.dto.ExperienceDto;
import io.javatab.microservices.roaming.web.dto.ForecastDto;
import io.javatab.microservices.roaming.web.dto.LiveMonitorDto;
import io.javatab.microservices.roaming.web.dto.OptimizationDto;
import io.javatab.microservices.roaming.web.dto.PartnerSummaryDto;
import io.javatab.microservices.roaming.web.dto.QosDto;
import io.javatab.microservices.roaming.web.dto.RevenueDto;
import io.javatab.microservices.roaming.web.dto.RoamingEventDto;
import io.javatab.microservices.roaming.web.dto.RoamingSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

	public RoamingController(RoamingAnalysisService service, RoamingInsightsService insights) {
		this.service = service;
		this.insights = insights;
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
			description = "Events breaching risk/QoS thresholds, with reasons and severity. Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/anomalies")
	public List<AnomalyDto> anomalies() {
		return insights.anomalies();
	}

	@Operation(summary = "Traffic forecast",
			description = "Linear-trend forecast of subscribers/hour for the next N hours (default 6). Requires roaming-events:read.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
	@GetMapping("/forecast")
	public ForecastDto forecast(@RequestParam(defaultValue = "6") int hoursAhead) {
		return insights.forecast(hoursAhead);
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
}
