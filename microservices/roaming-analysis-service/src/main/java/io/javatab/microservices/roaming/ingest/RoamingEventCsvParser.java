package io.javatab.microservices.roaming.ingest;

import com.opencsv.CSVReaderHeaderAware;
import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Parses an uploaded roaming-events CSV into in-memory {@link RoamingEvent}s (never persisted) so the
 * analytics endpoints can summarise, score and forecast an arbitrary file.
 *
 * <p>Lenient by design: header names may be snake_case or camelCase; blank cells fall back to
 * sensible defaults, and any QoS / commercial columns that are missing are <em>derived</em> from the
 * raw signals with the same formulas the seeder uses — so a minimal file
 * ({@code direction, partner_plmn, country, subscribers, signaling_errors, new_device_ratio,
 * impossible_travel}) is enough. Unparsable rows are counted and skipped, not fatal.</p>
 */
@Component
public class RoamingEventCsvParser {

	private static final Logger log = LoggerFactory.getLogger(RoamingEventCsvParser.class);

	public CsvParseResult parse(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new IllegalArgumentException("CSV file is missing or empty");
		}
		List<RoamingEvent> events = new ArrayList<>();
		List<String> columns = new ArrayList<>();
		int skipped = 0;
		Instant now = Instant.now();
		int index = 0;

		try (Reader in = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
			 CSVReaderHeaderAware reader = new CSVReaderHeaderAware(in)) {
			Map<String, String> row;
			while ((row = reader.readMap()) != null) {
				if (columns.isEmpty()) {
					columns.addAll(row.keySet());
				}
				try {
					events.add(toEvent(row, now, index));
					index++;
				} catch (RuntimeException ex) {
					skipped++;
					log.debug("Skipping bad CSV row: {}", ex.getMessage());
				}
			}
		} catch (Exception ex) {
			throw new IllegalArgumentException("Could not read CSV: " + ex.getMessage());
		}

		if (events.isEmpty()) {
			throw new IllegalArgumentException("No valid roaming rows found in CSV (check headers and values)");
		}
		return new CsvParseResult(file.getOriginalFilename(), events, events.size(), skipped, columns);
	}

	private RoamingEvent toEvent(Map<String, String> r, Instant now, int index) {
		String id = str(r, "id", "event_id", "cdr_id");
		if (id == null) {
			id = "CSV-" + (index + 1);
		}
		// timestamp: explicit if present, else stagger rows one minute apart into the recent past.
		Instant ts = instant(r, "timestamp", "event_datetime", "call_start_datetime");
		if (ts == null) {
			ts = now.minus((long) index, ChronoUnit.MINUTES);
		}
		Direction dir = direction(str(r, "direction", "roaming_direction"));
		String plmn = firstNonNull(str(r, "partner_plmn", "partnerplmn", "visited_operator_id", "plmn"), "UNKNOWN");
		String country = firstNonNull(str(r, "country", "country_code"), "Unknown");
		// CDR files have one IMSI per row — treat each as 1 subscriber when no aggregate column exists
		int subscribers = (int) num(r, 0, "subscribers", "subscriber_count", "imsi_count");
		if (subscribers == 0) {
			subscribers = 1;
		}
		int signalingErrors = (int) num(r, 0, "signaling_errors", "signalling_errors", "errors");
		double newDeviceRatio = num(r, 0, "new_device_ratio", "newdeviceratio");
		boolean impossibleTravel = bool(r, "impossible_travel", "impossibletravel");

		// QoS + commercial: use the CSV columns if present, otherwise derive from the signals.
		double dataVolumeGb = numOr(r, subscribers * 0.045 + (dir == Direction.OUTBOUND ? 8 : 3),
				"data_volume_gb", "datavolumegb", "data_volume_mb");
		double avgLatencyMs = numOr(r, 35 + signalingErrors * 6.0 + subscribers * 0.004 + (impossibleTravel ? 40 : 0),
				"avg_latency_ms", "avglatencyms", "latency_ms");
		double throughputMbps = numOr(r, Math.max(2, 55 - signalingErrors * 3.5 - subscribers * 0.002),
				"throughput_mbps", "throughputmbps", "avg_throughput_mbps");
		double dropRatio = numOr(r, Math.min(0.4, 0.005 + signalingErrors * 0.012 + newDeviceRatio * 0.05),
				"dropped_session_ratio", "droppedsessionratio", "drop_ratio");
		double revenueEur = numOr(r, dataVolumeGb * (dir == Direction.INBOUND ? 4.2 : 1.1) + subscribers * 0.06,
				"revenue_eur", "revenueeur", "charged_amount");
		double costEur = numOr(r, dataVolumeGb * (dir == Direction.OUTBOUND ? 3.6 : 1.4) + subscribers * 0.03,
				"cost_eur", "costeur", "wholesale_cost");

		return new RoamingEvent(id, ts, dir, plmn, country, subscribers, signalingErrors, newDeviceRatio,
				impossibleTravel, round(dataVolumeGb, 2), round(avgLatencyMs, 1), round(throughputMbps, 1),
				round(dropRatio, 3), round(revenueEur, 2), round(costEur, 2));
	}

	// ---- lenient cell readers (accept several header aliases, blank → default) ----

	private static String str(Map<String, String> r, String... keys) {
		for (String k : keys) {
			for (Map.Entry<String, String> en : r.entrySet()) {
				if (en.getKey() != null && en.getKey().trim().equalsIgnoreCase(k)) {
					String v = en.getValue() == null ? null : en.getValue().trim();
					if (v != null && !v.isEmpty()) {
						return v;
					}
				}
			}
		}
		return null;
	}

	private static double num(Map<String, String> r, double dflt, String... keys) {
		String v = str(r, keys);
		if (v == null) {
			return dflt;
		}
		try {
			return Double.parseDouble(v);
		} catch (NumberFormatException ex) {
			return dflt;
		}
	}

	/** Like {@link #num} but returns the (already computed) fallback when the column is absent. */
	private static double numOr(Map<String, String> r, double fallback, String... keys) {
		String v = str(r, keys);
		if (v == null) {
			return fallback;
		}
		try {
			return Double.parseDouble(v);
		} catch (NumberFormatException ex) {
			return fallback;
		}
	}

	private static boolean bool(Map<String, String> r, String... keys) {
		String v = str(r, keys);
		return "true".equalsIgnoreCase(v) || "1".equals(v) || "yes".equalsIgnoreCase(v);
	}

	private static Direction direction(String v) {
		if (v == null) {
			return Direction.INBOUND;
		}
		String u = v.trim().toUpperCase();
		return u.startsWith("OUT") ? Direction.OUTBOUND : Direction.INBOUND;
	}

	private static Instant instant(Map<String, String> r, String... keys) {
		String v = str(r, keys);
		if (v == null) {
			return null;
		}
		try {
			return Instant.parse(v);
		} catch (RuntimeException ex) {
			return null;
		}
	}

	private static String firstNonNull(String a, String b) {
		return a != null ? a : b;
	}

	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}

	/** Outcome of parsing an uploaded CSV: the events plus row-level bookkeeping. */
	public record CsvParseResult(String fileName, List<RoamingEvent> events, int parsed, int skipped,
								 List<String> columns) {
	}
}
