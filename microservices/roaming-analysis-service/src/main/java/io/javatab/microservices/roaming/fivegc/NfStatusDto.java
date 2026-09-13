package io.javatab.microservices.roaming.fivegc;

public record NfStatusDto(String type, String instanceId, String description, String status, boolean up) {}
