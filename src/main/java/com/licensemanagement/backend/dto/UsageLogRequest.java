package com.licensemanagement.backend.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UsageLogRequest {
    @NotBlank(message = "License key is required")
    private String licenseKey;
    private String featuresUsed;
    private String ipAddress;
    private String activationMethod;
    private Integer durationMinutes;
}