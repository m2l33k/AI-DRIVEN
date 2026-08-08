package io.javatab.microservices.roaming.web;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.service.RoamingAnalysisService;
import io.javatab.microservices.roaming.web.dto.PartnerSummaryDto;
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

	public RoamingController(RoamingAnalysisService service) {
		this.service = service;
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
}
