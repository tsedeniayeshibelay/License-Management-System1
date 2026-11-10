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

    // FR-02: Additional hardware fingerprint attributes
    private String macAddress;
    private String cpuId;
    private String motherboardId;
    private String installationId;   // persistent UUID per install (clone detection)

    // FR-11: VM hint reported by client (e.g. hypervisor brand string)
    private String vmHint;
    private Boolean isVm;
}
