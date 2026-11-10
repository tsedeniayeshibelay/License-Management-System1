package com.licensemanagement.backend.fr567.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

/**
 * FR-05: The signed payload inside a license container.
 * Sequence number and receipt nonce make the offline exchange
 * replay-proof and closeable.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineActivationPayload implements Serializable {
    private String licenseKey;
    private String deviceFingerprint;
    private String installationId;
    private String requestId;
    private String formatVersion;
    private String keyId;
    private String activationStatus;
    private Long activationId;
    private String expiryDate;
    private String productId;
    private String companyId;
    private String licenseType;
    private Long issuedAt;

    /** FR-05: Monotonically increasing per license — prevents replay/reapply */
    private Long sequenceNumber;

    /** FR-05: Client echoes this back to confirm receipt (closes the loop) */
    private String receiptNonce;

    /** FR-07: Container type: DEVICE_BOUND | NETWORK_SERVED | ONLINE */
    private String containerType;
}
