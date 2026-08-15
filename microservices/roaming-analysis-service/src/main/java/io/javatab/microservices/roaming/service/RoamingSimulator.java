package io.javatab.microservices.roaming.service;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import io.javatab.microservices.roaming.repository.RoamingEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Generates realistic synthetic roaming events so the real-time monitor ({@code /live}) and anomaly
 * feed can be observed reacting to fresh traffic — useful for demos, load-free testing and QA.
 *
 * <p>Events are timestamped within the last {@code minutesSpread} minutes, mostly benign with a
 * sprinkling of injected anomalies (fraud PLMNs, impossible travel, signalling storms). Persisted
 * with a {@code SIM-} id prefix so they are easy to recognise and purge.</p>
 */
@Component
public class RoamingSimulator {

	private static final Logger log = LoggerFactory.getLogger(RoamingSimulator.class);

	/** Pool of partner PLMNs / countries to draw from; the last three are the known high-risk ones. */
	private static final String[][] PARTNERS = {
			{"234-15", "United Kingdom"}, {"208-10", "France"}, {"262-01", "Germany"},
			{"214-07", "Spain"}, {"222-10", "Italy"}, {"228-01", "Switzerland"},
			{"302-720", "Canada"}, {"202-05", "Greece"},
			{"310-260", "United States"}, {"404-45", "India"}, {"621-30", "Nigeria"}
	};

	private final RoamingEventRepository repository;

	public RoamingSimulator(RoamingEventRepository repository) {
		this.repository = repository;
	}

	/**
	 * Builds {@code count} synthetic events spread over the last {@code minutesSpread} minutes.
	 *
	 * @param persist when {@code true} the batch is saved so {@code /live} and {@code /anomalies} see it.
	 */
	public List<RoamingEvent> generate(int count, int minutesSpread, boolean persist) {
		int n = Math.max(1, Math.min(count, 500));
		int spread = Math.max(1, minutesSpread);
		ThreadLocalRandom rnd = ThreadLocalRandom.current();
		Instant now = Instant.now();

		List<RoamingEvent> events = new ArrayList<>(n);
		for (int i = 0; i < n; i++) {
			boolean anomalous = rnd.nextDouble() < 0.18; // ~1 in 5 injected as suspicious
			String[] partner = anomalous
					? PARTNERS[8 + rnd.nextInt(3)]          // high-risk pool
					: PARTNERS[rnd.nextInt(8)];             // benign pool
			Direction dir = rnd.nextBoolean() ? Direction.INBOUND : Direction.OUTBOUND;

			int subscribers = anomalous ? rnd.nextInt(5, 60) : rnd.nextInt(200, 2500);
			int errors = anomalous ? rnd.nextInt(6, 14) : rnd.nextInt(0, 4);
			double newDeviceRatio = anomalous ? rnd.nextDouble(0.35, 0.75) : rnd.nextDouble(0.0, 0.12);
			boolean impossibleTravel = anomalous && rnd.nextDouble() < 0.5;
			long minsAgo = rnd.nextLong(spread + 1L);

			double dataVolumeGb = round(subscribers * 0.045 + (dir == Direction.OUTBOUND ? 8 : 3), 2);
			double avgLatencyMs = round(35 + errors * 6.0 + subscribers * 0.004 + (impossibleTravel ? 40 : 0), 1);
			double throughputMbps = round(Math.max(2, 55 - errors * 3.5 - subscribers * 0.002), 1);
			double dropRatio = round(Math.min(0.4, 0.005 + errors * 0.012 + newDeviceRatio * 0.05), 3);
			double revenueEur = round(dataVolumeGb * (dir == Direction.INBOUND ? 4.2 : 1.1) + subscribers * 0.06, 2);
			double costEur = round(dataVolumeGb * (dir == Direction.OUTBOUND ? 3.6 : 1.4) + subscribers * 0.03, 2);

			events.add(new RoamingEvent("SIM-" + UUID.randomUUID().toString().substring(0, 8),
					now.minus(minsAgo, ChronoUnit.MINUTES), dir, partner[0], partner[1], subscribers, errors,
					newDeviceRatio, impossibleTravel, dataVolumeGb, avgLatencyMs, throughputMbps, dropRatio,
					revenueEur, costEur));
		}

		if (persist) {
			repository.saveAll(events);
			log.info("Simulated {} roaming events into MySQL (window {} min)", events.size(), spread);
		}
		return events;
	}

	private static double round(double v, int places) {
		double f = Math.pow(10, places);
		return Math.round(v * f) / f;
	}
}
