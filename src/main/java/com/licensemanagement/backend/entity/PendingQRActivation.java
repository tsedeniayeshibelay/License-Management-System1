package com.licensemanagement.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pending_qr_activations")
public class PendingQRActivation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, nullable = false)
    private String requestId;

    @Column(name = "public_approval_token_hash", unique = true, nullable = false)
    private String publicApprovalTokenHash;

    @Column(name = "app_polling_secret_hash", nullable = false)
    private String appPollingSecretHash;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "machine_id", nullable = false)
    private String machineId;

    @Column(name = "installation_id")
    private String installationId;

    @Column(name = "device_name")
    private String deviceName;

    private String os;

    @Column(nullable = false)
    private String status; // PENDING, APPROVED, EXPIRED, CONSUMED

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "license_id")
    private Long licenseId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "activation_id")
    private Long activationId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
