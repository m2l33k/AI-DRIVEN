package io.javatab.microservices.fivegc.web.dto;

public record ContainerLogsDto(
		String containerName,
		String logs,
		int lines
) {}
