package com.licensemanagement.backend.fr567.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * FR-05: Records every offline activation request so the same file
 * cannot be replayed, and tracks the sequence number + receipt nonce
 * for the closed-loop exchange.
 */
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

    /** SHA-256 of the raw request file content — prevents exact-file replay. */
    @Column(name = "request_digest", unique = true, nullable = false)
    private String requestDigest;

    /** Monotonically increasing per license — prevents out-of-order replay. */
    @Column(name = "sequence_number")
    private Long sequenceNumber;

    @Column(name = "license_key")
    private String licenseKey;

    /** Nonce sent to the client in the response; client must echo it back. */
    @Column(name = "receipt_nonce", unique = true)
    private String receiptNonce;

    /** Whether the client has returned a valid receipt. */
    @Column(name = "receipt_confirmed")
    private Boolean receiptConfirmed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
