package com.licensemanagement.backend.service;
import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.enums.LicenseType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
@Service
@RequiredArgsConstructor
public class ValidationService {
    private final LicenseRepository licenseRepository;
    public boolean isValidLicense(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license ->
                        "ACTIVE".equals(license.getStatus()) &&
                                !license.getExpiryDate().isBefore(LocalDate.now())
                )
                .orElse(false);
    }
    public String getLicenseStatus(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license -> {
                    if (!"ACTIVE".equals(license.getStatus())) {
                        return "INACTIVE";
                    }
                    if (license.getExpiryDate().isBefore(LocalDate.now())) {
                        return "EXPIRED";
                    }
                    return "VALID";
                })
                .orElse("NOT_FOUND");
    }
    public boolean isLicenseExpired(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license -> license.getExpiryDate().isBefore(LocalDate.now()))
                .orElse(true);
    }
    public boolean isLicenseActive(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license -> "ACTIVE".equals(license.getStatus()))
                .orElse(false);
    }
    public ValidationResult validateLicenseDetails(String licenseKey) {
        return licenseRepository.findByLicenseKey(licenseKey)
                .map(license -> {
                    ValidationResult result = new ValidationResult();
                    result.setLicenseKey(license.getLicenseKey());
                    result.setStatus(license.getStatus());
                    result.setExpiryDate(license.getExpiryDate());
                    result.setValid("ACTIVE".equals(license.getStatus()) &&
                            !license.getExpiryDate().isBefore(LocalDate.now()));
                    return result;
                })
                .orElse(null);
    }
    public void validateLicenseActive(License license) {
        if (!"ACTIVE".equals(license.getStatus()) && !"NOT_ACTIVATED".equals(license.getStatus())) {
            throw new BusinessValidationException("License is not active. Status: " + license.getStatus());
        }
        if (license.getLicenseType() == LicenseType.OPEN_SOURCE) {
            return;
        }
        if (license.getLicenseType() == LicenseType.SUBSCRIPTION && license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessValidationException("Subscription has expired on: " + license.getExpiryDate());
        } else if (license.getExpiryDate() != null && license.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessValidationException("License has expired on: " + license.getExpiryDate());
        }
    }
    public void validateDeviceLimit(License license, long activeDevices) {
        if (license.getLicenseType() == LicenseType.OPEN_SOURCE) {
            return;
        }
        if (license.getLicenseType() == LicenseType.PER_DEVICE && license.getMaxActivations() != 1) {
            throw new BusinessValidationException("PER_DEVICE license must have exactly 1 max activation.");
        }
        if (activeDevices >= license.getMaxActivations()) {
            throw new BusinessValidationException(
                    "Maximum device limit reached: " + license.getMaxActivations() +
                            ". Current active devices: " + activeDevices
            );
        }
    }
    public static class ValidationResult {
        private String licenseKey;
        private String status;
        private LocalDate expiryDate;
        private boolean valid;
        public String getLicenseKey() { return licenseKey; }
        public void setLicenseKey(String licenseKey) { this.licenseKey = licenseKey; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public LocalDate getExpiryDate() { return expiryDate; }
        public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
    }
}