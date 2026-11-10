package com.licensemanagement.backend.controller;

import com.licensemanagement.backend.util.KeyHierarchyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FR-10: Admin REST API for the cryptographic key hierarchy.
 *
 * All endpoints require ADMIN role.
 *
 * POST /api/admin/key-hierarchy/init           — bootstrap root key, get Shamir shares
 * POST /api/admin/key-hierarchy/unlock         — reconstruct root key from K shares
 * GET  /api/admin/key-hierarchy/status         — whether hierarchy is unlocked
 * POST /api/admin/key-hierarchy/product-key    — generate per-product signing key
 * POST /api/admin/key-hierarchy/load-product-key — load a previously sealed product key
 */
@RestController
@RequestMapping("/api/admin/key-hierarchy")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class KeyHierarchyController {

    private final KeyHierarchyService keyHierarchyService;

    // -------------------------------------------------------------------------
    // Bootstrap
    // -------------------------------------------------------------------------

    @PostMapping("/init")
    public ResponseEntity<Map<String, Object>> init(@RequestBody Map<String, String> body) {
        String masterPassword = body.get("masterPassword");
        if (masterPassword == null || masterPassword.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "masterPassword is required"));
        }
        Map<String, Object> result = keyHierarchyService.initRootKey(masterPassword);
        return ResponseEntity.ok(result);
    }

    // -------------------------------------------------------------------------
    // Unlock
    // -------------------------------------------------------------------------

    @PostMapping("/unlock")
    public ResponseEntity<Map<String, Object>> unlock(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> shares = (List<String>) body.get("shares");
        if (shares == null || shares.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "shares list is required"));
        }
        boolean ok = keyHierarchyService.unlock(shares);
        return ResponseEntity.ok(Map.of(
            "unlocked", ok,
            "message",  ok ? "Key hierarchy unlocked. Product and audit signing keys are now active."
                           : "Unlock failed. Verify shares and try again."
        ));
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
            "unlocked",    keyHierarchyService.isUnlocked(),
            "auditKeyLoaded",  keyHierarchyService.getAuditKeyPair() != null
        ));
    }

    // -------------------------------------------------------------------------
    // Per-product key management
    // -------------------------------------------------------------------------

    @PostMapping("/product-key")
    public ResponseEntity<Map<String, String>> generateProductKey(@RequestBody Map<String, String> body) {
        String productId = body.get("productId");
        if (productId == null || productId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "productId is required"));
        }
        return ResponseEntity.ok(keyHierarchyService.generateProductKey(productId));
    }

    @PostMapping("/load-product-key")
    public ResponseEntity<Map<String, String>> loadProductKey(@RequestBody Map<String, String> body) {
        String productId      = body.get("productId");
        String encPrivKeyB64  = body.get("encryptedPrivKey");
        String pubKeyB64      = body.get("publicKey");

        if (productId == null || encPrivKeyB64 == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "productId and encryptedPrivKey are required"));
        }
        keyHierarchyService.loadProductKey(productId, encPrivKeyB64, pubKeyB64);
        return ResponseEntity.ok(Map.of(
            "message", "Product key for '" + productId + "' loaded successfully."
        ));
    }

    // -------------------------------------------------------------------------
    // Shamir utility — split a provided secret (for testing / re-splitting)
    // -------------------------------------------------------------------------

    @PostMapping("/shamir/split")
    public ResponseEntity<Map<String, Object>> shamirSplit(@RequestBody Map<String, String> body) {
        String hexSecret = body.get("hexSecret");
        if (hexSecret == null || hexSecret.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "hexSecret is required"));
        }
        byte[] secret = hexToBytes(hexSecret);
        List<String> shares = keyHierarchyService.shamirSplit(secret, 3, 5);
        return ResponseEntity.ok(Map.of("shares", shares, "k", 3, "n", 5));
    }

    @PostMapping("/shamir/reconstruct")
    public ResponseEntity<Map<String, Object>> shamirReconstruct(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> shares = (List<String>) body.get("shares");
        if (shares == null || shares.size() < 3) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "At least 3 shares required"));
        }
        byte[] reconstructed = keyHierarchyService.shamirReconstruct(shares);
        return ResponseEntity.ok(Map.of("hexSecret", bytesToHex(reconstructed)));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
