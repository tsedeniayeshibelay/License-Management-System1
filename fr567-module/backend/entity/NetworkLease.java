package com.licensemanagement.backend.fr567.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * FR-07: A time-limited seat checkout from a pooled (VOLUME) license.
 * One lease = one seat held by one device for a fixed duration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "network_leases")
public class NetworkLease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "license_id", nullable = false)
    private Long licenseId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Unique opaque token the client presents on renewal / check-in. */
    @Column(name = "lease_token", unique = true, nullable = false, length = 64)
    private String leaseToken;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    /** When the lease expires. Must renew before this or the seat is reclaimed. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "returned")
    private Boolean returned = false;

    @Column(name = "machine_id")
    private String machineId;

    @PrePersist
    protected void onCreate() {
        issuedAt = LocalDateTime.now();
    }
}
