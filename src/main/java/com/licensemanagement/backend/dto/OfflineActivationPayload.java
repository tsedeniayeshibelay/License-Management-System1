package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

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

    // FR-04: Feature-based licensing — comma-separated enabled feature keys
    private String featureFlags;

    // FR-04: Usage-counted licensing — remaining uses at time of issue
    private Integer remainingUses;

    // FR-05: Monotonically increasing sequence number — prevents replay / reapply
    private Long sequenceNumber;

    // FR-05: Receipt nonce — client echoes this back to server to close the loop
    private String receiptNonce;

    // FR-03: Container type: DEVICE_BOUND | NETWORK_SERVED | ONLINE
    private String containerType;
}
