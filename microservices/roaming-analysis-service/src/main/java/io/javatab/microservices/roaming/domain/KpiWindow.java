package io.javatab.microservices.roaming.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * Streaming aggregation windows for the Performance Assurance Engine (§5.2):
 * 5-min (real-time), 1-hour, 1-day and 1-month (billing-aligned).
 *
 * <p>{@link #truncate(Instant)} snaps a timestamp down to the start of its window, so events can be
 * bucketed; {@link #next(Instant)} returns the following window boundary.</p>
 */
public enum KpiWindow {

	FIVE_MIN(Duration.ofMinutes(5)),
	HOUR(Duration.ofHours(1)),
	DAY(Duration.ofDays(1)),
	MONTH(Duration.ofDays(30)); // billing-aligned; truncation is calendar-month exact (see truncate)

	private final Duration nominal;

	KpiWindow(Duration nominal) {
		this.nominal = nominal;
	}

	/** Nominal window length (MONTH is approximate; use {@link #truncate}/{@link #next} for calendar months). */
	public Duration nominal() {
		return nominal;
	}

	/** Snap {@code ts} down to the start of the window it falls in (UTC). */
	public Instant truncate(Instant ts) {
		return switch (this) {
			case FIVE_MIN -> Instant.ofEpochSecond((ts.getEpochSecond() / 300) * 300);
			case HOUR -> ts.truncatedTo(ChronoUnit.HOURS);
			case DAY -> ts.truncatedTo(ChronoUnit.DAYS);
			case MONTH -> {
				LocalDateTime d = LocalDateTime.ofInstant(ts, ZoneOffset.UTC)
						.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
				yield d.toInstant(ZoneOffset.UTC);
			}
		};
	}

	/** Start of the window immediately after the one containing {@code ts}. */
	public Instant next(Instant ts) {
		Instant start = truncate(ts);
		return switch (this) {
			case FIVE_MIN -> start.plus(5, ChronoUnit.MINUTES);
			case HOUR -> start.plus(1, ChronoUnit.HOURS);
			case DAY -> start.plus(1, ChronoUnit.DAYS);
			case MONTH -> LocalDateTime.ofInstant(start, ZoneOffset.UTC)
					.plusMonths(1).toInstant(ZoneOffset.UTC);
		};
	}
}
