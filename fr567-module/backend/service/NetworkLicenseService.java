package com.licensemanagement.backend.fr567.service;

import com.licensemanagement.backend.fr567.entity.NetworkLease;
import com.licensemanagement.backend.fr567.repository.NetworkLeaseRepository;
import com.licensemanagement.backend.fr567.spi.DeviceLookup;
import com.licensemanagement.backend.fr567.spi.LicenseLookup;
import com.licensemanagement.backend.fr567.spi.LicenseLookup.LicenseInfo;
import com.licensemanagement.backend.fr567.spi.DeviceLookup.DeviceInfo;
import com.licensemanagement.backend.fr567.spi.SigningService;
import com.licensemanagement.backend.fr567.spi.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-07: Network license server — pools a fixed number of seats from a VOLUME
 * license across a customer network.
 *
 * Protocol:
 *   POST /checkout  — claim a seat for N minutes (get a lease token)
 *   POST /renew     — extend the lease before it expires
 *   POST /checkin   — return the seat early
 *   GET  /pool/{key}— view total / active / available seats
 *
 * A background job reclaims expired leases every 5 minutes automatically.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NetworkLicenseService {

    public static final int DEFAULT_LEASE_MINUTES = 60;
    public static final int MAX_LEASE_MINUTES = 480;
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1000L;

    private final NetworkLeaseRepository leaseRepository;
    private final LicenseLookup licenseLookup;
    private final DeviceLookup deviceLookup;
    private final UserContext userContext;
    private final SigningService signingService;

    // -------------------------------------------------------------------------
    // Checkout
    // -------------------------------------------------------------------------

    @Transactional
    public NetworkLease checkout(String licenseKey, String machineId,
                                  String deviceName, Integer leaseMins) {

        Long userId = userContext.getCurrentUserId();
        LicenseInfo license = licenseLookup.findByKey(licenseKey)
                .orElseThrow(() -> new IllegalArgumentException("License not found: " + licenseKey));

        validateNetworkLicense(license);

        DeviceInfo device = deviceLookup.findOrCreate(userId, machineId, deviceName);
        deviceLookup.touchLastSeen(device.id());

        LocalDateTime now = LocalDateTime.now();

        // If device already has an active lease, renew it
        return leaseRepository.findActiveLease(license.id(), device.id(), now)
                .map(existing -> renewInternal(existing, leaseMins, now))
                .orElseGet(() -> issueNewLease(license, device, userId, leaseMins, now));
    }

    private NetworkLease issueNewLease(LicenseInfo license, DeviceInfo device,
                                        Long userId, Integer leaseMins, LocalDateTime now) {

        long activeLeases = leaseRepository.countActiveLeases(license.id(), now);
        int totalSeats = license.totalSeats() != null ? license.totalSeats() : 0;

        if (activeLeases >= totalSeats) {
            throw new IllegalStateException(
                "No seats available. Pool has " + totalSeats + " total seat(s), all checked out.");
        }

        int duration = clamp(leaseMins != null ? leaseMins : DEFAULT_LEASE_MINUTES, 1, MAX_LEASE_MINUTES);

        // Build a tamper-evident lease token
        String rawToken = UUID.randomUUID().toString().replace("-", "");
        String sigPayload = license.id() + "|" + device.id() + "|" + userId + "|" + now;
        String tokenSig = signingService.sign(sigPayload).substring(0, 16);
        String leaseToken = rawToken + tokenSig.replaceAll("[/+=]", "X");

        NetworkLease lease = NetworkLease.builder()
                .licenseId(license.id())
                .deviceId(device.id())
                .userId(userId)
                .leaseToken(leaseToken)
                .expiresAt(now.plusMinutes(duration))
                .returned(false)
                .machineId(device.machineId())
                .build();

        NetworkLease saved = leaseRepository.save(lease);
        log.info("Issued lease {} to device {} — {} min(s), expires {}",
                saved.getLeaseToken(), device.machineId(), duration, saved.getExpiresAt());

        // Update pool count on the license
        long activeCount = leaseRepository.countActiveLeases(license.id(), now);
        licenseLookup.updateUsedSeats(license.id(), (int) activeCount);

        return saved;
    }

    // -------------------------------------------------------------------------
    // Renew
    // -------------------------------------------------------------------------

    @Transactional
    public NetworkLease renew(String leaseToken, Integer leaseMins) {
        Long userId = userContext.getCurrentUserId();
        NetworkLease lease = leaseRepository.findByLeaseToken(leaseToken)
                .orElseThrow(() -> new IllegalArgumentException("Lease not found: " + leaseToken));

        if (Boolean.TRUE.equals(lease.getReturned())) {
            throw new IllegalStateException("This lease has already been returned.");
        }
        if (!lease.getUserId().equals(userId)) {
            throw new SecurityException("You can only renew your own leases.");
        }
        return renewInternal(lease, leaseMins, LocalDateTime.now());
    }

    private NetworkLease renewInternal(NetworkLease lease, Integer leaseMins, LocalDateTime now) {
        int duration = clamp(leaseMins != null ? leaseMins : DEFAULT_LEASE_MINUTES, 1, MAX_LEASE_MINUTES);
        lease.setExpiresAt(now.plusMinutes(duration));
        NetworkLease saved = leaseRepository.save(lease);
        log.info("Renewed lease {} — new expiry {}", saved.getLeaseToken(), saved.getExpiresAt());
        return saved;
    }

    // -------------------------------------------------------------------------
    // Check-in (return)
    // -------------------------------------------------------------------------

    @Transactional
    public void checkin(String leaseToken) {
        Long userId = userContext.getCurrentUserId();
        NetworkLease lease = leaseRepository.findByLeaseToken(leaseToken)
                .orElseThrow(() -> new IllegalArgumentException("Lease not found: " + leaseToken));

        if (!lease.getUserId().equals(userId)) {
            throw new SecurityException("You can only return your own leases.");
        }
        if (Boolean.TRUE.equals(lease.getReturned())) {
            return; // idempotent
        }
        lease.setReturned(true);
        leaseRepository.save(lease);

        // Decrement pool count
        licenseLookup.findById(lease.getLicenseId()).ifPresent(lic -> {
            long remaining = leaseRepository.countActiveLeases(lic.id(), LocalDateTime.now());
            licenseLookup.updateUsedSeats(lic.id(), (int) remaining);
        });
        log.info("Lease {} returned by user {}", leaseToken, userId);
    }

    // -------------------------------------------------------------------------
    // Pool status
    // -------------------------------------------------------------------------

    public Map<String, Object> getPoolStatus(String licenseKey) {
        LicenseInfo license = licenseLookup.findByKey(licenseKey)
                .orElseThrow(() -> new IllegalArgumentException("License not found: " + licenseKey));

        validateNetworkLicense(license);

        LocalDateTime now = LocalDateTime.now();
        long activeLeases = leaseRepository.countActiveLeases(license.id(), now);
        int total = license.totalSeats() != null ? license.totalSeats() : 0;
        long available = Math.max(0, total - activeLeases);

        List<NetworkLease> active = leaseRepository.findActiveLeasesByLicense(license.id(), now);

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

        expired.stream()
               .map(NetworkLease::getLicenseId)
               .distinct()
               .forEach(lid -> licenseLookup.findById(lid).ifPresent(lic -> {
                   long active = leaseRepository.countActiveLeases(lid, LocalDateTime.now());
                   licenseLookup.updateUsedSeats(lid, (int) active);
               }));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validateNetworkLicense(LicenseInfo license) {
        if (!"VOLUME".equalsIgnoreCase(license.licenseType())) {
            throw new IllegalStateException(
                "Network lease checkout is only supported for VOLUME licenses.");
        }
        if (!"ACTIVE".equalsIgnoreCase(license.status())) {
            throw new IllegalStateException("License is not active: " + license.status());
        }
        if (license.expiryDate() != null && license.expiryDate().isBefore(LocalDate.now())) {
            throw new IllegalStateException("License has expired.");
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
