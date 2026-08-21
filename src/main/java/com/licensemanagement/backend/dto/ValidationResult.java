package com.licensemanagement.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationResult {
    private boolean valid;
    private String errorCode;
    private String message;
    private String warning;
    private List<String> features;
    private LocalDate expiryDate;
    private int remainingSeats;
    private com.licensemanagement.backend.enums.LicenseType licenseType;
    private boolean hardwareLocked;
}