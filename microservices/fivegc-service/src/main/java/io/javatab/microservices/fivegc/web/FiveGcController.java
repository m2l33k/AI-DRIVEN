package io.javatab.microservices.fivegc.web;

import io.javatab.microservices.fivegc.service.DockerManagerService;
import io.javatab.microservices.fivegc.service.NfStatusService;
import io.javatab.microservices.fivegc.service.WebConsoleProxyService;
import io.javatab.microservices.fivegc.web.dto.ContainerInfoDto;
import io.javatab.microservices.fivegc.web.dto.ContainerLogsDto;
import io.javatab.microservices.fivegc.web.dto.NfStatusDto;
import io.javatab.microservices.fivegc.web.dto.ProfileRequest;
import io.javatab.microservices.fivegc.web.dto.SubscriberRequest;
import io.javatab.microservices.fivegc.web.dto.TenantRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/5gc")
@Tag(name = "5G Core", description = "NF health, subscriber management and container lifecycle for free5GC")
public class FiveGcController {

	private static final Logger log = LoggerFactory.getLogger(FiveGcController.class);

	private final NfStatusService nfStatusService;
	private final WebConsoleProxyService webconsole;
	private final DockerManagerService docker;
	private final ObjectMapper mapper;

	public FiveGcController(NfStatusService nfStatusService,
	                        WebConsoleProxyService webconsole,
	                        DockerManagerService docker,
	                        ObjectMapper mapper) {
		this.nfStatusService = nfStatusService;
		this.webconsole = webconsole;
		this.docker = docker;
		this.mapper = mapper;
	}

	// ── NF status ────────────────────────────────────────────────────────────────

	@Operation(summary = "NF health status",
			description = "Live status of each 5G Network Function derived from real Docker container state.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/nf-status")
	public List<NfStatusDto> nfStatus() {
		log.info("nfStatus() invoked — PreAuthorize passed");
		try {
			return nfStatusService.getNfStatus();
		} catch (Throwable t) {
			log.error("nfStatus() unexpected failure type={} msg={}", t.getClass().getName(), t.getMessage(), t);
			return List.of();
		}
	}

	// ── subscriber management ─────────────────────────────────────────────────────

	@Operation(summary = "List provisioned subscribers",
			description = "Returns all IMSI/GPSI records from the free5GC UDR via the WebConsole API.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/subscribers")
	public List<Map<String, Object>> subscribers() {
		return webconsole.getSubscribers();
	}

	@Operation(summary = "Provision a subscriber",
			description = "Creates a new SIM profile in UDR. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/subscribers")
	public ResponseEntity<Map<String, Object>> createSubscriber(
			@RequestBody SubscriberRequest body,
			@AuthenticationPrincipal Jwt jwt) {
		log.info("createSubscriber caller sub={} ueId={}", jwt.getSubject(), body.ueId);
		@SuppressWarnings("unchecked")
		Map<String, Object> map = mapper.convertValue(body, Map.class);
		return ResponseEntity.status(HttpStatus.CREATED).body(webconsole.createSubscriber(map));
	}

	@Operation(summary = "Delete a subscriber",
			description = "Removes the SIM profile for the given IMSI from UDR. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@DeleteMapping("/subscribers/{imsi}")
	public ResponseEntity<Void> deleteSubscriber(@PathVariable String imsi) {
		webconsole.deleteSubscriber(imsi);
		return ResponseEntity.noContent().build();
	}

	// ── subscription profiles ─────────────────────────────────────────────────────

	@Operation(summary = "List subscription profiles",
			description = "Returns all named subscription profiles from the free5GC WebConsole.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/profiles")
	public List<Map<String, Object>> profiles() {
		return webconsole.getProfiles();
	}

	@Operation(summary = "Create a subscription profile",
			description = "Creates or replaces a named subscription profile. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/profiles/{name}")
	public ResponseEntity<Map<String, Object>> createProfile(
			@PathVariable String name,
			@RequestBody ProfileRequest body) {
		@SuppressWarnings("unchecked")
		Map<String, Object> map = mapper.convertValue(body, Map.class);
		return ResponseEntity.status(HttpStatus.CREATED).body(webconsole.createProfile(name, map));
	}

	@Operation(summary = "Delete a subscription profile",
			description = "Removes the named subscription profile. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@DeleteMapping("/profiles/{name}")
	public ResponseEntity<Void> deleteProfile(@PathVariable String name) {
		webconsole.deleteProfile(name);
		return ResponseEntity.noContent().build();
	}

	// ── tenants ───────────────────────────────────────────────────────────────────

	@Operation(summary = "List tenants",
			description = "Returns all tenants from the free5GC WebConsole.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/tenants")
	public List<Map<String, Object>> tenants() {
		return webconsole.getTenants();
	}

	@Operation(summary = "Create a tenant",
			description = "Creates a new tenant. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/tenants")
	public ResponseEntity<Map<String, Object>> createTenant(@RequestBody TenantRequest body) {
		return ResponseEntity.status(HttpStatus.CREATED).body(webconsole.createTenant(body.tenantName));
	}

	@Operation(summary = "Delete a tenant",
			description = "Removes a tenant by ID. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@DeleteMapping("/tenants/{tenantId}")
	public ResponseEntity<Void> deleteTenant(@PathVariable String tenantId) {
		webconsole.deleteTenant(tenantId);
		return ResponseEntity.noContent().build();
	}

	// ── UE contexts ──────────────────────────────────────────────────────────────

	@Operation(summary = "Active UE contexts",
			description = "Currently registered UE sessions via the AMF — who is connected right now.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/ue-contexts")
	public List<Map<String, Object>> ueContexts() {
		return webconsole.getRegisteredUeContexts();
	}

	// ── container management ──────────────────────────────────────────────────────

	@Operation(summary = "List free5GC containers",
			description = "All containers whose name starts with 'free5gc-' with their current Docker state.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/containers")
	public List<ContainerInfoDto> containers() {
		return docker.listFree5gcContainers();
	}

	@Operation(summary = "Inspect a container",
			description = "Returns detailed state for a single free5GC container.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/containers/{name}")
	public ResponseEntity<ContainerInfoDto> container(@PathVariable String name) {
		ContainerInfoDto info = docker.inspectContainer(name);
		return info != null ? ResponseEntity.ok(info) : ResponseEntity.notFound().build();
	}

	@Operation(summary = "Start a container",
			description = "Starts the named free5GC container. Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/containers/{name}/start")
	public ResponseEntity<Void> startContainer(@PathVariable String name) {
		docker.startContainer(name);
		return ResponseEntity.ok().build();
	}

	@Operation(summary = "Stop a container",
			description = "Gracefully stops the named free5GC container (10 s timeout). Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/containers/{name}/stop")
	public ResponseEntity<Void> stopContainer(@PathVariable String name) {
		docker.stopContainer(name);
		return ResponseEntity.ok().build();
	}

	@Operation(summary = "Restart a container",
			description = "Restarts the named free5GC container (10 s stop timeout). Requires NETWORK_OPERATOR role.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("hasRole('NETWORK_OPERATOR')")
	@PostMapping("/containers/{name}/restart")
	public ResponseEntity<Void> restartContainer(@PathVariable String name) {
		docker.restartContainer(name);
		return ResponseEntity.ok().build();
	}

	@Operation(summary = "Tail container logs",
			description = "Returns the last N log lines (stdout + stderr) from the named free5GC container.",
			security = @SecurityRequirement(name = "bearerAuth"))
	@PreAuthorize("isAuthenticated()")
	@GetMapping("/containers/{name}/logs")
	public ContainerLogsDto containerLogs(
			@PathVariable String name,
			@RequestParam(defaultValue = "100") int tail) {
		return docker.getContainerLogs(name, tail);
	}
}
