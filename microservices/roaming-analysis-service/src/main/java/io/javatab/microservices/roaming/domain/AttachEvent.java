package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A network attach/registration attempt from {@code attach_events.csv}. The {@code authFailureFlag}
 * and {@code rejectCause} feed rogue-UE / IMSI-catcher detection; {@code registrationDelayMs} feeds
 * registration-health KPIs.
 */
@Entity
@Table(name = "attach_events", indexes = {
		@Index(name = "idx_att_imsi", columnList = "subscriber_imsi"),
		@Index(name = "idx_att_visited", columnList = "visited_operator_id"),
		@Index(name = "idx_att_authfail", columnList = "auth_failure_flag")
})
public class AttachEvent {

	@Id
	@Column(name = "attach_id")
	private String attachId;
	@Column(name = "subscriber_imsi")
	private String subscriberImsi;
	@Column(name = "subscriber_msisdn")
	private String subscriberMsisdn;
	@Column(name = "home_operator_id")
	private String homeOperatorId;
	@Column(name = "visited_operator_id")
	private String visitedOperatorId;
	@Column(name = "cell_id")
	private String cellId;
	@Column(name = "attach_datetime")
	private Instant attachDatetime;
	@Column(name = "attach_status")
	private String attachStatus;
	@Column(name = "reject_cause")
	private String rejectCause;
	@Column(name = "auth_failure_flag")
	private boolean authFailureFlag;
	@Column(name = "registration_delay_ms")
	private Integer registrationDelayMs;

	protected AttachEvent() {
	}

	public AttachEvent(String attachId, String subscriberImsi, String subscriberMsisdn, String homeOperatorId,
					   String visitedOperatorId, String cellId, Instant attachDatetime, String attachStatus,
					   String rejectCause, boolean authFailureFlag, Integer registrationDelayMs) {
		this.attachId = attachId;
		this.subscriberImsi = subscriberImsi;
		this.subscriberMsisdn = subscriberMsisdn;
		this.homeOperatorId = homeOperatorId;
		this.visitedOperatorId = visitedOperatorId;
		this.cellId = cellId;
		this.attachDatetime = attachDatetime;
		this.attachStatus = attachStatus;
		this.rejectCause = rejectCause;
		this.authFailureFlag = authFailureFlag;
		this.registrationDelayMs = registrationDelayMs;
	}

	public String attachId() { return attachId; }
	public String subscriberImsi() { return subscriberImsi; }
	public String subscriberMsisdn() { return subscriberMsisdn; }
	public String homeOperatorId() { return homeOperatorId; }
	public String visitedOperatorId() { return visitedOperatorId; }
	public String cellId() { return cellId; }
	public Instant attachDatetime() { return attachDatetime; }
	public String attachStatus() { return attachStatus; }
	public String rejectCause() { return rejectCause; }
	public boolean authFailureFlag() { return authFailureFlag; }
	public Integer registrationDelayMs() { return registrationDelayMs; }
}
