package io.javatab.microservices.fivegc.service;

import io.javatab.microservices.fivegc.web.dto.ContainerInfoDto;
import io.javatab.microservices.fivegc.web.dto.NfStatusDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link NfStatusService}. No Spring context — DockerManagerService is mocked
 * so we verify the NF-definition mapping and Up/Down derivation in isolation.
 */
@ExtendWith(MockitoExtension.class)
class NfStatusServiceTest {

	@Mock
	private DockerManagerService docker;

	@InjectMocks
	private NfStatusService service;

	@Test
	void allNfsDownWhenDockerReturnsEmptyList() {
		when(docker.listFree5gcContainers()).thenReturn(List.of());

		List<NfStatusDto> status = service.getNfStatus();

		assertThat(status).isNotEmpty();
		assertThat(status).allMatch(nf -> !nf.up());
		assertThat(status).allMatch(nf -> "Down".equals(nf.status()));
	}

	@Test
	void runningContainerMarkesNfAsUp() {
		when(docker.listFree5gcContainers()).thenReturn(List.of(
				container("free5gc-nrf", true),
				container("free5gc-amf", true),
				container("free5gc-smf", false)
		));

		List<NfStatusDto> status = service.getNfStatus();

		assertThat(nfByType(status, "NRF").up()).isTrue();
		assertThat(nfByType(status, "AMF").up()).isTrue();
		assertThat(nfByType(status, "SMF").up()).isFalse();
		assertThat(nfByType(status, "UDM").up()).isFalse();
	}

	@Test
	void returnsAllExpectedNfTypes() {
		when(docker.listFree5gcContainers()).thenReturn(List.of());

		List<String> types = service.getNfStatus().stream().map(NfStatusDto::type).toList();

		assertThat(types).containsExactlyInAnyOrder(
				"NRF", "AMF", "SMF", "AUSF", "UDM", "UDR", "PCF", "NSSF", "UPF", "WebUI");
	}

	@Test
	void statusStringMatchesUpFlag() {
		when(docker.listFree5gcContainers()).thenReturn(List.of(
				container("free5gc-nrf", true)
		));

		List<NfStatusDto> status = service.getNfStatus();

		status.forEach(nf -> {
			if (nf.up()) assertThat(nf.status()).isEqualTo("Up");
			else         assertThat(nf.status()).isEqualTo("Down");
		});
	}

	// ── helpers ──────────────────────────────────────────────────────────────────

	private static ContainerInfoDto container(String name, boolean running) {
		return new ContainerInfoDto(name, "abc123", "free5gc/nrf:v3.4.4",
				running ? "running" : "exited",
				running ? "running" : "stopped",
				running, "2026-01-01T00:00:00Z");
	}

	private static NfStatusDto nfByType(List<NfStatusDto> list, String type) {
		return list.stream().filter(n -> n.type().equals(type)).findFirst()
				.orElseThrow(() -> new AssertionError("NF type not found: " + type));
	}
}
