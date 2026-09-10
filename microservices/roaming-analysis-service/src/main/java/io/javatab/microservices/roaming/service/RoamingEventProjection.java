package io.javatab.microservices.roaming.service;

import io.javatab.microservices.roaming.domain.AttachEvent;
import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.NetworkCell;
import io.javatab.microservices.roaming.domain.RoamingCdr;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import io.javatab.microservices.roaming.domain.SessionQos;
import io.javatab.microservices.roaming.repository.AttachEventRepository;
import io.javatab.microservices.roaming.repository.NetworkCellRepository;
import io.javatab.microservices.roaming.repository.RoamingCdrRepository;
import io.javatab.microservices.roaming.repository.SessionQosRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Projects the <b>real</b> ingested dataset (roaming CDRs, session QoS, attach events, network cells)
 * into {@link RoamingEvent}-shaped <b>partner × hour</b> aggregates — the exact shape the classic
 * roaming-analytics endpoints, {@code RiskAnalyzer} and {@code AnomalyDetector} already consume.
 *
 * <p>This is the seam that turns the previously mock analytics endpoints ({@code /events},
 * {@code /summary}, {@code /partners}, {@code /live}, {@code /anomalies}, {@code /forecast},
 * {@code /experience}, {@code /qos}, {@code /optimization}, {@code /revenue}) into real ones without
 * rewriting every service/DTO: each aggregate carries genuinely measured figures.</p>
 *
 * <p>Field mapping (per partner={@code visited_operator_id} × 1-hour bucket):</p>
 * <ul>
 *   <li><b>subscribers</b> = distinct {@code subscriber_imsi} in the bucket</li>
 *   <li><b>signalingErrors</b> = auth failures + attach rejects for the partner in that hour</li>
 *   <li><b>newDeviceRatio</b> = fraud ratio = fraud-flagged CDRs / CDRs (ground-truth
 *       {@code fraud_flag}); the strongest real risk signal, driving the RiskAnalyzer weight</li>
 *   <li><b>impossibleTravel</b> = any IMSI in the bucket flagged by the geo/velocity check over
 *       consecutive attaches (cell lat/lon ÷ Δt &gt; {@code roaming.impossible-travel.max-kmh})</li>
 *   <li><b>avgLatencyMs / throughputMbps / droppedSessionRatio</b> = aggregated from linked
 *       {@code session_qos} rows</li>
 *   <li><b>revenueEur / costEur</b> = Σ {@code charged_amount} / Σ {@code wholesale_cost}</li>
 *   <li><b>direction</b> = derived from the configured home-operator set</li>
 * </ul>
 *
 * <p>The dataset is loaded once and immutable afterwards, so the projection is computed lazily and
 * cached for the lifetime of the service.</p>
 */
@Component
public class RoamingEventProjection {

	private static final Logger log = LoggerFactory.getLogger(RoamingEventProjection.class);

	private final RoamingCdrRepository cdrs;
	private final SessionQosRepository sessions;
	private final AttachEventRepository attaches;
	private final NetworkCellRepository cells;

	private final Set<String> homeOperators;
	private final double maxTravelKmh;

	/** Lazily-built, cached projection (dataset is immutable after ingestion). */
	private volatile List<RoamingEvent> cache;

	public RoamingEventProjection(RoamingCdrRepository cdrs, SessionQosRepository sessions,
								  AttachEventRepository attaches, NetworkCellRepository cells,
								  @Value("${roaming.home-operators:}") String homeOperatorsCsv,
								  @Value("${roaming.impossible-travel.max-kmh:1000}") double maxTravelKmh) {
		this.cdrs = cdrs;
		this.sessions = sessions;
		this.attaches = attaches;
		this.cells = cells;
		this.homeOperators = Arrays.stream(homeOperatorsCsv.split(","))
				.map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toUnmodifiableSet());
		this.maxTravelKmh = maxTravelKmh;
	}

	/** Real roaming events, one per partner × hour aggregate (cached). */
	public List<RoamingEvent> events() {
		List<RoamingEvent> local = cache;
		if (local == null) {
			synchronized (this) {
				if (cache == null) {
					cache = build();
				}
				local = cache;
			}
		}
		return local;
	}

	/** Force a rebuild on the next {@link #events()} call (e.g. after a re-ingest). */
	public void invalidate() {
		cache = null;
	}

	// =====================================================================
	//  Projection build
	// =====================================================================

	private List<RoamingEvent> build() {
		Map<String, NetworkCell> cellById = new HashMap<>();
		cells.findAll().forEach(c -> cellById.put(c.cellId(), c));

		Set<String> impossibleTravelImsis = detectImpossibleTravelImsis(cellById);

		// Sessions grouped by their parent CDR id, so a bucket can pull the QoS of its CDRs.
		Map<String, List<SessionQos>> sessionsByCdr = sessions.findAll().stream()
				.filter(s -> s.cdrId() != null)
				.collect(Collectors.groupingBy(SessionQos::cdrId));

		// Attach signalling errors (auth failures + rejects) per partner × hour bucket.
		Map<String, Integer> signallingByBucket = new HashMap<>();
		for (AttachEvent a : attaches.findAll()) {
			if (a.visitedOperatorId() == null || a.attachDatetime() == null) continue;
			boolean err = a.authFailureFlag() || a.rejectCause() != null
					|| "failure".equalsIgnoreCase(a.attachStatus());
			if (err) {
				signallingByBucket.merge(bucketKey(a.visitedOperatorId(), a.attachDatetime()), 1, Integer::sum);
			}
		}

		// Group CDRs into partner × hour buckets.
		Map<String, List<RoamingCdr>> buckets = new LinkedHashMap<>();
		for (RoamingCdr c : cdrs.findAll()) {
			Instant ts = c.callStartDatetime() != null ? c.callStartDatetime() : c.recordCreationDatetime();
			if (c.visitedOperatorId() == null || ts == null) continue;
			buckets.computeIfAbsent(bucketKey(c.visitedOperatorId(), ts), k -> new ArrayList<>()).add(c);
		}

		List<RoamingEvent> out = new ArrayList<>(buckets.size());
		for (Map.Entry<String, List<RoamingCdr>> e : buckets.entrySet()) {
			out.add(toAggregate(e.getKey(), e.getValue(), sessionsByCdr, cellById,
					signallingByBucket, impossibleTravelImsis));
		}
		out.sort(Comparator.comparing(RoamingEvent::timestamp));
		log.info("Projected {} real roaming CDRs into {} partner×hour aggregates",
				cdrs.count(), out.size());
		return out;
	}

	private RoamingEvent toAggregate(String key, List<RoamingCdr> group,
									 Map<String, List<SessionQos>> sessionsByCdr,
									 Map<String, NetworkCell> cellById,
									 Map<String, Integer> signallingByBucket,
									 Set<String> impossibleTravelImsis) {
		String partner = group.get(0).visitedOperatorId();
		Instant hour = group.get(0).callStartDatetime() != null
				? group.get(0).callStartDatetime().truncatedTo(ChronoUnit.HOURS)
				: group.get(0).recordCreationDatetime().truncatedTo(ChronoUnit.HOURS);

		long distinctImsi = group.stream().map(RoamingCdr::subscriberImsi).filter(java.util.Objects::nonNull).distinct().count();
		int subscribers = (int) Math.max(1, distinctImsi);

		long fraudCount = group.stream().filter(RoamingCdr::fraudFlag).count();
		double fraudRatio = group.isEmpty() ? 0 : (double) fraudCount / group.size();

		int signalingErrors = signallingByBucket.getOrDefault(key, 0);

		boolean impossibleTravel = group.stream()
				.map(RoamingCdr::subscriberImsi)
				.anyMatch(impossibleTravelImsis::contains);

		double dataVolumeGb = group.stream()
				.mapToDouble(c -> c.dataVolumeMb() == null ? 0 : c.dataVolumeMb()).sum() / 1000.0;
		double revenueEur = group.stream()
				.mapToDouble(c -> c.chargedAmount() == null ? 0 : c.chargedAmount()).sum();
		double costEur = group.stream()
				.mapToDouble(c -> c.wholesaleCost() == null ? 0 : c.wholesaleCost()).sum();

		// QoS from the sessions linked to this bucket's CDRs.
		List<SessionQos> qos = new ArrayList<>();
		for (RoamingCdr c : group) {
			List<SessionQos> s = sessionsByCdr.get(c.cdrId());
			if (s != null) qos.addAll(s);
		}
		double avgLatencyMs = qos.stream().filter(s -> s.latencyMs() != null)
				.mapToDouble(SessionQos::latencyMs).average().orElse(0);
		double throughputMbps = qos.stream().filter(s -> s.avgThroughputMbps() != null)
				.mapToDouble(SessionQos::avgThroughputMbps).average().orElse(0);
		double droppedSessionRatio = qos.isEmpty() ? 0
				: (double) qos.stream().filter(s -> "dropped".equalsIgnoreCase(s.sessionStatus())).count() / qos.size();

		// Country from the most common serving cell's country code in this bucket.
		String country = group.stream()
				.map(c -> cellById.get(c.servingCellId()))
				.filter(java.util.Objects::nonNull)
				.map(NetworkCell::countryCode)
				.filter(java.util.Objects::nonNull)
				.collect(Collectors.groupingBy(cc -> cc, Collectors.counting()))
				.entrySet().stream().max(Map.Entry.comparingByValue())
				.map(Map.Entry::getKey).orElse(partner);

		Direction direction = directionOf(group);

		String id = partner + "@" + hour.getEpochSecond();
		return new RoamingEvent(id, hour, direction, partner, country, subscribers, signalingErrors,
				round(fraudRatio, 3), impossibleTravel, round(dataVolumeGb, 2), round(avgLatencyMs, 1),
				round(throughputMbps, 1), round(droppedSessionRatio, 3), round(revenueEur, 2), round(costEur, 2));
	}

	/** Majority direction across the bucket, from the configured home-operator set. */
	private Direction directionOf(List<RoamingCdr> group) {
		long outbound = group.stream().filter(c -> homeOperators.contains(c.homeOperatorId())).count();
		long inbound = group.stream().filter(c -> homeOperators.contains(c.visitedOperatorId())).count();
		return outbound >= inbound ? Direction.OUTBOUND : Direction.INBOUND;
	}

	// =====================================================================
	//  Impossible-travel detection (real, from cell geography)
	// =====================================================================

	/**
	 * Flags IMSIs whose consecutive attaches imply an impossible ground speed
	 * (distance between the two cells ÷ elapsed time &gt; {@code maxTravelKmh}).
	 */
	private Set<String> detectImpossibleTravelImsis(Map<String, NetworkCell> cellById) {
		Map<String, List<AttachEvent>> byImsi = attaches.findAll().stream()
				.filter(a -> a.subscriberImsi() != null && a.attachDatetime() != null && a.cellId() != null)
				.collect(Collectors.groupingBy(AttachEvent::subscriberImsi));

		Set<String> flagged = new HashSet<>();
		for (Map.Entry<String, List<AttachEvent>> e : byImsi.entrySet()) {
			List<AttachEvent> seq = new ArrayList<>(e.getValue());
			seq.sort(Comparator.comparing(AttachEvent::attachDatetime));
			for (int i = 1; i < seq.size(); i++) {
				NetworkCell a = cellById.get(seq.get(i - 1).cellId());
				NetworkCell b = cellById.get(seq.get(i).cellId());
				if (a == null || b == null || a.cellId().equals(b.cellId())) continue;
				double km = haversineKm(a.latitude(), a.longitude(), b.latitude(), b.longitude());
				long secs = seq.get(i).attachDatetime().getEpochSecond() - seq.get(i - 1).attachDatetime().getEpochSecond();
				if (secs <= 0) continue;
				double kmh = km / (secs / 3600.0);
				if (kmh > maxTravelKmh) {
					flagged.add(e.getKey());
					break;
				}
			}
		}
		return flagged;
	}

	private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
		double r = 6371.0;
		double dLat = Math.toRadians(lat2 - lat1);
		double dLon = Math.toRadians(lon2 - lon1);
		double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
				* Math.sin(dLon / 2) * Math.sin(dLon / 2);
		return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
	}

	// =====================================================================
	//  Helpers
	// =====================================================================

	private static String bucketKey(String partner, Instant ts) {
		return partner + "|" + ts.truncatedTo(ChronoUnit.HOURS).getEpochSecond();
	}

	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}
}
