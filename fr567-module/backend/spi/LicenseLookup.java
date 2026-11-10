package com.licensemanagement.backend.fr567.spi;

import java.time.LocalDate;
import java.util.Optional;

/**
 * SPI: Your project must implement this interface so FR-05 and FR-07 can
 * look up licenses without being coupled to your License entity.
 *
 * Register a @Component that implements this interface and the module
 * will inject it automatically.
 */
public interface LicenseLookup {

    /**
     * Find a license by its key.
     * @return A LicenseInfo record, or empty if not found.
     */
    Optional<LicenseInfo> findByKey(String licenseKey);

    /**
     * Find a license by its database ID.
     */
    Optional<LicenseInfo> findById(Long id);

    /**
     * Update the used-seat count on the license (FR-07 pool tracking).
     */
    void updateUsedSeats(Long licenseId, int usedSeats);

    /**
     * Immutable snapshot of the fields the module needs.
     */
    record LicenseInfo(
        Long id,
        String licenseKey,
        Long companyId,
        String status,               // "ACTIVE", "REVOKED", etc.
        String licenseType,          // "VOLUME", "SUBSCRIPTION", etc.
        LocalDate expiryDate,
        Integer totalSeats,
        Integer usedSeats,
        Integer maxActivations
    ) {}
}
