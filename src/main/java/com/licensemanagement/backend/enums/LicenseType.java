package com.licensemanagement.backend.enums;

public enum LicenseType {
    PER_USER,
    PER_DEVICE,
    SUBSCRIPTION,
    VOLUME,
    OPEN_SOURCE,
    FEATURE_BASED,    // FR-04: gates specific named features
    USAGE_COUNTED     // FR-04: decrements a usage counter per activation
}
