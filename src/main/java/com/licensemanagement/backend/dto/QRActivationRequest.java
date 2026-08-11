package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QRActivationRequest {
    @NotBlank(message = "QR Token is required")
    private String qrToken;
    
    @NotBlank(message = "Device name is required")
    private String deviceName;
    
    private String os;
    
    @NotBlank(message = "Machine ID is required")
    private String machineId;
}
