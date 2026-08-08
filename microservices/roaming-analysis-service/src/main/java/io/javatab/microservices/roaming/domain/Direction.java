package io.javatab.microservices.roaming.domain;

/** Direction of a roaming relationship, from this network's perspective. */
public enum Direction {
	/** A visiting subscriber from a partner PLMN roams onto our network. */
	INBOUND,
	/** One of our subscribers roams onto a partner PLMN. */
	OUTBOUND
}
