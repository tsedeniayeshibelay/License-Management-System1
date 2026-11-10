package com.licensemanagement.backend.fr567.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FR-05: Response returned to the client after processing an offline request.
 * Contains the signed payload, the sequence number, and a receipt nonce
 * the client must confirm back to the server.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineActivationResponse {

    /** Base64-encoded JSON payload (the license data) */
    private String payload;

    /** RSA-SHA256 signature over the payload */
    private String signature;

    /** FR-05: Sequence number for this license (monotonic) */
    private Long sequenceNumber;

    /** FR-05: One-time nonce — client must POST this back to /offline/receipt */
    private String receiptNonce;

    /** Format version */
    private String formatVersion;
}
