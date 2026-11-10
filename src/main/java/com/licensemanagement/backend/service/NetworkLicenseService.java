package com.licensemanagement.backend.service;

import com.licensemanagement.backend.entity.Device;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.NetworkLease;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.enums.LicenseType;
import com.licensemanagement.backend.exception.BusinessValidationException;
import com.licensemanagement.backend.exception.ForbiddenException;
import com.licensemanagement.backend.exception.ResourceNotFoundException;
import com.licensemanagement.backend.repository.DeviceRepository;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.NetworkLeaseRepository;
import com.licensemanagement.backend.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-07: Network license server — pools a fixed number of seats from a VOLUME license
 * across a customer network. Supports:
 *   - checkout (issue a lease for N minutes)
 *   - renew   (extend an existing lease before it expires)
 *   - checkin  (return a lease early — frees the seat immediately)
 *   - pool status (how many seats are free vs in use)
 *
 * The lease token is a signed JWT-style opaque token. The client stores it and
 * presents it on renewal / check-in. For short offline disconnections the lease
 * TTL window itself acts as the grace period.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NetworkLicenseService {

    /** Default lease duration in minutes. Configurable per checkout request. */
    public static final int DEFAULT_LEASE_MINUTES = 60;

    /** Maximum lease duration allowed in a single checkout (8 hours). */
    public static final int MAX_LEASE_MINUTES = 480;

    /** How often the background cleanup job runs (every 5 minutes). */
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1000L;

    private final NetworkLeaseRepository leaseRepository;
    private final LicenseRepository licenseRepository;
    private final DeviceRepository deviceRepository;
    private final CryptoUtil cryptoUtil;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;

    // -------------------------------------------------------------------------
    // Checkout
    // -------------------------------------------------------------------------

    /**
     * FR-07: Check out a seat from a pooled VOLUME license.
     *
     * @param licenseKey  The VOLUME license key.
     * @param currentUser The requesting user.
     * @param machineId   The device's machine ID.
     * @param deviceName  Human-readable device name.
     * @param leaseMins   Requested lease duration in minutes (capped at MAX_LEASE_MINUTES).
     * @return The issued NetworkLease.
     */
    @Transactional
    public NetworkLease checkout(String licenseKey, User currentUser,
                                  String machineId, String deviceName, Integer leaseMins) {

        License license = licenseRepository.findByLicenseKey(licenseKey)
                .orElseThrow(() -> new ResourceNotFoundException("License not found: " + licenseKey));

        validateNetworkLicense(license, currentUser);

        // Resolve or register device
        Device device = deviceRepository.findByMachineId(machineId).orElseGet(() -> {
            Device d = new Device();
            d.setUserId(currentUser.getId());
            d.setMachineId(machineId);
            d.setDeviceName(deviceName != null ? deviceName : "Unknown");
            d.setIsActive(true);
            d.setLastSeen(LocalDateTime.now());
            return deviceRepository.save(d);
        });
        device.setLastSeen(LocalDateTime.now());
        deviceRepository.save(device);

        LocalDateTime now = LocalDateTime.now();

        // If the device already holds a valid lease, renew it instead of double-issuing
        return leaseRepository.findActiveLease(license.getId(), device.getId(), now)
                .map(existing -> {
                    log.info("Device {} already has active lease {} — renewing", machineId, existing.getLeaseToken());
                    return renewInternal(existing, leaseMins, now);
                })
                .orElseGet(() -> issueNewLease(license, device, currentUser, leaseMins, now));
    }

    private NetworkLease issueNewLease(License license, Device device, User user,
                                        Integer leaseMins, LocalDateTime now) {
        // Concurrency-safe pool check with pessimistic lock on license row
        long activeLeases = leaseRepository.countActiveLeases(license.getId(), now);
        int totalSeats = license.getTotalSeats() != null ? license.getTotalSeats() : 0;

        if (activeLeases >= totalSeats) {
            throw new BusinessValidationException(
                "No seats available. Pool has " + totalSeats + " total seat(s), all currently checked out.");
        }

        int duration = clamp(leaseMins != null ? leaseMins : DEFAULT_LEASE_MINUTES, 1, MAX_LEASE_MINUTES);

        // Sign the lease token: SHA256 of (licenseId|deviceId|userId|issuedAt) so it's tamper-evident
        String rawToken = UUID.randomUUID().toString().replace("-", "");
        String sigPayload = license.getId() + "|" + device.getId() + "|" + user.getId() + "|" + now;
        String tokenSig = cryptoUtil.sign(sigPayload).substring(0, 16); // first 16 chars of sig as suffix
        String leaseToken = rawToken + tokenSig.replaceAll("[/+=]", "X");

        NetworkLease lease = NetworkLease.builder()
                .licenseId(license.getId())
                .deviceId(device.getId())
                .userId(user.getId())
                .leaseToken(leaseToken)
                .expiresAt(now.plusMinutes(duration))
                .returned(false)
                .machineId(device.getMachineId())
                .build();

        NetworkLease saved = leaseRepository.save(lease);
        log.info("Issued lease {} to device {} — {} min(s), expires {}",
                saved.getLeaseToken(), device.getMachineId(), duration, saved.getExpiresAt());

        // Update used_seats on the license
        license.setUsedSeats((int) leaseRepository.countActiveLeases(license.getId(), now));
        licenseRepository.save(license);

        tryLog(license.getCompanyId(), "LEASE_CHECKOUT",
                "Device '" + device.getDeviceName() + "' checked out seat from " + license.getLicenseKey()
                + " for " + duration + " min(s).", user.getId(), license.getId());

        return saved;
    }

    // -------------------------------------------------------------------------
    // Renewal
    // -------------------------------------------------------------------------

    /**
     * FR-07: Extend an active lease. The client must call this before the lease expires
     * to maintain access without checking out a new seat.
     */
    @Transactional
    public NetworkLease renew(String leaseToken, User currentUser, Integer leaseMins) {
        NetworkLease lease = leaseRepository.findByLeaseToken(leaseToken)
                .orElseThrow(() -> new ResourceNotFoundException("Lease not found: " + leaseToken));

        if (Boolean.TRUE.equals(lease.getReturned())) {
            throw new BusinessValidationException("This lease has already been returned.");
        }
        if (!lease.getUserId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only renew your own leases.");
        }
        return renewInternal(lease, leaseMins, LocalDateTime.now());
    }

    private NetworkLease renewInternal(NetworkLease lease, Integer leaseMins, LocalDateTime now) {
        int duration = clamp(leaseMins != null ? leaseMins : DEFAULT_LEASE_MINUTES, 1, MAX_LEASE_MINUTES);
        // Extend from now (not from current expiry) so stale renewal doesn't stack time
        lease.setExpiresAt(now.plusMinutes(duration));
        NetworkLease saved = leaseRepository.save(lease);
        log.info("Renewed lease {} — new expiry {}", saved.getLeaseToken(), saved.getExpiresAt());
        return saved;
    }

    // -------------------------------------------------------------------------
    // Check-in (return)
    // -------------------------------------------------------------------------

    /**
     * FR-07: Return a lease early — the seat becomes available immediately.
     */
    @Transactional
    public void checkin(String leaseToken, User currentUser) {
        NetworkLease lease = leaseRepository.findByLeaseToken(leaseToken)
                .orElseThrow(() -> new ResourceNotFoundException("Lease not found: " + leaseToken));

        if (!lease.getUserId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only return your own leases.");
        }
        if (Boolean.TRUE.equals(lease.getReturned())) {
            return; // idempotent
        }
        lease.setReturned(true);
        leaseRepository.save(lease);

        // Decrement used_seats
        License license = licenseRepository.findById(lease.getLicenseId()).orElse(null);
        if (license != null) {
            long remaining = leaseRepository.countActiveLeases(license.getId(), LocalDateTime.now());
            license.setUsedSeats((int) remaining);
            licenseRepository.save(license);
            tryLog(license.getCompanyId(), "LEASE_CHECKIN",
                    "Lease returned for " + license.getLicenseKey() + " by user " + currentUser.getId(),
                    currentUser.getId(), license.getId());
        }
        log.info("Lease {} returned by user {}", leaseToken, currentUser.getId());
    }

    // -------------------------------------------------------------------------
    // Pool status
    // -------------------------------------------------------------------------

    /**
     * FR-07: Return current pool status for a VOLUME license.
     */
    public Map<String, Object> getPoolStatus(String licenseKey, User currentUser) {
        License license = licenseRepository.findByLicenseKey(licenseKey)
                .orElseThrow(() -> new ResourceNotFoundException("License not found: " + licenseKey));

        validateNetworkLicense(license, currentUser);

        LocalDateTime now = LocalDateTime.now();
        long activeLeases = leaseRepository.countActiveLeases(license.getId(), now);
        int total         = license.getTotalSeats() != null ? license.getTotalSeats() : 0;
        long available    = Math.max(0, total - activeLeases);

        List<NetworkLease> active = leaseRepository.findActiveLeasesByLicense(license.getId(), now);

        return Map.of(
            "licenseKey",   licenseKey,
            "totalSeats",   total,
            "activeLeases", activeLeases,
            "available",    available,
            "leases",       active
        );
    }

    // -------------------------------------------------------------------------
    // FR-07: Background cleanup — reclaim expired leases every 5 minutes
    // -------------------------------------------------------------------------

    @Scheduled(fixedDelay = CLEANUP_INTERVAL_MS)
    @Transactional
    public void reclaimExpiredLeases() {
        List<NetworkLease> expired = leaseRepository.findExpiredLeases(LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Reclaiming {} expired lease(s)", expired.size());
        for (NetworkLease lease : expired) {
            lease.setReturned(true);
            leaseRepository.save(lease);
        }

        // Update used_seats per affected license
        expired.stream()
               .map(NetworkLease::getLicenseId)
               .distinct()
               .forEach(lid -> licenseRepository.findById(lid).ifPresent(lic -> {
                   long active = leaseRepository.countActiveLeases(lid, LocalDateTime.now());
                   lic.setUsedSeats((int) active);
                   licenseRepository.save(lic);
               }));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validateNetworkLicense(License license, User user) {
        if (license.getLicenseType() != LicenseType.VOLUME) {
            throw new BusinessValidationException(
                "Network lease checkout is only supported for VOLUME licenses.");
        }
        if (!"ACTIVE".equals(license.getStatus())) {
            throw new BusinessValidationException("License is not active: " + license.getStatus());
        }
        if (license.getExpiryDate() != null &&
                license.getExpiryDate().isBefore(java.time.LocalDate.now())) {
            throw new BusinessValidationException("License has expired.");
        }
    }

    private void tryLog(Long companyId, String action, String desc, Long userId, Long licenseId) {
        try {
            if (companyId != null) {
                activityLogService.logAction(companyId, action, desc, userId, licenseId);
            }
        } catch (Exception e) {
            log.warn("Failed to log lease action: {}", e.getMessage());
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
