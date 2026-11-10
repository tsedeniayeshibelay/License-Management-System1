package com.licensemanagement.backend.fr567.service;

import com.licensemanagement.backend.fr567.dto.OfflineActivationResponse;
import com.licensemanagement.backend.fr567.entity.OfflineRequestLog;
import com.licensemanagement.backend.fr567.repository.OfflineRequestLogRepository;
import com.licensemanagement.backend.fr567.spi.SigningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

/**
 * FR-05: Offline activation with closed-loop exchange.
 *
 * Three-message protocol:
 *   1. Client → Server:  signed request file (contains requestId, machineId, expiry)
 *   2. Server → Client:  signed response with sequenceNumber + receiptNonce
 *   3. Client → Server:  receipt confirmation (echoes receiptNonce back)
 *
 * Sequence numbers are monotonically increasing per license, so an old
 * update file cannot be replayed or reapplied out of order.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OfflineSequenceService {

    private final OfflineRequestLogRepository requestLogRepository;
    private final SigningService signingService;

    /**
     * Check if a request file has already been processed (anti-replay by content hash).
     * @param rawFileContent  The exact bytes of the uploaded request file.
     * @return true if already processed.
     */
    public boolean isAlreadyProcessed(String rawFileContent) {
        String digest = sha256(rawFileContent);
        return requestLogRepository.existsByRequestDigest(digest);
    }

    /**
     * Build the signed response for an offline activation, assigning a
     * sequence number and receipt nonce.
     *
     * @param payloadJson   The JSON payload to sign (built by the caller).
     * @param licenseKey    The license this activation belongs to.
     * @param rawRequestDigest  SHA-256 of the original request file (for replay log).
     * @return The response containing signed payload, sequence number, and receipt nonce.
     */
    @Transactional
    public OfflineActivationResponse buildSignedResponse(String payloadJson,
                                                          String licenseKey,
                                                          String rawRequestDigest) {

        // 1. Assign next sequence number
        Long currentMax = requestLogRepository.findMaxSequenceNumberByLicenseKey(licenseKey);
        long nextSeq = (currentMax == null ? 0L : currentMax) + 1L;

        // 2. Generate receipt nonce
        String receiptNonce = UUID.randomUUID().toString().replace("-", "");

        // 3. Sign the payload
        String signature = signingService.sign(payloadJson);
        String b64Payload = Base64.getEncoder().encodeToString(
                payloadJson.getBytes(StandardCharsets.UTF_8));

        // 4. Persist the log entry (replay prevention + sequence tracking)
        OfflineRequestLog logEntry = OfflineRequestLog.builder()
                .requestDigest(rawRequestDigest)
                .sequenceNumber(nextSeq)
                .licenseKey(licenseKey)
                .receiptNonce(receiptNonce)
                .receiptConfirmed(false)
                .build();
        requestLogRepository.save(logEntry);

        log.info("FR-05: Issued offline response seq={} nonce={} for license={}", nextSeq, receiptNonce, licenseKey);

        return OfflineActivationResponse.builder()
                .payload(b64Payload)
                .signature(signature)
                .sequenceNumber(nextSeq)
                .receiptNonce(receiptNonce)
                .formatVersion("2")
                .build();
    }

    /**
     * FR-05: Confirm receipt — closes the loop. Client posts the nonce back.
     * @return true if the nonce was found and confirmed (or already confirmed).
     */
    @Transactional
    public boolean confirmReceipt(String receiptNonce) {
        return requestLogRepository.findByReceiptNonce(receiptNonce)
                .map(entry -> {
                    if (Boolean.TRUE.equals(entry.getReceiptConfirmed())) {
                        return true; // idempotent
                    }
                    entry.setReceiptConfirmed(true);
                    requestLogRepository.save(entry);
                    log.info("FR-05: Receipt confirmed for nonce={}", receiptNonce);
                    return true;
                })
                .orElse(false);
    }

    /**
     * Verify a sequence number is valid (not stale, not skipped).
     * @param licenseKey  The license key.
     * @param claimedSeq  The sequence number the client claims to have.
     * @return true if claimedSeq == lastIssued + 1 (the expected next number).
     */
    public boolean isSequenceValid(String licenseKey, long claimedSeq) {
        Long currentMax = requestLogRepository.findMaxSequenceNumberByLicenseKey(licenseKey);
        long expected = (currentMax == null ? 0L : currentMax) + 1L;
        return claimedSeq == expected;
    }

    /** SHA-256 hex digest of a string. */
    public static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }
}
