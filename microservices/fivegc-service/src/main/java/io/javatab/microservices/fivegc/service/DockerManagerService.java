package io.javatab.microservices.fivegc.service;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.core.command.LogContainerResultCallback;
import io.javatab.microservices.fivegc.web.dto.ContainerInfoDto;
import io.javatab.microservices.fivegc.web.dto.ContainerLogsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Manages free5GC Docker containers through the Docker daemon API.
 *
 * All operations are scoped to containers whose names start with "free5gc-".
 * Every method catches Docker exceptions and returns graceful fallbacks so the
 * rest of the service continues working when Docker is unavailable.
 */
@Service
public class DockerManagerService {

	private static final Logger log = LoggerFactory.getLogger(DockerManagerService.class);
	private static final String FREE5GC_PREFIX = "free5gc-";

	private final DockerClient docker;

	public DockerManagerService(DockerClient docker) {
		this.docker = docker;
	}

	// ── container listing ────────────────────────────────────────────────────────

	public List<ContainerInfoDto> listFree5gcContainers() {
		try {
			return docker.listContainersCmd()
					.withShowAll(true)
					.withNameFilter(List.of(FREE5GC_PREFIX))
					.exec()
					.stream()
					.map(this::toDto)
					.toList();
		} catch (Throwable e) {
			log.error("Docker list failed — type={} msg={}", e.getClass().getName(), e.getMessage(), e);
			return List.of();
		}
	}

	/** Returns the running state of a specific container, or null if not found. */
	public ContainerInfoDto inspectContainer(String name) {
		try {
			var info = docker.inspectContainerCmd(canonicalName(name)).exec();
			var state = info.getState();
			boolean running = Boolean.TRUE.equals(state != null ? state.getRunning() : false);
			return new ContainerInfoDto(
					name,
					info.getId() != null ? info.getId().substring(0, 12) : "unknown",
					info.getConfig() != null ? info.getConfig().getImage() : "unknown",
					state != null && state.getStatus() != null ? state.getStatus() : "unknown",
					running ? "running" : "stopped",
					running,
					info.getCreated() != null ? info.getCreated() : ""
			);
		} catch (NotFoundException e) {
			return null;
		} catch (Exception e) {
			log.warn("Cannot inspect container {}: {}", name, e.getMessage());
			return null;
		}
	}

	// ── lifecycle operations ─────────────────────────────────────────────────────

	public void startContainer(String name) {
		try {
			docker.startContainerCmd(canonicalName(name)).exec();
			log.info("Started container {}", name);
		} catch (Exception e) {
			log.error("Failed to start container {}: {}", name, e.getMessage());
			throw new RuntimeException("Could not start container " + name + ": " + e.getMessage(), e);
		}
	}

	public void stopContainer(String name) {
		try {
			docker.stopContainerCmd(canonicalName(name)).withTimeout(10).exec();
			log.info("Stopped container {}", name);
		} catch (Exception e) {
			log.error("Failed to stop container {}: {}", name, e.getMessage());
			throw new RuntimeException("Could not stop container " + name + ": " + e.getMessage(), e);
		}
	}

	public void restartContainer(String name) {
		try {
			docker.restartContainerCmd(canonicalName(name)).withTimeout(10).exec();
			log.info("Restarted container {}", name);
		} catch (Exception e) {
			log.error("Failed to restart container {}: {}", name, e.getMessage());
			throw new RuntimeException("Could not restart container " + name + ": " + e.getMessage(), e);
		}
	}

	// ── log retrieval ────────────────────────────────────────────────────────────

	public ContainerLogsDto getContainerLogs(String name, int tail) {
		StringBuilder sb = new StringBuilder();
		try {
			docker.logContainerCmd(canonicalName(name))
					.withStdOut(true)
					.withStdErr(true)
					.withTail(tail)
					.withTimestamps(true)
					.exec(new LogContainerResultCallback() {
						@Override
						public void onNext(com.github.dockerjava.api.model.Frame item) {
							sb.append(new String(item.getPayload()));
						}
					})
					.awaitCompletion(15, TimeUnit.SECONDS);
		} catch (NotFoundException e) {
			return new ContainerLogsDto(name, "Container not found: " + canonicalName(name), 0);
		} catch (Exception e) {
			log.warn("Could not retrieve logs for {}: {}", name, e.getMessage());
			return new ContainerLogsDto(name, "Error retrieving logs: " + e.getMessage(), 0);
		}
		String logs = sb.toString();
		int lineCount = logs.isEmpty() ? 0 : logs.split("\n").length;
		return new ContainerLogsDto(name, logs, lineCount);
	}

	// ── helpers ──────────────────────────────────────────────────────────────────

	private ContainerInfoDto toDto(Container c) {
		String name = extractName(c);
		boolean running = "running".equalsIgnoreCase(c.getState());
		return new ContainerInfoDto(
				name,
				c.getId() != null ? c.getId().substring(0, 12) : "unknown",
				c.getImage(),
				c.getState(),
				c.getStatus(),
				running,
				String.valueOf(c.getCreated())
		);
	}

	private String extractName(Container c) {
		if (c.getNames() != null && c.getNames().length > 0) {
			return c.getNames()[0].replaceFirst("^/", "");
		}
		return c.getId().substring(0, 12);
	}

	/** Ensures the container name is prefixed with free5gc- for safety. */
	private String canonicalName(String name) {
		if (name.startsWith(FREE5GC_PREFIX)) return name;
		return FREE5GC_PREFIX + name.toLowerCase();
	}
}
