package io.javatab.microservices.roaming.web.dto;

import java.util.List;

/**
 * Result of a simulation run: how many synthetic events were generated and a fresh real-time monitor
 * snapshot (plus a sample of the newest generated events) so the effect is immediately observable.
 */
public record SimulationResultDto(
		int generated,
		int windowMinutes,
		LiveMonitorDto monitor,
		List<RoamingEventDto> sample
) {
}
