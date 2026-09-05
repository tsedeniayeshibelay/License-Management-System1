package com.licensemanagement.backend.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ActivationRequest {
    @NotBlank(message = "License key is required")
    private String licenseKey;
    @NotBlank(message = "Device name is required")
    private String deviceName;
    private String os;
    @NotBlank(message = "Machine ID is required")
    private String machineId;
}