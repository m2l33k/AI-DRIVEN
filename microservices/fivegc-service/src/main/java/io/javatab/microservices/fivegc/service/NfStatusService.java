package io.javatab.microservices.fivegc.service;

import io.javatab.microservices.fivegc.web.dto.ContainerInfoDto;
import io.javatab.microservices.fivegc.web.dto.NfStatusDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Builds the NF status list by querying Docker for real container state.
 *
 * Falls back to "Down" for any container that cannot be reached or does not
 * exist (e.g. UPF on Windows, or 5GC stack not started).
 */
@Service
public class NfStatusService {

	// Maps NF type → container name → human description
	private static final List<NfDefinition> NF_DEFINITIONS = List.of(
			new NfDefinition("NRF",  "free5gc-nrf",   "Network Repository Function"),
			new NfDefinition("AMF",  "free5gc-amf",   "Access and Mobility Function"),
			new NfDefinition("SMF",  "free5gc-smf",   "Session Management Function"),
			new NfDefinition("AUSF", "free5gc-ausf",  "Authentication Server Function"),
			new NfDefinition("UDM",  "free5gc-udm",   "Unified Data Management"),
			new NfDefinition("UDR",  "free5gc-udr",   "Unified Data Repository"),
			new NfDefinition("PCF",  "free5gc-pcf",   "Policy Control Function"),
			new NfDefinition("NSSF", "free5gc-nssf",  "Network Slice Selection Function"),
			new NfDefinition("UPF",  "free5gc-upf",   "User Plane Function"),
			new NfDefinition("WebUI","free5gc-webui", "WebConsole / Provisioning UI")
	);

	private final DockerManagerService docker;

	public NfStatusService(DockerManagerService docker) {
		this.docker = docker;
	}

	public List<NfStatusDto> getNfStatus() {
		// Batch-fetch all free5gc containers once to avoid N Docker round-trips
		Map<String, Boolean> runningByName = buildRunningMap();

		return NF_DEFINITIONS.stream()
				.map(def -> {
					boolean running = runningByName.getOrDefault(def.containerName(), false);
					String status = running ? "Up" : "Down";
					return new NfStatusDto(def.type(), def.containerName(), def.description(), status, running);
				})
				.toList();
	}

	private Map<String, Boolean> buildRunningMap() {
		List<ContainerInfoDto> containers = docker.listFree5gcContainers();
		Map<String, Boolean> map = new java.util.HashMap<>();
		for (ContainerInfoDto c : containers) {
			map.put(c.name(), c.running());
		}
		return map;
	}

	private record NfDefinition(String type, String containerName, String description) {}
}
