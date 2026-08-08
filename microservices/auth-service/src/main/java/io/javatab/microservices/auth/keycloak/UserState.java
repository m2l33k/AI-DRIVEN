package io.javatab.microservices.auth.keycloak;

import java.util.List;

/** Snapshot of a Keycloak account's verification/required-action state, used by the login flow. */
public record UserState(boolean emailVerified, List<String> requiredActions) {
}
