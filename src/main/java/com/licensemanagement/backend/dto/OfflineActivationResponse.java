package com.licensemanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineActivationResponse {
    // Legacy v1 fields — kept for backward compatibility
    private String payload;
    private String signature;

    // FR-03: v2 encrypted container — the full JSON produced by CryptoUtil.encryptContainer()
    // When present, the client MUST use this and ignore payload/signature
    private String encryptedContainer;

    // FR-03: Container type indicator: DEVICE_BOUND | ONLINE | NETWORK_SERVED
    private String containerType;

    // Format version: "1" = legacy signed-only, "2" = encrypted+signed
    private String formatVersion;
}
