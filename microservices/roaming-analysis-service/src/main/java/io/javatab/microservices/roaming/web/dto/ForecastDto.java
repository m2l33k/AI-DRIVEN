package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/** Historical + predicted roaming volume (subscribers per hour). */
public record ForecastDto(
		String method,
		double trendPerHour,
		List<Point> history,
		List<Point> forecast
) {
	public record Point(String hour, long subscribers, boolean predicted) {
	}
}
