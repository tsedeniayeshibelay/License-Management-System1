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
@Table(name = "offline_request_logs")
public class OfflineRequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_digest", unique = true, nullable = false)
    private String requestDigest;

    // FR-05: Monotonically increasing sequence number scoped per license
    @Column(name = "sequence_number")
    private Long sequenceNumber;

    @Column(name = "license_key")
    private String licenseKey;

    // FR-05: Nonce sent to client in the response; client must return it in the receipt
    @Column(name = "receipt_nonce", unique = true)
    private String receiptNonce;

    // FR-05: Whether the client has returned a valid receipt
    @Column(name = "receipt_confirmed")
    private Boolean receiptConfirmed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
