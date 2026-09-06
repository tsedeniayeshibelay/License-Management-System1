package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QRRequestDto {
    @NotBlank(message = "Product ID is required")
    private String productId;
    
    @NotBlank(message = "Machine ID is required")
    private String machineId;
    
    private String installationId;
    private String deviceName;
    private String os;
}
