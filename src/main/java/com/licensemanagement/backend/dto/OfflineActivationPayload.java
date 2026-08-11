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
}