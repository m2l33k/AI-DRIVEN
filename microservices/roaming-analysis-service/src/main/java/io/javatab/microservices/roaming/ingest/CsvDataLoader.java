package io.javatab.microservices.roaming.ingest;

import com.opencsv.CSVReaderHeaderAware;
import io.javatab.microservices.roaming.domain.AttachEvent;
import io.javatab.microservices.roaming.domain.Device;
import io.javatab.microservices.roaming.domain.HandoverEvent;
import io.javatab.microservices.roaming.domain.NetworkCell;
import io.javatab.microservices.roaming.domain.RoamingCdr;
import io.javatab.microservices.roaming.domain.SessionQos;
import io.javatab.microservices.roaming.repository.AttachEventRepository;
import io.javatab.microservices.roaming.repository.DeviceRepository;
import io.javatab.microservices.roaming.repository.HandoverEventRepository;
import io.javatab.microservices.roaming.repository.NetworkCellRepository;
import io.javatab.microservices.roaming.repository.RoamingCdrRepository;
import io.javatab.microservices.roaming.repository.SessionQosRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * One-shot ingestion of the {@code Data/Data/*.csv} roaming dataset into MySQL, run on startup when
 * the target table is empty (idempotent per table, like the old seeder). Files are resolved from
 * {@code roaming.data-dir} first (a filesystem path, default the repo's {@code Data/Data}); if not
 * present there, from the classpath {@code seed/} folder — so docker images can bundle a copy.
 *
 * <p>Loads dimension tables (devices, cells) before facts (CDRs, attach, QoS, handover). Parsing is
 * lenient: blank CSV cells become {@code null}; unparsable numbers are skipped rather than failing
 * the whole load.</p>
 */
@Component
public class CsvDataLoader implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(CsvDataLoader.class);

	private final String dataDir;
	private final DeviceRepository devices;
	private final NetworkCellRepository cells;
	private final RoamingCdrRepository cdrs;
	private final AttachEventRepository attaches;
	private final SessionQosRepository sessions;
	private final HandoverEventRepository handovers;

	public CsvDataLoader(@Value("${roaming.data-dir:../../Data/Data}") String dataDir,
						 DeviceRepository devices, NetworkCellRepository cells, RoamingCdrRepository cdrs,
						 AttachEventRepository attaches, SessionQosRepository sessions,
						 HandoverEventRepository handovers) {
		this.dataDir = dataDir;
		this.devices = devices;
		this.cells = cells;
		this.cdrs = cdrs;
		this.attaches = attaches;
		this.sessions = sessions;
		this.handovers = handovers;
	}

	@Override
	public void run(String... args) {
		load("devices.csv", devices, r -> new Device(
				s(r, "device_id"), s(r, "imei_tac"), s(r, "manufacturer"), s(r, "model"),
				s(r, "os_name"), s(r, "os_version"), s(r, "lte_category"),
				b(r, "volte_supported"), b(r, "five_g_supported")));

		load("network_cells.csv", cells, r -> new NetworkCell(
				s(r, "cell_id"), s(r, "country_code"), s(r, "city"), s(r, "operator_id"),
				s(r, "tracking_area_code"), d0(r, "latitude"), d0(r, "longitude"), s(r, "cell_type")));

		load("roaming-cdr-and-tap-rap-file-processing.csv", cdrs, r -> new RoamingCdr(
				s(r, "cdr_id"), s(r, "tap_file_id"), s(r, "tap_file_type"), inst(r, "file_received_datetime"),
				s(r, "home_operator_id"), s(r, "visited_operator_id"), s(r, "subscriber_imsi"),
				s(r, "subscriber_msisdn"), s(r, "device_id"), s(r, "serving_cell_id"), s(r, "call_type"),
				inst(r, "call_start_datetime"), inst(r, "call_end_datetime"), i(r, "duration_seconds"),
				d(r, "data_volume_mb"), d(r, "charged_amount"), d(r, "wholesale_cost"), s(r, "currency"),
				s(r, "iot_tariff_id"), b(r, "fraud_flag"), s(r, "fraud_detection_reason"),
				s(r, "settlement_status"), date(r, "settlement_date"), b(r, "nrtrde_flag"),
				inst(r, "record_creation_datetime")));

		load("attach_events.csv", attaches, r -> new AttachEvent(
				s(r, "attach_id"), s(r, "subscriber_imsi"), s(r, "subscriber_msisdn"), s(r, "home_operator_id"),
				s(r, "visited_operator_id"), s(r, "cell_id"), inst(r, "attach_datetime"), s(r, "attach_status"),
				s(r, "reject_cause"), b(r, "auth_failure_flag"), i(r, "registration_delay_ms")));

		load("session_qos.csv", sessions, r -> new SessionQos(
				s(r, "session_id"), s(r, "cdr_id"), s(r, "subscriber_imsi"), s(r, "home_operator_id"),
				s(r, "visited_operator_id"), s(r, "serving_cell_id"), inst(r, "session_start_datetime"),
				inst(r, "session_end_datetime"), d(r, "download_mb"), d(r, "upload_mb"),
				d(r, "avg_throughput_mbps"), d(r, "latency_ms"), d(r, "packet_loss_pct"),
				s(r, "session_status"), s(r, "drop_reason")));

		load("handover_events.csv", handovers, r -> new HandoverEvent(
				s(r, "handover_id"), s(r, "subscriber_imsi"), s(r, "visited_operator_id"), s(r, "source_cell_id"),
				s(r, "target_cell_id"), inst(r, "event_datetime"), s(r, "event_type"), s(r, "handover_status"),
				s(r, "failure_cause")));
	}

	/** Loads one CSV into its repository if the table is empty; otherwise skips. */
	private <T> void load(String file, JpaRepository<T, ?> repo, Function<Map<String, String>, T> mapper) {
		if (repo.count() > 0) {
			log.info("Skipping {} — {} already populated ({} rows)", file, repo.getClass().getSimpleName(), repo.count());
			return;
		}
		Resource resource = resolve(file);
		if (resource == null || !resource.exists()) {
			log.warn("Dataset file not found: {} (looked in '{}' and classpath seed/). Skipping.", file, dataDir);
			return;
		}
		List<T> batch = new ArrayList<>();
		try (Reader in = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8);
			 CSVReaderHeaderAware reader = new CSVReaderHeaderAware(in)) {
			Map<String, String> row;
			while ((row = reader.readMap()) != null) {
				try {
					batch.add(mapper.apply(row));
				} catch (RuntimeException ex) {
					log.debug("Skipping bad row in {}: {}", file, ex.getMessage());
				}
			}
			repo.saveAll(batch);
			log.info("Loaded {} rows from {}", batch.size(), file);
		} catch (Exception ex) {
			log.error("Failed to load {}: {}", file, ex.getMessage(), ex);
		}
	}

	private Resource resolve(String file) {
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
		Resource fs = resolver.getResource("file:" + dataDir + "/" + file);
		if (fs.exists()) {
			return fs;
		}
		Resource cp = resolver.getResource("classpath:seed/" + file);
		return cp.exists() ? cp : fs;
	}

	// ---- lenient cell parsers (blank → null) ----

	private static String s(Map<String, String> r, String k) {
		String v = r.get(k);
		if (v == null) {
			return null;
		}
		v = v.trim();
		return v.isEmpty() ? null : v;
	}

	private static boolean b(Map<String, String> r, String k) {
		return "true".equalsIgnoreCase(s(r, k));
	}

	private static Integer i(Map<String, String> r, String k) {
		String v = s(r, k);
		return v == null ? null : Integer.valueOf((int) Math.round(Double.parseDouble(v)));
	}

	private static Double d(Map<String, String> r, String k) {
		String v = s(r, k);
		return v == null ? null : Double.valueOf(v);
	}

	/** Like {@link #d} but defaults to 0.0 for primitive-double columns (lat/lon). */
	private static double d0(Map<String, String> r, String k) {
		Double v = d(r, k);
		return v == null ? 0.0 : v;
	}

	private static Instant inst(Map<String, String> r, String k) {
		String v = s(r, k);
		return v == null ? null : Instant.parse(v);
	}

	private static LocalDate date(Map<String, String> r, String k) {
		String v = s(r, k);
		return v == null ? null : LocalDate.parse(v);
	}
}
