package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignLicenseRequest {
    @NotNull(message = "License ID is required")
    private Long licenseId;

    private Long employeeId;

    private Long deviceId;

    private String assignmentType;
}
