package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Radio cell topology from {@code network_cells.csv}. The {@code latitude}/{@code longitude} enable
 * impossible-travel detection across consecutive attaches for the same subscriber.
 */
@Entity
@Table(name = "network_cells")
public class NetworkCell {

	@Id
	@Column(name = "cell_id")
	private String cellId;
	@Column(name = "country_code")
	private String countryCode;
	private String city;
	@Column(name = "operator_id")
	private String operatorId;
	@Column(name = "tracking_area_code")
	private String trackingAreaCode;
	private double latitude;
	private double longitude;
	@Column(name = "cell_type")
	private String cellType;

	protected NetworkCell() {
	}

	public NetworkCell(String cellId, String countryCode, String city, String operatorId,
					   String trackingAreaCode, double latitude, double longitude, String cellType) {
		this.cellId = cellId;
		this.countryCode = countryCode;
		this.city = city;
		this.operatorId = operatorId;
		this.trackingAreaCode = trackingAreaCode;
		this.latitude = latitude;
		this.longitude = longitude;
		this.cellType = cellType;
	}

	public String cellId() { return cellId; }
	public String countryCode() { return countryCode; }
	public String city() { return city; }
	public String operatorId() { return operatorId; }
	public String trackingAreaCode() { return trackingAreaCode; }
	public double latitude() { return latitude; }
	public double longitude() { return longitude; }
	public String cellType() { return cellType; }
}
