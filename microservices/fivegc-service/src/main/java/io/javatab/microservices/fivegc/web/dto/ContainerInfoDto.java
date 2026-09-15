package io.javatab.microservices.fivegc.web.dto;

public record ContainerInfoDto(
		String name,
		String containerId,
		String image,
		String state,
		String status,
		boolean running,
		String created
) {}
