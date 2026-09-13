package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/**
 * Response from the Django ML forecasting service — one list per model plus an ensemble average.
 * Each point carries an ISO-8601 timestamp, a subscriber count, and a predicted flag.
 */
public record MultiModelForecastDto(
        List<Point> history,
        List<Point> lstm,
        List<Point> prophet,
        List<Point> arima,
        List<Point> ensemble
) {
    public record Point(String timestamp, long subscribers, boolean predicted) {}
}
