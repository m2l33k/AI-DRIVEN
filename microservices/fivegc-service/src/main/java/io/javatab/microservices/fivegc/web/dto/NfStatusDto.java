package io.javatab.microservices.fivegc.web.dto;

public record NfStatusDto(
		String type,
		String instanceId,
		String description,
		String status,
		boolean up
) {}
