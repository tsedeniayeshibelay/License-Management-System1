package com.licensemanagement.backend.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import com.licensemanagement.backend.enums.LicenseType;

@Data
@Builder  
@NoArgsConstructor
@AllArgsConstructor
public class LicenseRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "User ID is required")
    private Long userId;

    private Long companyId;

    @NotNull(message = "License type is required")
    private LicenseType licenseType;

    @Min(value = 1, message = "Max activations must be at least 1")
    private Integer maxActivations;

    @Min(value = 1, message = "Total seats must be at least 1")
    private Integer totalSeats;

    @NotNull(message = "Expiry date is required")
    @Future(message = "Expiry date must be in the future")
    private LocalDate expiryDate;

    private String productName;
    private String customerName;
    private String customerEmail;
    private String adminEmail;
    private List<String> featureFlags;
    private boolean hardwareLocked;
    private List<String> allowedDomains;
    private Map<String, Object> customAttributes;
}