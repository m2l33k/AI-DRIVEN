package io.javatab.microservices.roaming.service;

import io.javatab.microservices.roaming.analysis.RiskAnalyzer;
import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RiskLevel;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import io.javatab.microservices.roaming.web.dto.PartnerSummaryDto;
import io.javatab.microservices.roaming.web.dto.RoamingEventDto;
import io.javatab.microservices.roaming.web.dto.RoamingSummaryDto;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.TreeMap;

/**
 * Read-side analytics over roaming events: filtering, risk enrichment, and roll-ups.
 * Guarded upstream by {@code roaming-events:read} (see the controller's {@code @PreAuthorize}).
 */
@Service
public class RoamingAnalysisService {

	private static final DateTimeFormatter HOUR_LABEL =
			DateTimeFormatter.ofPattern("HH:00").withZone(ZoneOffset.UTC);

	private final RoamingEventProjection projection;
	private final RiskAnalyzer riskAnalyzer;

	public RoamingAnalysisService(RoamingEventProjection projection, RiskAnalyzer riskAnalyzer) {
		this.projection = projection;
		this.riskAnalyzer = riskAnalyzer;
	}

	/** Lists events (newest first), optionally filtered. Any argument may be {@code null}. */
	public List<RoamingEventDto> listEvents(Direction direction, String partnerPlmn, RiskLevel riskLevel) {
		String plmn = partnerPlmn == null ? null : partnerPlmn.trim().toLowerCase();
		return projection.events().stream()
				.filter(e -> direction == null || e.direction() == direction)
				.filter(e -> plmn == null || plmn.isEmpty() || e.partnerPlmn().toLowerCase().contains(plmn))
				.map(this::toDto)
				.filter(dto -> riskLevel == null || dto.riskLevel() == riskLevel)
				.sorted(Comparator.comparing(RoamingEventDto::timestamp).reversed())
				.toList();
	}

	/** @throws NoSuchElementException if no event has the given id (→ 404). */
	public RoamingEventDto getEvent(String id) {
		return projection.events().stream()
				.filter(e -> e.id().equals(id))
				.findFirst()
				.map(this::toDto)
				.orElseThrow(() -> new NoSuchElementException("Roaming event not found: " + id));
	}

	/** Aggregate analytics for dashboards, computed over all persisted events. */
	public RoamingSummaryDto summary() {
		return summary(projection.events());
	}

	/** Aggregate analytics over an arbitrary set of events (DB, uploaded CSV or simulated batch). */
	public RoamingSummaryDto summary(List<RoamingEvent> events) {
		List<RoamingEventDto> all = events.stream()
				.map(this::toDto)
				.sorted(Comparator.comparing(RoamingEventDto::timestamp))
				.toList();

		long inbound = all.stream().filter(e -> e.direction() == Direction.INBOUND).count();
		long outbound = all.stream().filter(e -> e.direction() == Direction.OUTBOUND).count();
		long totalSubs = all.stream().mapToLong(RoamingEventDto::subscribers).sum();

		Map<String, Long> byRisk = new LinkedHashMap<>();
		for (RiskLevel level : RiskLevel.values()) {
			byRisk.put(level.name(), all.stream().filter(e -> e.riskLevel() == level).count());
		}
		long highRisk = byRisk.getOrDefault(RiskLevel.HIGH.name(), 0L);

		// Bucket subscribers by UTC hour, oldest-first.
		Map<String, Long> buckets = new TreeMap<>();
		all.forEach(e -> buckets.merge(HOUR_LABEL.format(e.timestamp()), (long) e.subscribers(), Long::sum));
		List<RoamingSummaryDto.VolumePoint> series = buckets.entrySet().stream()
				.map(en -> new RoamingSummaryDto.VolumePoint(en.getKey(), en.getValue()))
				.toList();

		return new RoamingSummaryDto(all.size(), totalSubs, inbound, outbound, byRisk, highRisk, series);
	}

	/** Per-partner-PLMN roll-up, ordered by average risk (highest first). */
	public List<PartnerSummaryDto> partners() {
		Map<String, List<RoamingEventDto>> byPlmn = new LinkedHashMap<>();
		projection.events().stream()
				.map(this::toDto)
				.forEach(e -> byPlmn.computeIfAbsent(e.partnerPlmn(), k -> new java.util.ArrayList<>()).add(e));

		return byPlmn.values().stream()
				.map(this::toPartnerSummary)
				.sorted(Comparator.comparingInt(PartnerSummaryDto::avgRiskScore).reversed())
				.toList();
	}

	private PartnerSummaryDto toPartnerSummary(List<RoamingEventDto> events) {
		RoamingEventDto first = events.get(0);
		long subs = events.stream().mapToLong(RoamingEventDto::subscribers).sum();
		int avg = (int) Math.round(events.stream().mapToInt(RoamingEventDto::riskScore).average().orElse(0));
		RiskLevel peak = events.stream()
				.map(RoamingEventDto::riskLevel)
				.max(Comparator.comparingInt(Enum::ordinal))
				.orElse(RiskLevel.LOW);
		long high = events.stream().filter(e -> e.riskLevel() == RiskLevel.HIGH).count();
		return new PartnerSummaryDto(first.partnerPlmn(), first.country(), events.size(), subs, avg, peak, high);
	}

	private RoamingEventDto toDto(RoamingEvent e) {
		int score = riskAnalyzer.score(e);
		return new RoamingEventDto(
				e.id(), e.timestamp(), e.direction(), e.partnerPlmn(), e.country(),
				e.subscribers(), e.signalingErrors(), e.newDeviceRatio(), e.impossibleTravel(),
				e.dataVolumeGb(), e.avgLatencyMs(), e.throughputMbps(), e.droppedSessionRatio(),
				e.revenueEur(), e.costEur(),
				score, RiskLevel.fromScore(score));
	}
}
