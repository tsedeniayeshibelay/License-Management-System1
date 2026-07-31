package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LicenseResponse {
    private Long id;
    private String licenseKey;
    private String maskedLicenseKey;
    private String productName;
    private Long productId;
    private Map<String, Object> product;
    private Long companyId;
    private Long userId;
    private String customerName;
    private String customerEmail;
    private Map<String, Object> user;
    private com.licensemanagement.backend.enums.LicenseType licenseType;
    private LocalDate expiryDate;
    private String status;
    private Integer maxActivations;
    private Integer totalSeats;
    private Integer usedSeats;
    private LocalDate issuedDate;
}