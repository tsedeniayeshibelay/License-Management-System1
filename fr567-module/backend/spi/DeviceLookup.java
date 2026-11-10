package com.licensemanagement.backend.fr567.spi;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * SPI: Your project must implement this interface so FR-07 can
 * find or register devices without being coupled to your Device entity.
 */
public interface DeviceLookup {

    /**
     * Find an existing device by machineId, or register a new one.
     * @param userId    The owning user's ID.
     * @param machineId The hardware fingerprint.
     * @param deviceName Human-readable name (may be null).
     * @return A DeviceInfo record.
     */
    DeviceInfo findOrCreate(Long userId, String machineId, String deviceName);

    /**
     * Update the last-seen timestamp.
     */
    void touchLastSeen(Long deviceId);

    /**
     * Immutable snapshot of the fields the module needs.
     */
    record DeviceInfo(
        Long id,
        Long userId,
        String machineId,
        String deviceName,
        boolean isActive
    ) {}
}
