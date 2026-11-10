package com.licensemanagement.backend.service;

import com.licensemanagement.backend.exception.*;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.enums.LicenseType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

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
                    if (!"ACTIVE".equals(license.getStatus())) return "INACTIVE";
                    if (license.getExpiryDate().isBefore(LocalDate.now())) return "EXPIRED";
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

    /**
     * FR-04: Validate that a specific feature is enabled on this license.
     * featureFlags is stored as comma-separated keys, e.g. "EXPORT,API,ANALYTICS"
     */
    public void validateFeatureAccess(License license, String requiredFeature) {
        if (license.getLicenseType() != LicenseType.FEATURE_BASED) return;
        String flags = license.getFeatureFlags();
        if (flags == null || flags.isBlank()) {
            throw new BusinessValidationException("This license has no features enabled.");
        }
        List<String> enabled = Arrays.asList(flags.split(","));
        boolean hasFeature = enabled.stream().anyMatch(f -> f.trim().equalsIgnoreCase(requiredFeature));
        if (!hasFeature) {
            throw new BusinessValidationException(
                "Feature '" + requiredFeature + "' is not included in this license. " +
                "Enabled features: " + flags
            );
        }
    }

    /**
     * FR-04: Decrement usage count for USAGE_COUNTED licenses.
     * Returns the remaining uses after decrement.
     */
    public int decrementUsageCount(License license) {
        if (license.getLicenseType() != LicenseType.USAGE_COUNTED) {
            throw new BusinessValidationException("This operation is only valid for USAGE_COUNTED licenses.");
        }
        int limit = license.getUsageLimit() != null ? license.getUsageLimit() : 0;
        int used  = license.getUsageCount()  != null ? license.getUsageCount()  : 0;
        if (used >= limit) {
            throw new BusinessValidationException(
                "Usage limit exhausted: " + limit + " uses allowed, " + used + " used."
            );
        }
        int remaining = limit - used - 1;
        license.setUsageCount(used + 1);
        return remaining;
    }

    /**
     * FR-11: Block activation if device has been flagged as a clone.
     */
    public void validateNotClone(Device device) {
        if (Boolean.TRUE.equals(device.getCloneDetected())) {
            throw new BusinessValidationException(
                "This device has been identified as a cloned installation and cannot activate licenses. " +
                "Please contact support."
            );
        }
    }

    public static class ValidationResult {
        private String licenseKey;
        private String status;
        private LocalDate expiryDate;
        private boolean valid;
        public String getLicenseKey()              { return licenseKey; }
        public void setLicenseKey(String v)        { licenseKey = v; }
        public String getStatus()                  { return status; }
        public void setStatus(String v)            { status = v; }
        public LocalDate getExpiryDate()           { return expiryDate; }
        public void setExpiryDate(LocalDate v)     { expiryDate = v; }
        public boolean isValid()                   { return valid; }
        public void setValid(boolean v)            { valid = v; }
    }
}
