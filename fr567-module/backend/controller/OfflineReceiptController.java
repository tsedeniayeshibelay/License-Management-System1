package com.licensemanagement.backend.fr567.controller;

import com.licensemanagement.backend.fr567.dto.OfflineActivationResponse;
import com.licensemanagement.backend.fr567.service.OfflineSequenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FR-05: REST API for the offline receipt confirmation (closes the loop).
 *
 * POST /api/fr567/offline/receipt
 *   Body: { "receiptNonce": "..." }
 *   Response: { "confirmed": true/false }
 *
 * The client must call this after successfully importing a license file
 * that contains a receiptNonce, so the server knows the exchange completed.
 */
@RestController
@RequestMapping("/api/fr567/offline")
@RequiredArgsConstructor
public class OfflineReceiptController {

    private final OfflineSequenceService offlineSequenceService;

    @PostMapping("/receipt")
    public ResponseEntity<Map<String, Object>> confirmReceipt(@RequestBody Map<String, String> body) {
        String receiptNonce = body.get("receiptNonce");
        if (receiptNonce == null || receiptNonce.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "receiptNonce is required"));
        }
        boolean confirmed = offlineSequenceService.confirmReceipt(receiptNonce);
        return ResponseEntity.ok(Map.of(
            "confirmed", confirmed,
            "message",  confirmed
                ? "Receipt acknowledged. Offline activation loop closed."
                : "Receipt nonce not found or already confirmed."
        ));
    }

    /**
     * Utility endpoint: verify a sequence number is the expected next one.
     */
    @GetMapping("/sequence/verify")
    public ResponseEntity<Map<String, Object>> verifySequence(
            @RequestParam String licenseKey,
            @RequestParam long claimedSeq) {
        boolean valid = offlineSequenceService.isSequenceValid(licenseKey, claimedSeq);
        return ResponseEntity.ok(Map.of(
            "valid",    valid,
            "claimed",  claimedSeq,
            "message",  valid
                ? "Sequence number is the expected next value."
                : "Sequence number is stale, skipped, or invalid."
        ));
    }
}
