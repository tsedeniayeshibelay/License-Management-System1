package com.licensemanagement.backend.fr567.controller;

import com.licensemanagement.backend.fr567.entity.NetworkLease;
import com.licensemanagement.backend.fr567.service.NetworkLicenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FR-07: REST API for the network license server.
 *
 * POST   /api/fr567/network-licenses/checkout     — check out a seat
 * POST   /api/fr567/network-licenses/renew        — renew a lease
 * POST   /api/fr567/network-licenses/checkin       — return a lease
 * GET    /api/fr567/network-licenses/pool/{key}    — pool status
 *
 * Add @PreAuthorize annotations to match your project's security setup.
 */
@RestController
@RequestMapping("/api/fr567/network-licenses")
@RequiredArgsConstructor
public class NetworkLicenseController {

    private final NetworkLicenseService networkLicenseService;

    @PostMapping("/checkout")
    public ResponseEntity<NetworkLease> checkout(@RequestBody Map<String, Object> body) {
        String licenseKey  = (String) body.get("licenseKey");
        String machineId   = (String) body.get("machineId");
        String deviceName  = (String) body.get("deviceName");
        Integer leaseMins  = body.containsKey("leaseMins")
                ? Integer.parseInt(String.valueOf(body.get("leaseMins")))
                : null;

        if (licenseKey == null || licenseKey.isBlank() || machineId == null || machineId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        NetworkLease lease = networkLicenseService.checkout(licenseKey, machineId, deviceName, leaseMins);
        return ResponseEntity.status(HttpStatus.CREATED).body(lease);
    }

    @PostMapping("/renew")
    public ResponseEntity<NetworkLease> renew(@RequestBody Map<String, Object> body) {
        String leaseToken = (String) body.get("leaseToken");
        Integer leaseMins = body.containsKey("leaseMins")
                ? Integer.parseInt(String.valueOf(body.get("leaseMins")))
                : null;

        if (leaseToken == null || leaseToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(networkLicenseService.renew(leaseToken, leaseMins));
    }

    @PostMapping("/checkin")
    public ResponseEntity<Map<String, String>> checkin(@RequestBody Map<String, String> body) {
        String leaseToken = body.get("leaseToken");

        if (leaseToken == null || leaseToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        networkLicenseService.checkin(leaseToken);
        return ResponseEntity.ok(Map.of("message", "Lease returned. Seat is now available."));
    }

    @GetMapping("/pool/{licenseKey}")
    public ResponseEntity<Map<String, Object>> getPoolStatus(@PathVariable String licenseKey) {
        return ResponseEntity.ok(networkLicenseService.getPoolStatus(licenseKey));
    }
}
