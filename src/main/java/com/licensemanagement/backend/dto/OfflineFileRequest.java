package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OfflineFileRequest {
    @NotBlank(message = "Product ID is required")
    private String productId;
    
    @NotBlank(message = "Machine ID is required")
    private String machineId;
    
    private String os;
    private String deviceName;
    
    private String installationId;
    
    @NotBlank(message = "Request ID is required")
    private String requestId;
    
    private String secureNonce;
    
    @NotNull(message = "Request expiration is required")
    private Long requestExpiration;
    
    private String formatVersion;
}
