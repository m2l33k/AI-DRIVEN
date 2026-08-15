package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/**
 * Full analysis of an uploaded roaming-events CSV: what was parsed, an aggregate summary of all the
 * data, the anomalies found in it, and a forecast of future traffic derived from the file.
 */
public record CsvAnalysisDto(
		String fileName,
		int rowsParsed,
		int rowsSkipped,
		List<String> columns,
		RoamingSummaryDto summary,
		List<AnomalyDto> anomalies,
		ForecastDto forecast
) {
}
