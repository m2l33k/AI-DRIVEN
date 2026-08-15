package io.javatab.microservices.roaming.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Subscriber device from {@code devices.csv}. Reference/dimension data referenced by CDRs via
 * {@code device_id}; used for device-profile analytics (5G/VoLTE capability, model mix).
 */
@Entity
@Table(name = "devices")
public class Device {

	@Id
	@Column(name = "device_id")
	private String deviceId;
	@Column(name = "imei_tac")
	private String imeiTac;
	private String manufacturer;
	private String model;
	@Column(name = "os_name")
	private String osName;
	@Column(name = "os_version")
	private String osVersion;
	@Column(name = "lte_category")
	private String lteCategory;
	@Column(name = "volte_supported")
	private boolean volteSupported;
	@Column(name = "five_g_supported")
	private boolean fiveGSupported;

	protected Device() {
	}

	public Device(String deviceId, String imeiTac, String manufacturer, String model, String osName,
				  String osVersion, String lteCategory, boolean volteSupported, boolean fiveGSupported) {
		this.deviceId = deviceId;
		this.imeiTac = imeiTac;
		this.manufacturer = manufacturer;
		this.model = model;
		this.osName = osName;
		this.osVersion = osVersion;
		this.lteCategory = lteCategory;
		this.volteSupported = volteSupported;
		this.fiveGSupported = fiveGSupported;
	}

	public String deviceId() { return deviceId; }
	public String imeiTac() { return imeiTac; }
	public String manufacturer() { return manufacturer; }
	public String model() { return model; }
	public String osName() { return osName; }
	public String osVersion() { return osVersion; }
	public String lteCategory() { return lteCategory; }
	public boolean volteSupported() { return volteSupported; }
	public boolean fiveGSupported() { return fiveGSupported; }
}
