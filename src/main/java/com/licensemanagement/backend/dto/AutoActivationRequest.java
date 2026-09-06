package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AutoActivationRequest {
    @NotBlank(message = "Product ID is required")
    private String productId;
    
    @NotBlank(message = "Device name is required")
    private String deviceName;
    
    private String os;
    
    @NotBlank(message = "Machine ID is required")
    private String machineId;

    private String installationId;
}
