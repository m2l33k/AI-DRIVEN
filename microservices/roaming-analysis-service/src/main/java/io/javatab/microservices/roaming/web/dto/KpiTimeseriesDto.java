package io.javatab.microservices.roaming.web.dto;

import io.javatab.microservices.roaming.domain.KpiWindow;

import java.util.List;

/** A partner's KPI set across the last N consecutive aggregation windows (oldest → newest). */
public record KpiTimeseriesDto(
		String partner,
		KpiWindow window,
		List<KpiSetDto> points
) {
}
