package io.javatab.microservices.fivegc.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Tenant creation request")
public class TenantRequest {

    @Schema(example = "test1", required = true, description = "Unique tenant name")
    public String tenantName;
}
