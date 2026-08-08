package io.javatab.microservices.roaming.repository;

import io.javatab.microservices.roaming.domain.Direction;
import io.javatab.microservices.roaming.domain.RoamingEvent;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory store of roaming events, seeded with representative sample data.
 *
 * <p>This is a stand-in for a real datastore (JPA/Postgres or a streaming source). The API
 * and service layers are written against this interface-like component so it can be swapped
 * for a persistent implementation later without touching callers.</p>
 */
@Repository
public class RoamingEventRepository {

	private final List<RoamingEvent> events = new CopyOnWriteArrayList<>();

	public RoamingEventRepository() {
		seed();
	}

	public List<RoamingEvent> findAll() {
		return List.copyOf(events);
	}

	public Optional<RoamingEvent> findById(String id) {
		return events.stream().filter(e -> e.id().equals(id)).findFirst();
	}

	private void seed() {
		Instant now = Instant.now();
		events.addAll(List.of(
				new RoamingEvent("RE-1001", now.minus(8, ChronoUnit.MINUTES), Direction.INBOUND, "234-15", "United Kingdom", 1420, 2, 0.03, false),
				new RoamingEvent("RE-1002", now.minus(21, ChronoUnit.MINUTES), Direction.INBOUND, "310-260", "United States", 12, 9, 0.55, true),
				new RoamingEvent("RE-1003", now.minus(44, ChronoUnit.MINUTES), Direction.OUTBOUND, "208-10", "France", 2310, 0, 0.01, false),
				new RoamingEvent("RE-1004", now.minus(63, ChronoUnit.MINUTES), Direction.INBOUND, "262-01", "Germany", 540, 4, 0.18, false),
				new RoamingEvent("RE-1005", now.minus(80, ChronoUnit.MINUTES), Direction.OUTBOUND, "214-07", "Spain", 760, 1, 0.04, false),
				new RoamingEvent("RE-1006", now.minus(96, ChronoUnit.MINUTES), Direction.INBOUND, "404-45", "India", 34, 6, 0.42, false),
				new RoamingEvent("RE-1007", now.minus(120, ChronoUnit.MINUTES), Direction.INBOUND, "222-10", "Italy", 980, 1, 0.02, false),
				new RoamingEvent("RE-1008", now.minus(150, ChronoUnit.MINUTES), Direction.INBOUND, "621-30", "Nigeria", 8, 11, 0.7, true),
				new RoamingEvent("RE-1009", now.minus(180, ChronoUnit.MINUTES), Direction.OUTBOUND, "228-01", "Switzerland", 410, 0, 0.03, false),
				new RoamingEvent("RE-1010", now.minus(210, ChronoUnit.MINUTES), Direction.INBOUND, "302-720", "Canada", 275, 3, 0.12, false),
				new RoamingEvent("RE-1011", now.minus(240, ChronoUnit.MINUTES), Direction.INBOUND, "310-260", "United States", 61, 5, 0.33, false),
				new RoamingEvent("RE-1012", now.minus(300, ChronoUnit.MINUTES), Direction.OUTBOUND, "202-05", "Greece", 150, 2, 0.06, false)
		));
	}
}
