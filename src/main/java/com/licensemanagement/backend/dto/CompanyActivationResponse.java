package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyActivationResponse {
    private Long id;
    private Long licenseId;
    private String maskedLicenseKey;
    private Long productId;
    private String productName;
    private Long deviceId;
    private String deviceName;
    private String machineId;
    private String os;
    private String ipAddress;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private Boolean isActive;
    private String status; // "ACTIVE" or "DEACTIVATED"
    private LocalDateTime activatedAt;
    private LocalDateTime deactivatedAt;
    private LocalDateTime lastSeen;
    private LocalDate expiryDate;
    private String activationMethod;
}
