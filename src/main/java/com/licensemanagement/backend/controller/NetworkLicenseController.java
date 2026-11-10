package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.entity.NetworkLease;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.service.NetworkLicenseService;
import com.licensemanagement.backend.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FR-07: REST API for the network license server.
 *
 * POST   /api/network-licenses/checkout   — check out a seat (get a lease)
 * POST   /api/network-licenses/renew      — renew an existing lease
 * POST   /api/network-licenses/checkin    — return a lease (free the seat)
 * GET    /api/network-licenses/pool/{key} — pool status for a VOLUME license
 */
@RestController
@RequestMapping("/api/network-licenses")
@RequiredArgsConstructor
public class NetworkLicenseController {

    private final NetworkLicenseService networkLicenseService;
    private final CurrentUserProvider   currentUserProvider;

    // -------------------------------------------------------------------------
    // Checkout
    // -------------------------------------------------------------------------

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'EMPLOYEE')")
    public ResponseEntity<NetworkLease> checkout(@RequestBody Map<String, Object> body) {
        User user       = currentUserProvider.getCurrentUser();
        String key      = (String) body.get("licenseKey");
        String machineId  = (String) body.get("machineId");
        String deviceName = (String) body.get("deviceName");
        Integer mins    = body.containsKey("leaseMins")
                ? Integer.parseInt(String.valueOf(body.get("leaseMins")))
                : null;

        if (key == null || key.isBlank() || machineId == null || machineId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        NetworkLease lease = networkLicenseService.checkout(key, user, machineId, deviceName, mins);
        return ResponseEntity.status(HttpStatus.CREATED).body(lease);
    }

    // -------------------------------------------------------------------------
    // Renew
    // -------------------------------------------------------------------------

    @PostMapping("/renew")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'EMPLOYEE')")
    public ResponseEntity<NetworkLease> renew(@RequestBody Map<String, Object> body) {
        User user        = currentUserProvider.getCurrentUser();
        String leaseToken = (String) body.get("leaseToken");
        Integer mins     = body.containsKey("leaseMins")
                ? Integer.parseInt(String.valueOf(body.get("leaseMins")))
                : null;

        if (leaseToken == null || leaseToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(networkLicenseService.renew(leaseToken, user, mins));
    }

    // -------------------------------------------------------------------------
    // Check-in (return)
    // -------------------------------------------------------------------------

    @PostMapping("/checkin")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'EMPLOYEE')")
    public ResponseEntity<Map<String, String>> checkin(@RequestBody Map<String, String> body) {
        User user        = currentUserProvider.getCurrentUser();
        String leaseToken = body.get("leaseToken");

        if (leaseToken == null || leaseToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        networkLicenseService.checkin(leaseToken, user);
        return ResponseEntity.ok(Map.of("message", "Lease returned. Seat is now available."));
    }

    // -------------------------------------------------------------------------
    // Pool status
    // -------------------------------------------------------------------------

    @GetMapping("/pool/{licenseKey}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BULK_BUYER', 'EMPLOYEE', 'COMPANY', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getPoolStatus(@PathVariable String licenseKey) {
        User user = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(networkLicenseService.getPoolStatus(licenseKey, user));
    }
}
