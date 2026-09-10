package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds representative roaming events on first start (when the table is empty), deriving realistic
 * QoS and commercial figures from the raw signals so the analytics endpoints have data to work on.
 *
 * <p><b>Disabled (no {@code @Component}).</b> The analytics endpoints now read the <b>real</b>
 * ingested dataset via {@code RoamingEventProjection}; this synthetic seeder is retained only for
 * reference and offline testing and is no longer registered as a Spring bean.</p>
 */
public class RoamingDataSeeder implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(RoamingDataSeeder.class);

	private final RoamingEventRepository repository;

	public RoamingDataSeeder(RoamingEventRepository repository) {
		this.repository = repository;
	}

	@Override
	public void run(String... args) {
		if (repository.count() > 0) {
			return;
		}
		Instant now = Instant.now();
		List<RoamingEvent> events = new ArrayList<>();
		// id, minutesAgo, direction, plmn, country, subscribers, errors, newDeviceRatio, impossibleTravel
		add(events, "RE-1001", now, 8, Direction.INBOUND, "234-15", "United Kingdom", 1420, 2, 0.03, false);
		add(events, "RE-1002", now, 21, Direction.INBOUND, "310-260", "United States", 12, 9, 0.55, true);
		add(events, "RE-1003", now, 44, Direction.OUTBOUND, "208-10", "France", 2310, 0, 0.01, false);
		add(events, "RE-1004", now, 63, Direction.INBOUND, "262-01", "Germany", 540, 4, 0.18, false);
		add(events, "RE-1005", now, 80, Direction.OUTBOUND, "214-07", "Spain", 760, 1, 0.04, false);
		add(events, "RE-1006", now, 96, Direction.INBOUND, "404-45", "India", 34, 6, 0.42, false);
		add(events, "RE-1007", now, 120, Direction.INBOUND, "222-10", "Italy", 980, 1, 0.02, false);
		add(events, "RE-1008", now, 150, Direction.INBOUND, "621-30", "Nigeria", 8, 11, 0.7, true);
		add(events, "RE-1009", now, 180, Direction.OUTBOUND, "228-01", "Switzerland", 410, 0, 0.03, false);
		add(events, "RE-1010", now, 210, Direction.INBOUND, "302-720", "Canada", 275, 3, 0.12, false);
		add(events, "RE-1011", now, 240, Direction.INBOUND, "310-260", "United States", 61, 5, 0.33, false);
		add(events, "RE-1012", now, 300, Direction.OUTBOUND, "202-05", "Greece", 150, 2, 0.06, false);
		repository.saveAll(events);
		log.info("Seeded {} roaming events into MySQL", events.size());
	}

	private void add(List<RoamingEvent> out, String id, Instant now, int minsAgo, Direction dir, String plmn,
					 String country, int subs, int errors, double newDeviceRatio, boolean impossibleTravel) {
		// Derive QoS from load/errors: more subscribers + errors → higher latency, lower throughput, more drops.
		double dataVolumeGb = round(subs * 0.045 + (dir == Direction.OUTBOUND ? 8 : 3), 2);
		double avgLatencyMs = round(35 + errors * 6 + subs * 0.004 + (impossibleTravel ? 40 : 0), 1);
		double throughputMbps = round(Math.max(2, 55 - errors * 3.5 - subs * 0.002), 1);
		double dropRatio = round(Math.min(0.4, 0.005 + errors * 0.012 + newDeviceRatio * 0.05), 3);
		// Commercial: outbound (our subs abroad) costs us wholesale; inbound earns wholesale revenue.
		double revenueEur = round(dataVolumeGb * (dir == Direction.INBOUND ? 4.2 : 1.1) + subs * 0.06, 2);
		double costEur = round(dataVolumeGb * (dir == Direction.OUTBOUND ? 3.6 : 1.4) + subs * 0.03, 2);
		out.add(new RoamingEvent(id, now.minus(minsAgo, ChronoUnit.MINUTES), dir, plmn, country, subs, errors,
				newDeviceRatio, impossibleTravel, dataVolumeGb, avgLatencyMs, throughputMbps, dropRatio,
				revenueEur, costEur));
	}

	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}
}
