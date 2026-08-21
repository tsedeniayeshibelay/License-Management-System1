package com.licensemanagement.backend.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationRequest {
    @NotBlank(message = "License key is required")
    private String licenseKey;
    
    @NotBlank(message = "Device fingerprint is required")
    private String deviceFingerprint;
    
    private String userEmail;
    private long timestamp;
    private String signature;
}